const colorName = require('color-name');
const chroma = require('chroma-js');

import {
    throwError,
    throwErrorWithContext,
    ErrorCode,
    SyntaxError,
} from './errors';
import { terminal } from './terminal';
import { getSuggestion } from './utils';

// @todo: convert frequency and time (1/s -> Hz)
// @todo: have a base-font-size property in the tokenfile as well (under global: )

export type ValueType =
    | 'string'
    | 'number'
    | 'percentage'
    | 'angle'
    | 'color'
    | 'length'
    | 'time'
    | 'frequency'
    | 'array';

export interface ValueParserOptions {
    /**
     * Those are relative units that can't be evaluated statically, as they
     * depend on the rendering environment (the size of the base font of the
     * document, the metrics of the current font, the dimension of the view port.
     * However, it is possible to provide values for those to valueParser,
     * in which case they will get evaluated.
     */
    baseUnits?: {
        rem?: number;
        em?: number;
        ex?: number;
        ch?: number;
        vh?: number;
        vw?: number;
    };
    /** When an alias (identifier in {}) is encountered, this function
     * is called to resolve it.
     * Return either the resolved value, or a string which is a suggestion
     * for the best matching identifier.
     */
    aliasResolver?: (identifier: string) => Value | string;
}

type LengthUnit =
    | 'px'
    | 'cm'
    | 'mm'
    | 'Q'
    | 'in'
    | 'pc'
    | 'pt'
    | 'rem'
    | 'em'
    | 'ex'
    | 'ch'
    | 'vw'
    | 'vh'
    | 'vmin'
    | 'vmax'
    | 'multi';

type AngleUnit = 'deg' | 'grad' | 'rad' | 'degree' | 'turn';

type TimeUnit = 's' | 'ms';

type FrequencyUnit = 'hz' | 'khz';

function clampByte(v: number): number {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return Math.round(v);
}

function hueToRgbChannel(t1: number, t2: number, hue: number): number {
    if (hue < 0) hue += 6;
    if (hue >= 6) hue -= 6;

    if (hue < 1) return (t2 - t1) * hue + t1;
    else if (hue < 3) return t2;
    else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
    else return t1;
}

function hslToRgb(
    hue: number,
    sat: number,
    light: number
): { r: number; g: number; b: number } {
    hue = ((hue + 360) % 360) / 60.0;
    light = Math.max(0, Math.min(light, 1.0));
    sat = Math.max(0, Math.min(sat, 1.0));
    const t2 = light <= 0.5 ? light * (sat + 1) : light + sat - light * sat;
    const t1 = light * 2 - t2;
    return {
        r: Math.round(255 * hueToRgbChannel(t1, t2, hue + 2)),
        g: Math.round(255 * hueToRgbChannel(t1, t2, hue)),
        b: Math.round(255 * hueToRgbChannel(t1, t2, hue - 2)),
    };
}

function rgbToHsl(
    r: number,
    g: number,
    b: number
): { h: number; s: number; l: number } {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);

    const delta = max - min;
    let h: number;
    let s: number;

    if (max === min) {
        h = 0;
    } else if (r === max) {
        h = (g - b) / delta;
    } else if (g === max) {
        h = 2 + (b - r) / delta;
    } else if (b === max) {
        h = 4 + (r - g) / delta;
    }

    h = Math.min(h * 60, 360);

    if (h < 0) {
        h += 360;
    }

    const l = (min + max) / 2;

    if (max === min) {
        s = 0;
    } else if (l <= 0.5) {
        s = delta / (max + min);
    } else {
        s = delta / (2 - max - min);
    }

    return { h: h, s: s, l: l };
}

function labToRgb(
    L: number,
    aStar: number,
    bStar: number
): { r: number; g: number; b: number } {
    let y = (100 * L + 16) / 116;
    let x = aStar / 500 + y;
    let z = y - bStar / 200;

    x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.0 * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787);

    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.204 + z * 1.057;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return {
        r: clampByte(r * 255),
        g: clampByte(g * 255),
        b: clampByte(b * 255),
    };
}

function rgbToLab(
    r: number,
    g: number,
    b: number
): { L: number; a: number; b: number } {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    return { L: (116 * y - 16) / 100, a: 500 * (x - y), b: 200 * (y - z) };
}

function hwbToRgb(
    hue: number,
    white: number,
    black: number
): { r: number; g: number; b: number } {
    const rgb = hslToRgb(hue, 1, 0.5);
    const xs = [];
    xs[0] = rgb.r / 255;
    xs[1] = rgb.g / 255;
    xs[2] = rgb.b / 255;
    const total = white + black;
    if (total > 1) {
        white = Number((white / total).toFixed(2));
        black = Number((black / total).toFixed(2));
    }
    for (let i = 0; i < 3; i++) {
        xs[i] *= 1 - white - black;
        xs[i] += white;
        xs[i] = Number(xs[i] * 255);
    }
    return { r: xs[0], g: xs[1], b: xs[2] };
}

function parseColorName(
    name: string
): { r: number; g: number; b: number; a: number } {
    const color = colorName[name.toLowerCase()];
    if (color) {
        return {
            r: color[0],
            g: color[1],
            b: color[2],
            a: 1,
        };
    }

    return undefined;
}

function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
    if (!hex) return undefined;
    if (hex[0] !== '#') return undefined;
    hex = hex.slice(1);
    let result;
    if (hex.length <= 4) {
        result = {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16),
        };
        if (hex.length === 4) {
            result.a = parseInt(hex[3] + hex[3], 16) / 255;
        }
    } else {
        result = {
            r: parseInt(hex[0] + hex[1], 16),
            g: parseInt(hex[2] + hex[3], 16),
            b: parseInt(hex[4] + hex[5], 16),
        };
        if (hex.length === 8) {
            result.a = parseInt(hex[6] + hex[7], 16) / 255;
        }
    }
    if (result && typeof result.a === 'undefined') result.a = 1.0;
    return result;
}

function roundTo(num: number, precision: number): number {
    return (
        Math.round(num * Math.pow(10, precision) + 1e-14) /
        Math.pow(10, precision)
    );
}

export class Value {
    private source = '';
    css(): string {
        return '';
    }
    type(): ValueType {
        return undefined;
    }
    canonicalScalar(): number {
        return 0;
    }
    getSource(): string {
        return this.source;
    }
    setSource(source: string): void {
        this.source = source;
    }
    equals(v: Value): boolean {
        return (
            this.type() === v.type() &&
            this.canonicalScalar() == v.canonicalScalar()
        );
    }
}

class Percentage extends Value {
    value: number; /* [0..100] */
    constructor(from: number) {
        super();
        this.value = from;
    }
    css(): string {
        return roundTo(this.value, 2) + '%';
    }
    type(): ValueType {
        return 'percentage';
    }
    canonicalScalar(): number {
        return this.value / 100;
    }
}

class Angle extends Value {
    value: number;
    unit: AngleUnit;
    constructor(from: number, unit: AngleUnit) {
        super();
        this.value = from;
        this.unit = unit;
    }
    css(): string {
        return roundTo(this.value, 2) + this.unit;
    }
    type(): ValueType {
        return 'angle';
    }
    canonicalScalar(): number {
        return asDegree(this);
    }
}

interface MultiLength {
    // Absolute canonical length
    px?: number;

    // Relative lengths
    em?: number;
    ex?: number;
    ch?: number;
    rem?: number;
    vw?: number;
    vh?: number;
    vmin?: number;
    vmax?: number;
}

class Length extends Value {
    value: number | MultiLength;
    unit: LengthUnit;
    constructor(from: number | MultiLength, unit?: LengthUnit) {
        super();
        if (typeof from === 'number') {
            this.value = from;
            if (from === 0) {
                this.unit = 'px';
            } else {
                this.unit = unit;
            }
        } else if (typeof unit === 'undefined') {
            const nonZeroKeys: LengthUnit[] = Object.keys(from).filter(
                x => typeof from[x] === 'number' && from[x] !== 0
            ) as LengthUnit[];
            if (nonZeroKeys.length === 0) {
                // Everything's zero, return the canonical zero length: 0px
                this.value = 0;
                this.unit = 'px';
            } else if (nonZeroKeys.length === 1) {
                // A single non-zero unit? Return that unit.
                this.value = from[nonZeroKeys[0]];
                this.unit = nonZeroKeys[0];
            } else {
                this.value = from;
                this.unit = 'multi';
            }
        } else {
            // Force promotion to multi
            this.value = from;
            this.unit = 'multi';
            console.assert(unit === 'multi');
        }
    }
    css(): string {
        if (typeof this.value === 'number') {
            // If it's a number, display "0" and "NaN" without units
            return this.value === 0 || isNaN(this.value)
                ? Number(this.value).toString()
                : roundTo(this.value, 2) + this.unit;
        }

        // It's a multi-unit length.

        const result: MultiLength = {};
        let units = Object.keys(this.value);

        if (units.length > 1) {
            // It's a multi-unit length, with multiple units
            // Attempt to simplify it
            let pxSum = 0;
            units.forEach(x => {
                const inPx = asPx(this.value[x], x as LengthUnit);
                if (!isNaN(inPx)) {
                    pxSum += inPx;
                } else if (x !== 'px') {
                    result[x] = this.value[x];
                }
            });
            if (pxSum !== 0) {
                result['px'] = pxSum;
            }
        } else {
            result[units[0]] = this.value[units[0]];
        }

        units = Object.keys(result);
        if (units.length === 1) {
            if (units[0] === 'px' && result['px'] === 0) {
                return '0';
            }
            return roundTo(result[units[0]], 2) + units[0];
        }

        return (
            'calc(' +
            units.map(x => Number(result[x]).toString() + x).join(' + ') +
            ')'
        );
    }
    type(): ValueType {
        return 'length';
    }
    canonicalScalar(): number {
        return this.unit === 'multi'
            ? NaN
            : asPx(this.value as number, this.unit);
    }
    equals(v: Value): boolean {
        if (isLength(v)) {
            const v1 = promoteToMulti(this);
            const v2 = promoteToMulti(v);
            return [...Object.keys(v1.value), ...Object.keys(v2.value)].every(
                x => v1.value[x] === v2.value[x]
            );
        }

        return false;
    }
}
class Time extends Value {
    value: number;
    unit: TimeUnit;
    constructor(from: number, unit: TimeUnit) {
        super();
        this.value = from;
        this.unit = unit;
    }
    css(): string {
        return roundTo(this.value, 2) + this.unit;
    }
    type(): ValueType {
        return 'time';
    }
    canonicalScalar(): number {
        return this.unit === 'ms' ? this.value / 1000 : this.value;
    }
}

class Frequency extends Value {
    value: number;
    unit: FrequencyUnit;
    constructor(from: number, unit: FrequencyUnit) {
        super();
        this.value = from;
        this.unit = unit;
    }
    css(): string {
        return roundTo(this.value, 2) + this.unit;
    }
    type(): ValueType {
        return 'frequency';
    }
    canonicalScalar(): number {
        return this.unit === 'khz' ? this.value * 1000 : this.value;
    }
}

class NumberValue extends Value {
    value: number;
    constructor(from: number) {
        super();
        this.value = from;
    }
    css(): string {
        return Number(this.value).toString();
    }
    type(): ValueType {
        return 'number';
    }
    canonicalScalar(): number {
        return this.value;
    }
}

export class StringValue extends Value {
    value: string;
    constructor(from: string) {
        super();
        this.value = from;
    }
    css(quoteLiteral = ''): string {
        return quoteLiteral + this.value + quoteLiteral;
    }
    type(): ValueType {
        return 'string';
    }
    canonicalScalar(): number {
        return parseFloat(this.value);
    }
    equals(v: Value): boolean {
        return isString(v) && this.value === v.value;
    }
}

export class Color extends Value {
    r?: number; /* [0..255] */
    g?: number; /* [0..255] */
    b?: number; /* [0..255] */
    h?: number; /* [0..360]deg */
    s?: number;
    l?: number;
    a: number; /* [0..1] or [0..100]% */
    constructor(from: object | string) {
        super();
        if (typeof from === 'string') {
            if (from.toLowerCase() === 'transparent') {
                [this.r, this.g, this.b, this.a] = [0, 0, 0, 0];
                [this.h, this.s, this.l] = [0, 0, 0];
            } else {
                const rgb = parseHex(from) || parseColorName(from);
                if (!rgb) throw new Error();
                Object.assign(this, rgb);
                Object.assign(this, rgbToHsl(this.r, this.g, this.b));
            }
        } else {
            Object.assign(this, from);
            // Normalize the RGB/HSL values so that a color value
            // always has r, g, b, h, s, l and a.
            if (typeof this.r === 'number') {
                // RGB data
                Object.assign(this, rgbToHsl(this.r, this.g, this.b));
            } else {
                // HSL data
                console.assert(typeof this.h === 'number');
                this.h = (this.h + 360) % 360;
                this.s = Math.max(0, Math.min(1.0, this.s));
                this.l = Math.max(0, Math.min(1.0, this.l));
                Object.assign(this, hslToRgb(this.h, this.s, this.l));
            }
        }
        if (typeof this.a !== 'number') {
            this.a = 1.0;
        }
    }
    type(): ValueType {
        return 'color';
    }
    opaque(): Color {
        return new Color({ r: this.r, g: this.g, b: this.b });
    }
    luma(): number {
        // Source: https://www.w3.org/TR/WCAG20/#relativeluminancedef
        let r = this.r / 255.0;
        let g = this.g / 255.0;
        let b = this.b / 255.0;
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    hex(): string {
        let hexString = (
            (1 << 24) +
            (clampByte(this.r) << 16) +
            (clampByte(this.g) << 8) +
            clampByte(this.b)
        )
            .toString(16)
            .slice(1);

        if (this.a < 1.0) {
            hexString += ('00' + Math.round(this.a * 255).toString(16)).slice(
                -2
            );
        }

        // Compress hex from hex-6 or hex-8 to hex-3 or hex-4 if possible
        if (
            hexString[0] === hexString[1] &&
            hexString[2] === hexString[3] &&
            hexString[4] === hexString[5] &&
            hexString[6] === hexString[7]
        ) {
            hexString =
                hexString[0] +
                hexString[2] +
                hexString[4] +
                (this.a < 1.0 ? hexString[6] : '');
        }

        return '#' + hexString;
    }
    rgb(): string {
        return `rgb(${roundTo(this.r, 2)}, ${roundTo(this.g, 2)}, ${roundTo(
            this.b,
            2
        )}${this.a < 1.0 ? ', ' + roundTo(100 * this.a, 2) + '%' : ''})`;
    }
    hsl(): string {
        return `hsl(${this.h}deg, ${this.s}%, ${this.l}%, ${
            this.a < 1.0 ? ', ' + roundTo(100 * this.a, 2) + '%' : ''
        })`;
    }
    css(): string {
        if (this.r === 0 && this.g === 0 && this.b === 0 && this.a === 0)
            return 'transparent';
        if (this.a < 1) {
            return this.rgb();
        }
        return this.hex();
    }
    canonicalScalar(): number {
        return this.luma();
    }
    equals(v: Value): boolean {
        return (
            isColor(v) &&
            this.r === v.r &&
            this.g === v.g &&
            this.b === v.b &&
            this.a === v.a
        );
    }
}

class ArrayValue extends Value {
    value: Value[];
    constructor(from: Value[]) {
        super();
        this.value = from.map(x => makeValueFrom(x));
    }
    get(index: number): Value {
        return this.value[index];
    }
    type(): ValueType {
        return 'array';
    }
    css(): string {
        return '[' + this.value.map(x => x.css()).join(', ') + ']';
    }
    equals(v: Value): boolean {
        return (
            isArray(v) &&
            this.value.length === v.value.length &&
            this.value.every((val, idx) => val === v.value[idx])
        );
    }
}

function isNumber(arg: Value): arg is NumberValue {
    return arg instanceof NumberValue;
}

function assertNumber(arg: Value): asserts arg is NumberValue {
    console.assert(arg instanceof NumberValue);
}

function assertNumberOrPercentage(arg: Value): asserts arg is NumberValue {
    console.assert(arg instanceof NumberValue || arg instanceof Percentage);
}

function assertLength(arg: Value): asserts arg is Length {
    console.assert(arg instanceof Length);
}

export function isColor(arg: Value): arg is Color {
    return arg instanceof Color;
}

function isPercentage(arg: Value): arg is Percentage {
    return arg instanceof Percentage;
}

function isLength(arg: Value): arg is Length {
    return arg instanceof Length;
}

export function isString(arg: Value): arg is StringValue {
    return arg instanceof StringValue;
}

function isAngle(arg: Value): arg is Angle {
    return arg instanceof Angle;
}

function isTime(arg: Value): arg is Time {
    return arg instanceof Time;
}

function isFrequency(arg: Value): arg is Frequency {
    return arg instanceof Frequency;
}

export function isArray(arg: Value): arg is ArrayValue {
    return arg instanceof ArrayValue;
}

export function isColorArray(arg: Value): arg is ArrayValue {
    return arg instanceof ArrayValue && arg.value.every(x => isColor(x));
}

function isZero(arg: Value): arg is NumberValue {
    return arg instanceof NumberValue && arg.value === 0;
}

export function makeValueFrom(from: {
    type: () => ValueType;
    [key: string]: any;
}): Value {
    switch (from.type()) {
        case 'color':
            return new Color(from);
        case 'frequency':
            return new Frequency(from.value, from.unit);
        case 'time':
            return new Time(from.value, from.unit);
        case 'angle':
            return new Angle(from.value, from.unit);
        case 'string':
            return new StringValue(from.value);
        case 'length':
            return new Length(from.value, from.unit);
        case 'percentage':
            return new Percentage(from.value);
        case 'number':
            return new NumberValue(from.value);
        case 'array':
            return new ArrayValue(from.value.map(makeValueFrom));
        default:
            console.error('Unknown value type');
    }
    return undefined;
}

/**
 * Convert a value to a color object.
 *
 * @param {object|string} value - hex string, color name or object with partial
 *
 */

function asColor(value: object | string): Color {
    if (!value) return undefined;
    let result: Color;
    try {
        result = new Color(value);
    } catch (_err) {
        result = undefined;
    }
    return result;
}

function asDecimalByte(value: Value): number {
    if (isPercentage(value)) {
        return Math.round((255 * value.value) / 100);
    }
    assertNumber(value);
    return Math.round(value.value);
}

function asInteger(value: Value, defaultValue?: number): number {
    if (isNumber(value)) {
        return Math.round(value.value);
    }
    if (typeof defaultValue === 'undefined') assertNumber(value);
    return defaultValue;
}

function asDecimalRatio(value: Value, defaultValue?: number | null): number {
    if (isPercentage(value)) {
        return value.value / 100;
    } else if (isNumber(value)) {
        return value.value;
    }

    if (typeof defaultValue === 'undefined') assertNumberOrPercentage(value);
    return defaultValue;
}

function asDegree(value: Value): number {
    // https://drafts.csswg.org/css-values-3/#angle-value

    if (isAngle(value)) {
        if (value.unit === 'deg') {
            return value.value;
        } else if (value.unit === 'rad') {
            return (value.value * 180) / Math.PI;
        } else if (value.unit === 'grad') {
            return (value.value * 180) / 200;
        } else if (value.unit === 'turn') {
            return value.value * 360.0;
        }
        throwError(ErrorCode.UnknownUnit, value.unit);
    } else {
        assertNumber(value);
        // Degree is the canonical unit for angles
        return value.value;
    }
}

function asPx(
    value: number | MultiLength,
    unit: LengthUnit,
    options?: ValueParserOptions
): number {
    // See https://drafts.csswg.org/css-values-3/#lengths
    if (typeof value !== 'number') {
        console.assert(unit === 'multi');
        let pxSum = value['px'] ?? 0;
        Object.keys(value).forEach(x => {
            const inPx = asPx(this.value[x], x as LengthUnit, options);
            if (isNaN(inPx)) return NaN;
            pxSum += pxSum;
        });
        return pxSum;
    }
    if (unit === 'px') {
        return value;
    } else if (unit === 'cm') {
        return (value * 96.0) / 2.54;
    } else if (unit === 'mm') {
        return (value * 96.0) / 25.4;
    } else if (unit === 'Q') {
        return (value * 96.0) / 2.54 / 40.0;
    } else if (unit === 'in') {
        return value * 96.0;
    } else if (unit === 'pc') {
        return value * 16.0;
    } else if (unit === 'pt') {
        return (value * 96.0) / 72.0;
    }
    let base: number;
    if (unit === 'vmin') {
        base = Math.min(
            options?.baseUnits?.vh ?? NaN,
            options?.baseUnits?.vw ?? NaN
        );
    } else if (unit === 'vmax') {
        base = Math.max(
            options?.baseUnits?.vh ?? NaN,
            options?.baseUnits?.vw ?? NaN
        );
    } else {
        base = options?.baseUnits?.[unit] ?? NaN;
    }

    return base * value;
}

function asPercent(value: Value): number {
    if (isPercentage(value)) {
        return value.value / 100;
    }
    assertNumber(value);
    return value.value;
}

function asString(value: Value, defaultValue: string): string {
    if (!isString(value)) {
        return defaultValue;
    }
    return value.value;
}

function compareValue(a: Value, b: Value): number {
    // @todo: compare strings (asCanonicalString())
    return b.canonicalScalar() - a.canonicalScalar();
}

function promoteToMulti(value: Length | NumberValue): Length {
    if (isNumber(value)) {
        return new Length({ px: value.value }, 'multi');
    }
    if (value.unit === 'multi') return value;

    const newValue: MultiLength = {};
    newValue[value.unit] = value.value;

    return new Length(newValue, 'multi');
}

const whiteColor = new Color('#fff');
const blackColor = new Color('#000');

export function scaleColor(
    arg1: Color,
    arg2?: Value,
    arg3?: Value,
    arg4?: Value
): ArrayValue {
    // For an analysis of various ramps, see https://uxplanet.org/designing-systematic-colors-b5d2605b15c
    let c1 = new Color('#fff');
    let c2: Color;
    let c3 = new Color('#000');
    let n = 10;
    if (arg3?.type() === 'color') {
        c1 = asColor(arg1);
        c2 = asColor(arg2);
        c3 = asColor(arg3);
        n = asInteger(arg4, 10);
    } else if (arg2?.type() === 'color') {
        c1 = asColor(arg1);
        c2 = asColor(arg2);
        c3 = asColor(arg2);
        n = asInteger(arg3, 10);
    } else if (arg1.type() === 'color') {
        // If a single color is provided, we'll calculate a color ramp
        // with the provided color as the midpoint, and black and white
        // as the extremes.
        c2 = asColor(arg1);
        c3 = new Color({
            // Correct the hue for the Abney Effect
            // See https://royalsocietypublishing.org/doi/pdf/10.1098/rspa.1909.0085
            // (the human vision system perceives a hue shift as colors
            // change in colorimetric purity (mix with black or mix
            // with white))
            // and the Bezold-Brücke effect (hue shift as intensity increases)
            // See https://www.sciencedirect.com/science/article/pii/S0042698999000851

            // h: c2.h >= 60 && c2.h <= 240 ? c2.h + 30 : c2.h - 30,
            h: c2.h - 20 * Math.sin(4 * Math.PI * (c2.h / 360)),
            s: c2.s + 0.2 * Math.sin(2 * Math.PI * (c2.h / 360)),
            l:
                c2.h >= 180
                    ? c2.l - 0.35
                    : c2.l - 0.15 + 0.15 * Math.sin(3 * Math.PI * (c2.h / 360)),
        });
        n = asInteger(arg2, 10);
        const mode = new StringValue('rgb');
        return new ArrayValue([
            FUNCTIONS.mix(c1, c2, new NumberValue(0.12), mode),
            FUNCTIONS.mix(c1, c2, new NumberValue(0.3), mode),
            FUNCTIONS.mix(c1, c2, new NumberValue(0.5), mode),
            FUNCTIONS.mix(c1, c2, new NumberValue(0.7), mode),
            FUNCTIONS.mix(c1, c2, new NumberValue(0.85), mode),
            c2,
            FUNCTIONS.mix(c3, c2, new NumberValue(0.85), mode),
            FUNCTIONS.mix(c3, c2, new NumberValue(0.7), mode),
            FUNCTIONS.mix(c3, c2, new NumberValue(0.5), mode),
            FUNCTIONS.mix(c3, c2, new NumberValue(0.2), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.06), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.12), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.18), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.24), mode),
        ]);
    }

    if (!c1 || !c2 || !c3) return undefined;

    // If there are three colors provided, we calculate a scale
    // in Lab mode, corrected for lightness (so that there is as many
    // light and dark colors). As a result, the mid-point may be a
    // color than c2.
    // This kind of scale is most appropriate for data visualization.
    const colors = chroma
        .scale(
            // chroma.bezier([
            //     c1.opaque().hex(),
            //     c2.opaque().hex(),
            //     c3.opaque().hex(),
            // ])
            [c1.opaque().hex(), c2.opaque().hex(), c3.opaque().hex()]
        )
        .mode('lab')
        .correctLightness()
        .colors(n + 1);

    return new ArrayValue(colors.map(x => new Color(x)));
}

function scaleLength(arg1: Length, arg2?: Value): ArrayValue {
    if (arg1.unit === 'multi') {
        throw new SyntaxError(ErrorCode.InvalidOperand);
    }
    const scaleName = asString(arg2, 'pentatonic').toLowerCase();
    let scale = {
        tritonic: [2, 3],
        tetratonic: [2, 4],
        pentatonic: [2, 5],
        golden: [1.618, 1],
        'golden ditonic': [1.618, 2],
    }[scaleName];
    if (typeof scale === 'undefined') {
        // Try to parse the scale as "p:q"
        scale = scaleName.split(':').map(x => parseFloat(x));
        if (isNaN(scale[0]) || isNaN(scale[1])) {
            throw new SyntaxError(ErrorCode.InvalidOperand);
        }
        scale = [scale[1] / scale[0], 1];
    }
    const [r, n] = scale;
    const range =
        (arg1.value as number) * (Math.pow(r, 7 / n) - Math.pow(r, -2 / n));
    const precision =
        range < 10 || (arg1.value as number) * Math.pow(r, -2 / n) < 1 ? 2 : 0;
    const result: Value[] = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(
        (i: number): Value =>
            new Length(
                roundTo((arg1.value as number) * Math.pow(r, i / n), precision),
                arg1.unit
            )
    );

    return new ArrayValue(result);
}

// Definition of the functions that can be used in the expression
// of token values.
let FUNCTIONS: {
    [key: string]: (...args: Value[]) => Value;
} = {};
FUNCTIONS = {
    /** The calc() function is a no-op, but it's there for compatibility with CSS */
    calc: (x: Value): Value => x,
    /** r, g, b: a value as a number in [0...255] or as a percentage. a: a number in [0...1] or a percentage */
    rgb: (r: Value, g: Value, b: Value, a?: Value): Color => {
        return new Color({
            r: asDecimalByte(r),
            g: asDecimalByte(g),
            b: asDecimalByte(b),
            a: asDecimalRatio(a, 1.0),
        });
    },
    hsl: (h: Value, s: Value, l: Value, a?: Value): Color => {
        return new Color({
            h: asDegree(h),
            s: asPercent(s),
            l: asPercent(l),
            a: asDecimalRatio(a, 1.0),
        });
    },
    hsv: (h: Value, sat: Value, val: Value, a?: Value): Color => {
        let s = asPercent(sat);
        const v = asPercent(val);

        const l = ((2 - s) * v) / 2;

        if (l != 0) {
            if (l == 1) {
                s = 0;
            } else if (l < 0.5) {
                s = (s * v) / (l * 2);
            } else {
                s = (s * v) / (2 - l * 2);
            }
        }
        return new Color({
            h: asDegree(h),
            s: s,
            l: l,
            a: asDecimalRatio(a, 1.0),
        });
    },
    hwb: (h: Value, w: Value, b: Value, a?: Value): Color => {
        return new Color({
            a: asDecimalRatio(a, 1.0),
            ...hwbToRgb(asDegree(h), asPercent(w), asPercent(b)),
        });
    },
    lab: (l: Value, a: Value, b: Value, alpha?: Value): Color => {
        return new Color({
            a: asDecimalRatio(alpha, 1.0),
            ...labToRgb(asPercent(l), asDecimalRatio(a), asDecimalRatio(b)),
        });
    },
    gray: (g: Value, alpha: Value): Color => {
        return new Color({
            a: asDecimalRatio(alpha, 1.0),
            ...labToRgb(asPercent(g), 0, 0),
        });
    },
    min: (a: Value, b: Value): Value => {
        return compareValue(a, b) < 0 ? a : b;
    },
    max: (a: Value, b: Value): Value => {
        return compareValue(a, b) < 0 ? b : a;
    },
    clamp(a: Value, b: Value, c: Value): Value {
        return compareValue(b, a) < 0 ? a : compareValue(b, c) > 0 ? c : b;
    },
    mix: (c1: Value, c2: Value, weight: Value, model?: Value): Color => {
        // @todo: support additional color models. See color-convert npm module.
        const modelName = asString(model, 'hsl').toLowerCase();
        const color1 = asColor(c1);
        if (!color1) return undefined;
        const color2 = asColor(c2);
        if (!color2) return color1;

        const w = asDecimalRatio(weight, 0.5);

        let alpha = typeof color2.a === 'number' ? color2.a : 1.0;
        alpha =
            alpha +
            ((typeof color1.a === 'number' ? color2.a : 1.0) - alpha) * w;
        if (modelName === 'rgb') {
            return new Color({
                r: color1.r + (color2.r - color1.r) * w,
                g: color1.g + (color2.g - color1.g) * w,
                b: color1.b + (color2.b - color1.b) * w,
                a: alpha,
            });
        } else if (modelName === 'hsl') {
            return new Color({
                h: color1.h + (color2.h - color1.h) * w,
                s: color1.s + (color2.s - color1.s) * w,
                l: color1.l + (color2.l - color1.l) * w,
                a: alpha,
            });
        } else if (modelName === 'lab') {
            const { L: L1, a: a1, b: b1 } = rgbToLab(
                color1.r,
                color1.g,
                color1.b
            );
            const { L: L2, a: a2, b: b2 } = rgbToLab(
                color2.r,
                color2.g,
                color2.b
            );

            return new Color({
                ...labToRgb(
                    L1 + (L2 - L1) * w,
                    a1 + (a2 - a1) * w,
                    b1 + (b2 - b1) * w
                ),
                alpha,
            });
        }
    },
    saturate: (c: Value, v: Value): Color => {
        const color = asColor(c);
        if (!color) return undefined;
        return new Color({
            h: color.h,
            s: color.s + (1.0 - color.s) * asDecimalRatio(v, 0.1),
            l: color.l,
            a: color.a,
        });
    },
    desaturate: (c: Value, v: Value): Color => {
        const color = asColor(c);
        if (!color) return undefined;
        return new Color({
            h: color.h,
            s: color.s - color.s * asDecimalRatio(v, 0.1),
            l: color.l,
            a: color.a,
        });
    },
    lighten: (c: Value, v: Value): Color => {
        const color = asColor(c);
        if (!color) return undefined;
        return new Color({
            h: color.h,
            s: color.s,
            l: color.l + (1.0 - color.l) * asDecimalRatio(v, 0.1),
            a: color.a,
        });
    },
    darken: (c: Value, v: Value): Color => {
        const color = asColor(c);
        if (!color) return undefined;
        return new Color({
            h: color.h,
            s: color.s,
            l: color.l - color.l * asDecimalRatio(v, 0.1),
            a: color.a,
        });
    },
    rotateHue: (c: Value, v: Value): Color => {
        const color = asColor(c);
        if (color) {
            if (!v || (!isAngle(v) && !isNumber(v))) {
                return color;
            } else {
                return new Color({
                    h: (color.h + asDegree(v) + 360) % 360,
                    s: color.s,
                    l: color.l,
                    a: color.a,
                });
            }
        }
        return undefined;
    },
    complement: (c: Value): Color => {
        const color = asColor(c);
        if (color) {
            return new Color({
                h: (color.h + 180) % 360,
                s: color.s,
                l: color.l,
                a: color.a,
            });
        }
        return undefined;
    },
    /**
     * Return either dark (default #000) or light (default #fff) depending on
     * the contrast ratio (as per WCAG 2.0 spec)
     * WCAG 2.0
     * - AA
     *     - small text: contrast ratio > 4.5:1
     *     - large text (18px, bold): contrast ratio > 3.1
     * - AAA
     *     - small text: contrast ratio > 7:1
     *     - large text (18px, bold): contrast ratio > 4.5.1
     */
    contrast: (base: Value, dark: Value, light: Value): Color => {
        const baseColor = asColor(base);
        const darkColor = asColor(dark) || blackColor;
        const lightColor = asColor(light) || whiteColor;

        let darkContrast, lightContrast;

        // Calculate contrast ratios for each color
        // See https://www.w3.org/TR/WCAG20/#contrast-ratiodef
        const baseLuma = baseColor.luma();
        const darkLuma = darkColor.luma();
        const lightLuma = lightColor.luma();
        if (baseLuma > darkLuma) {
            darkContrast = (baseLuma + 0.05) / (darkLuma + 0.05);
        } else {
            darkContrast = (darkLuma + 0.05) / (baseLuma + 0.05);
        }
        if (baseLuma > lightLuma) {
            lightContrast = (baseLuma + 0.05) / (lightLuma + 0.05);
        } else {
            lightContrast = (lightLuma + 0.05) / (baseLuma + 0.05);
        }

        return darkContrast > lightContrast ? darkColor : lightColor;
    },
    rgba: (r, g, b, a): Value => FUNCTIONS.rgb(r, g, b, a),
    hsla: (h, s, l, a): Value => FUNCTIONS.hsl(h, s, l, a),
    tint: (c: Value, w: Value): Color =>
        FUNCTIONS.mix(whiteColor, c, w ?? new NumberValue(0.1)) as Color,
    shade: (c: Value, w: Value): Color =>
        FUNCTIONS.mix(blackColor, c, w ?? new NumberValue(0.1)) as Color,
    scale: (arg1: Value, arg2: Value, arg3: Value, arg4: Value): ArrayValue => {
        if (isColor(arg1)) {
            return scaleColor(arg1, arg2, arg3, arg4);
        } else if (isLength(arg1)) {
            return scaleLength(arg1, arg2);
        }
    },
};

/* Functions that take a "color" argument list */
/* Which includes either space or comma as a separator, and "/" for alpha */
const colorFunctions = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'grey', 'lab'];

const FUNCTION_ARGUMENTS = {
    calc: 'any',
    rgb:
        'number|percentage, number|percentage, number|percentage,number|percentage|none',
    rgba:
        'number|percentage, number|percentage, number|percentage,number|percentage|none',
    hsl:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    hsla:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    hsv:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    hwb:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    lab: 'number|percentage, number, number, number|percentage|none',
    gray: 'number|percentage, number|percentage|none',
    min: 'any, any',
    max: 'any, any',
    clamp: 'any, any, any',
    mix: 'color, color, number|percentage|none, string|none',
    saturate: 'color, number|percentage|none',
    desaturate: 'color, number|percentage|none',
    lighten: 'color, number|percentage|none',
    darken: 'color, number|percentage|none',
    rotateHue: 'color, angle|number|none',
    complement: 'color',
    contrast: 'color, color|none, color|none',

    tint: 'color, number|percentage|none',
    shade: 'color, number|percentage|none',
};

function validateArguments(fn: string, args: any[]): void {
    const expectedArguments = FUNCTION_ARGUMENTS[fn]
        ?.split(',')
        .map(x => x.trim());
    if (expectedArguments) {
        expectedArguments.forEach((x: string, i: number) => {
            const types = x.split('|').map(x => x.trim());

            if (!types.includes('none') && !args[i]) {
                throw new SyntaxError(
                    ErrorCode.MissingArgument,
                    String(i + 1),
                    fn,
                    types.join(', ')
                );
            }

            if (
                args[i] &&
                !types.includes('any') &&
                !types.includes(args[i]?.type())
            ) {
                throw new SyntaxError(
                    ErrorCode.ExpectedArgument,
                    String(i + 1),
                    fn,
                    types.join(', ')
                );
            }
        });
        if (args.length > expectedArguments.length) {
            throw new SyntaxError(
                ErrorCode.TooManyArguments,
                fn,
                expectedArguments.join(', ')
            );
        }
    }
}

class Stream {
    /**
     * @param {string} s - A token value expression
     * @param {object} options
     * @param {number} "base-font-size" - The number of pixels of 1rem.
     */
    s = '';
    index = 0;
    options: ValueParserOptions = {};
    constructor(s: string, options: ValueParserOptions = {}) {
        this.s = s;
        this.index = 0;
        this.options = options;
    }
    isEOF(): boolean {
        return this.index >= this.s.length;
    }
    lookAhead(n: number): string {
        return this.s.slice(this.index, this.index + n);
    }

    skipWhiteSpace(): void {
        this.match(/^\s*/);
    }
    match(target: string): boolean;
    match(target: RegExp): string;
    match(target: string | RegExp): string | boolean {
        if (typeof target === 'string') {
            if (this.lookAhead(target.length) === target) {
                this.index += target.length;
                return target;
            }
        } else {
            const m = this.s.slice(this.index).match(target);
            if (m && m[0]) {
                this.index += m[0].length;
                return m[1] || true;
            }
        }
        return undefined;
    }

    error(code: ErrorCode, ...args: string[]): void {
        const prefix = this.s.slice(0, this.index).match(/^(.*)/)?.[1] ?? '';
        const suffix = this.s.slice(this.index).match(/(.*)$/)?.[1] ?? '';
        throwErrorWithContext(
            [prefix + terminal.dim(suffix), ' '.repeat(prefix.length) + '⇧'],
            code,
            ...args
        );
    }

    /** Apply an arithmetic operation when at least one of the operands is a Length
     *
     */
    applyOpToLength(
        op: string,
        lhs: Length | NumberValue,
        rhs: Length | NumberValue
    ): Value {
        if (isNumber(lhs) && op === '/') this.error(ErrorCode.InvalidOperand);
        if (!isNumber(lhs) && !isNumber(rhs) && op === '*')
            this.error(ErrorCode.InvalidOperand);

        const opFn = {
            '+': (a: any, b: any): any => a + b,
            '-': (a: any, b: any): any => a - b,
            '*': (a: any, b: any): any => a * b,
            '/': (a: any, b: any): any => a / b,
        }[op];

        if (isNumber(lhs)) {
            assertLength(rhs);
            if (rhs.unit === 'multi') {
                const multiLength = {};
                Object.keys(rhs.value as MultiLength).forEach(unit => {
                    multiLength[unit] = opFn(lhs.value, rhs.value[unit]);
                });
                return new Length(multiLength);
            }
            return new Length(opFn(lhs.value, rhs.value), rhs.unit);
        }
        if (isNumber(rhs)) {
            if (typeof lhs.value === 'number') {
                return new Length(opFn(lhs.value, rhs.value), lhs.unit);
            }
            const multiLength = {};
            Object.keys(lhs.value as MultiLength).forEach(unit => {
                multiLength[unit] = opFn(lhs.value[unit], rhs.value);
            });
            return new Length(multiLength);
        }
        // We've dealt with the case where one of the two operand is a number.
        // Now, both operands are Length
        if (op === '/') {
            if (lhs.unit === 'multi' || rhs.unit === 'multi') {
                this.error(ErrorCode.InvalidOperand);
            }

            if (lhs.unit === rhs.unit) {
                // If the units are the same, we can calculate the result
                // even if the units are relative (em, vh, etc...)
                return new NumberValue(
                    (lhs.value as number) / (rhs.value as number)
                );
            } else {
                // The units are not the same. Attempt to conver them to a scalar
                return new NumberValue(
                    lhs.canonicalScalar() / rhs.canonicalScalar()
                );
            }
        }
        // Normalize them both to multi-units
        const lhsMulti = promoteToMulti(lhs);
        const rhsMulti = promoteToMulti(rhs);

        // Apply the operation on the union of both operands
        const multiLength = {};
        [
            ...Object.keys(lhsMulti.value as MultiLength),
            ...Object.keys(rhsMulti.value as MultiLength),
        ].forEach(unit => {
            if (typeof rhsMulti.value[unit] === 'undefined') {
                multiLength[unit] = lhsMulti.value[unit];
            } else if (typeof lhsMulti.value[unit] === 'undefined') {
                multiLength[unit] = rhsMulti.value[unit];
            } else {
                multiLength[unit] = opFn(
                    lhsMulti.value[unit],
                    rhsMulti.value[unit]
                );
            }
        });
        return new Length(multiLength);
    }

    parseUnit(num: number): Value {
        // Check if a number (or group) is followed (immediately) by a unit
        if (this.match('%')) {
            return new Percentage(num);
        }
        let unit = this.match(
            /^(em|ex|ch|rem|vw|vh|vmin|vmax|px|cm|mm|in|pt|pc|Q)/
        );
        if (unit) {
            return new Length(num, unit as LengthUnit);
        }
        unit = this.match(/^(deg|°|rad|grad|turn)/);
        if (unit) {
            return new Angle(num, (unit === '°' ? 'deg' : unit) as AngleUnit);
        }
        unit = this.match(/^(ms|s)/);
        if (unit) {
            return new Time(num, unit as TimeUnit);
        }
        unit = this.match(/^(khz|hz|kHz|Hz)/);
        if (unit) {
            return new Frequency(num, unit.toLowerCase() as FrequencyUnit);
        }
        unit = this.match(/^([a-zA-Z]+)/);
        if (unit) {
            this.error(ErrorCode.UnknownUnit, unit);
        }
        return new NumberValue(num);
    }

    parseIndex(v: Value): Value {
        let result = v;
        if (this.match('[')) {
            if (v.type() !== 'array') {
                this.error(ErrorCode.UnexpectedOpenBracket);
            } else {
                const index = asInteger(this.parseExpression(), NaN);
                if (isNaN(index)) this.error(ErrorCode.ExpectedIntegerIndex);
                result = (v as ArrayValue).get(index);
                this.skipWhiteSpace();
                if (!this.match(']')) {
                    this.error(ErrorCode.ExpectedCloseBracket);
                }
            }
        }
        return result;
    }

    parseLiteral(): Value {
        let result: Value;
        const saveIndex = this.index;
        const op = this.match(/^\s*([+\-])\s*/);
        if (op) {
            const operand = this.parseLiteral();
            if (op === '-') {
                // Unary operator
                if (isPercentage(operand)) {
                    return new Percentage(-100 * asPercent(operand));
                }
                if (isNumber(operand)) {
                    return new NumberValue(-operand.value);
                }
                if (isAngle(operand)) {
                    return new Angle(-operand.value, operand.unit);
                }
                if (isLength(operand)) {
                    return this.applyOpToLength(
                        '-',
                        new Length(0, 'px'),
                        operand
                    );
                }
                this.error(ErrorCode.InvalidUnaryOperand);
            }
            return operand;
        }

        const num = this.match(/^([0-9]*\.[0-9]+|\.?[0-9]+)/);
        if (num) {
            result = this.parseUnit(parseFloat(num));
        }

        if (!result && this.match('[')) {
            // It's an array litteral
            const array = [];
            while (this.lookAhead(1) !== ']' && !this.isEOF()) {
                const element = this.parseExpression();
                if (!element) {
                    this.error(ErrorCode.SyntaxError);
                }
                array.push(element);
                this.match(/^(\s*,?|\s+)/);
            }

            if (this.isEOF()) {
                this.error(ErrorCode.ExpectedCloseBracket);
            }
            this.match(']');
            return new ArrayValue(array);
        }

        if (!result && this.match('"')) {
            // It's a string
            let s = '';
            while (this.lookAhead(1) !== '"' && !this.isEOF()) {
                if (this.lookAhead(1) === '\\') {
                    // Escape character
                    s += this.s[this.index + 1];
                    this.index += 2;
                } else {
                    s += this.s[this.index];
                    this.index += 1;
                }
            }

            if (this.isEOF()) {
                this.error(ErrorCode.ExpectedQuote);
            }
            this.match('"');
            return new StringValue(s);
        }

        if (!result && this.match('{')) {
            // It's an alias
            const identifier = this.match(/^([a-zA-Z_-][a-zA-Z0-9\._-]*)/);
            if (identifier) {
                let alias = this.options?.aliasResolver(identifier);
                if (typeof alias === 'string') {
                    // If that didn't work, try an implicit color scale...
                    // e.g. "red-200"
                    const m = identifier.match(/^(.+)-([0-9]{2,3})$/);
                    if (m) {
                        const resolvedValue = this.options?.aliasResolver(m[1]);
                        if (typeof resolvedValue !== 'string') {
                            if (isArray(resolvedValue)) {
                                const index = Math.round(parseInt(m[2]) / 100);
                                alias = resolvedValue.get(index);
                            } else if (isColor(resolvedValue)) {
                                const index = Math.round(parseInt(m[2]) / 100);

                                alias = scaleColor(resolvedValue)?.get(index);
                            } else if (isLength(resolvedValue)) {
                                const index =
                                    m[2] === '50'
                                        ? 0
                                        : Math.round(parseInt(m[2]) / 100);
                                alias = scaleLength(resolvedValue)?.get(index);
                            }
                        } else if (typeof resolvedValue === 'string') {
                            // A string indicate the identifier could not be
                            // resolved. The string is the suggestion
                            this.error(
                                ErrorCode.UnknownToken,
                                m[1],
                                resolvedValue
                            );
                        } else this.error(ErrorCode.InvalidOperand);
                    }
                }
                if (typeof alias === 'string') {
                    this.error(ErrorCode.UnknownToken, identifier, alias);
                }
                result = alias as Value;
                if (result) {
                    // Clone the result of the alias, since we'll need to change
                    // the source
                    result = makeValueFrom(result);
                    result.setSource('{' + identifier + '}');
                }
            }
            if (!this.match('}')) {
                this.error(ErrorCode.ExpectedCloseCurlyBracket);
            }
        }

        if (!result) {
            // Attempt to parse a color as a hex value
            result = asColor(this.match(/^\s*(#[0-9a-fA-F]{3,8})/));
        }
        if (!result) {
            // Backtrack and attempt to parse as a color name
            this.index = saveIndex;
            result = asColor(this.match(/^\s*([a-zA-Z]+)/));
        }
        if (!result) {
            // Backtrack
            this.index = saveIndex;
        }
        return result;
    }

    /* Argument to color functions (rgb, hsl, etc...) have a bit of 
    a peculiar syntax. The arguments can be either comma or space delimited, 
    and the last one (the opacity) can be space, comma or "/". 
    And it's optional */
    parseColorArguments(): (Value | Value)[] {
        const result: (Value | Value)[] = [];

        this.skipWhiteSpace();
        if (!this.match('(')) return undefined;

        let arg = this.parseExpression();
        if (arg) {
            result.push(arg);

            if (!this.match(/^(\s*,?|\s+)/)) {
                this.match(')');
                return result;
            }

            arg = this.parseExpression();
            if (arg) {
                result.push(arg);

                if (!this.match(/^(\s*,?|\s+)/)) {
                    this.match(')');
                    return result;
                }

                arg = this.parseExpression();
                if (arg) {
                    result.push(arg);

                    // Last argument (opacity) can be separated with a "slash"
                    if (!this.match(/^(\s*,?|\s+|\s*\/)/)) {
                        this.match(')');
                        return result;
                    }

                    arg = this.parseExpression();
                    if (arg) {
                        result.push(arg);
                    }
                }
            }
        }

        this.match(')');

        return result;
    }

    parseArguments(): Value[] {
        this.skipWhiteSpace();
        if (!this.match('(')) return undefined;

        const result = [];
        while (this.lookAhead(1) !== ')' && !this.isEOF()) {
            const argument = this.parseExpression();
            if (!argument) {
                this.error(ErrorCode.SyntaxError);
            }
            result.push(argument);
            this.match(/^(\s*,?|\s+)/);
        }
        if (this.isEOF()) {
            this.error(ErrorCode.ExpectedCloseParen);
        }
        this.match(')');

        return result;
    }

    parseCall(): Value {
        const saveIndex = this.index;
        const fn = this.match(/^([a-zA-Z\-]+)/);
        if (fn) {
            if (!FUNCTIONS[fn]) {
                if (this.lookAhead(1) === '(') {
                    this.error(
                        ErrorCode.UnknownFunction,
                        fn,
                        getSuggestion(fn, FUNCTIONS)
                    );
                }
            } else {
                const args = colorFunctions.includes(fn)
                    ? this.parseColorArguments()
                    : this.parseArguments();
                if (args) {
                    try {
                        validateArguments(fn, args);
                    } catch (err) {
                        if (err.code) {
                            this.error(err.code, ...err.args);
                        } else {
                            this.error(err.message);
                        }
                    }
                    return FUNCTIONS[fn](...args);
                } else {
                    this.error(ErrorCode.SyntaxError);
                }
            }
        }
        // Backtrack
        this.index = saveIndex;
        return undefined;
    }

    parseTerminal(): Value {
        const result =
            this.parseCall() || this.parseGroup() || this.parseLiteral();

        if (!result) return result;

        return this.parseIndex(result);
    }

    parseFactor(): Value {
        let lhs = this.parseTerminal();

        let op = this.match(/^\s*([*|/])\s*/);
        while (op) {
            const opFn = {
                '*': (a: any, b: any): any => a * b,
                '/': (a: any, b: any): any => a / b,
            }[op];
            // Multiplication or division
            const rhs = this.parseTerminal();

            if (!rhs) this.error(ErrorCode.ExpectedOperand);
            // Type combination rules (for * AND /)
            // ---
            // num * num            -> num
            // num * angle          -> angle
            // num * percent        -> percent
            // num * length         -> length
            // Other combinations are invalid, but division of two
            // values of the same type is valid (and yields a unitless number)
            if (isNumber(rhs)) {
                if (isNumber(lhs)) {
                    lhs = new NumberValue(opFn(lhs.value, rhs.value));
                } else if (isPercentage(lhs)) {
                    lhs = new Percentage(opFn(lhs.value, rhs.value));
                } else if (isLength(lhs)) {
                    lhs = this.applyOpToLength(op, lhs, rhs);
                } else if (isAngle(lhs)) {
                    lhs = new Angle(opFn(lhs.value, rhs.value), lhs.unit);
                } else if (isFrequency(lhs)) {
                    lhs = new Frequency(opFn(lhs.value, rhs.value), lhs.unit);
                } else if (isTime(lhs)) {
                    lhs = new Time(opFn(lhs.value, rhs.value), lhs.unit);
                }
            } else if ((isNumber(lhs) || isLength(lhs)) && isLength(rhs)) {
                return this.applyOpToLength(op, lhs, rhs);
            } else if (isNumber(lhs)) {
                if (isPercentage(rhs)) {
                    lhs = new Percentage(opFn(lhs.value, rhs.value));
                } else if (isLength(rhs)) {
                    lhs = this.applyOpToLength(op, lhs, rhs);
                } else if (isAngle(rhs)) {
                    lhs = new Angle(opFn(lhs.value, rhs.value), rhs.unit);
                } else if (isFrequency(rhs)) {
                    lhs = new Frequency(opFn(lhs.value, rhs.value), rhs.unit);
                } else if (isTime(rhs)) {
                    lhs = new Time(opFn(lhs.value, rhs.value), rhs.unit);
                }
            } else if (op === '/' && lhs.type() === rhs.type()) {
                lhs = new NumberValue(
                    lhs.canonicalScalar() / rhs.canonicalScalar()
                );
            } else {
                this.error(ErrorCode.InvalidOperand);
            }
            op = this.match(/^\s*([*|/])\s*/);
        }

        return lhs;
    }

    parseTerm(): Value {
        let lhs = this.parseFactor();

        let op = this.match(/^\s*([+\-])\s*/);

        while (op) {
            const opFn = {
                '+': (a: any, b: any): any => a + b,
                '-': (a: any, b: any): any => a - b,
            }[op];
            // Type combination rules (for + AND -)
            // ---
            // string + any             -> string
            // any + string             -> string
            // num + num                -> num
            // percentage + num         -> percent
            // num + percentage         -> percent
            // percentage + percentage  -> percent
            // angle + angle            -> angle
            // length + length          -> length
            // Other combinations are invalid.
            const rhs = this.parseFactor();

            if (!rhs) this.error(ErrorCode.ExpectedOperand);

            if (isString(lhs) || isString(rhs)) {
                if (op === '-') this.error(ErrorCode.InvalidOperand);
                lhs = new StringValue(opFn(lhs.css(), rhs.css()));
            } else if (isNumber(lhs) && isNumber(rhs)) {
                lhs = new NumberValue(opFn(lhs.value, rhs.value));
            } else if (
                (isZero(lhs) || isPercentage(lhs)) &&
                (isZero(rhs) || isPercentage(rhs))
            ) {
                lhs = new Percentage(
                    100 * opFn(asPercent(lhs), asPercent(rhs))
                );
            } else if (isZero(lhs) && isTime(rhs)) {
                lhs = new Time(opFn(0, rhs.value), rhs.unit);
            } else if (isTime(lhs) && isZero(rhs)) {
                lhs = new Time(lhs.value, lhs.unit);
            } else if (isTime(lhs) && isTime(rhs)) {
                if (lhs.unit === rhs.unit) {
                    lhs = new Time(opFn(lhs.value, rhs.value), lhs.unit);
                } else {
                    lhs = new Time(
                        opFn(lhs.canonicalScalar(), rhs.canonicalScalar()),
                        's'
                    );
                }
            } else if (isZero(lhs) && isFrequency(rhs)) {
                lhs = new Frequency(opFn(0, rhs.value), rhs.unit);
            } else if (isFrequency(lhs) && isZero(rhs)) {
                lhs = new Frequency(lhs.value, lhs.unit);
            } else if (isFrequency(lhs) && isFrequency(rhs)) {
                if (lhs.unit === rhs.unit) {
                    lhs = new Frequency(opFn(lhs.value, rhs.value), lhs.unit);
                } else {
                    lhs = new Frequency(
                        opFn(lhs.canonicalScalar(), rhs.canonicalScalar()),
                        'hz'
                    );
                }
            } else if (isZero(lhs) && isAngle(rhs)) {
                lhs = new Angle(opFn(0, rhs.value), rhs.unit);
            } else if (isAngle(lhs) && isZero(rhs)) {
                lhs = new Angle(lhs.value, lhs.unit);
            } else if (isAngle(lhs) && isAngle(rhs)) {
                if (lhs.unit === rhs.unit) {
                    lhs = new Angle(opFn(lhs.value, rhs.value), lhs.unit);
                } else {
                    lhs = new Angle(opFn(asDegree(lhs), asDegree(rhs)), 'deg');
                }
            } else if (
                (isZero(lhs) || isLength(lhs)) &&
                (isZero(rhs) || isLength(rhs))
            ) {
                lhs = this.applyOpToLength(op, lhs, rhs);
            } else {
                this.error(ErrorCode.InvalidOperand);
            }
            op = this.match(/^\s*([+\-])\s*/);
        }

        return lhs;
    }

    parseGroup(): Value {
        let result: Value;
        if (this.match('(')) {
            result = this.parseExpression();
            this.skipWhiteSpace();
            if (!this.match(')')) {
                this.error(ErrorCode.ExpectedCloseParen);
            }
        }

        if (result && isNumber(result)) {
            // If the value of the group is a number
            // check and handle units that might be after it.
            // "(12 + 5)px"
            result = this.parseUnit(result.value);
        }

        return result;
    }

    parseExpression(): Value {
        this.skipWhiteSpace();
        return this.parseTerm();
    }
}

export function parseValue(
    expression: string,
    options: ValueParserOptions = {}
): Value {
    const stream = new Stream(expression, options);
    const result = stream.parseExpression();
    stream.skipWhiteSpace();
    if (!stream.isEOF()) {
        // There was some additional content that we couldn't parse.
        // Return 'undefined' to avoid partially parsing things
        // that shouldn't be. For example "3px red" should
        // be interpreted as a string, not as "3px".
        return undefined;
    }
    if (result) {
        result.setSource(expression);
    }
    return result;
}
