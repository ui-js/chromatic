const colorName = require('color-name');

import { throwError, ErrorCode, SyntaxError } from './errors';

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

/**
 * Those are relative units that can't be evaluated statically, as they
 * depend on the rendering environment (the size of the base font of the
 * document, the metrics of the current font, the dimension of the view port.
 * However, it is possible to provide values for those to valueParser,
 * in which case they will get evaluated.
 */

export interface BaseLengthUnits {
    rem?: number;
    em?: number;
    ex?: number;
    ch?: number;
    vh?: number;
    vw?: number;
}

export function clampByte(v: number): number {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return Math.round(v);
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

export type LengthUnit =
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

export type AngleUnit = 'deg' | 'grad' | 'rad' | 'degree' | 'turn';

export type TimeUnit = 's' | 'ms';

export type FrequencyUnit = 'hz' | 'khz';

export function roundTo(num: number, precision: number): number {
    return (
        Math.round(num * Math.pow(10, precision) + 1e-14) /
        Math.pow(10, precision)
    );
}

export class Percentage extends Value {
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
    equals(v: Value): boolean {
        if (isLength(v)) {
            const v1 = promoteToMulti(this);
            const v2 = promoteToMulti(v);
            return [...Object.keys(v1.value), ...Object.keys(v2.value)].every(
                (x) => v1.value[x] === v2.value[x]
            );
        }

        return false;
    }
}

export class Angle extends Value {
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

export interface MultiLength {
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

export class Length extends Value {
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
                (x) => typeof from[x] === 'number' && from[x] !== 0
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
            units.forEach((x) => {
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
            units.map((x) => Number(result[x]).toString() + x).join(' + ') +
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
}

export class Time extends Value {
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

export class Frequency extends Value {
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

export class NumberValue extends Value {
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

export class ArrayValue extends Value {
    value: Value[];
    constructor(from: Value[]) {
        super();
        this.value = from.map((x) => makeValueFrom(x));
    }
    get(index: number): Value {
        return this.value[index];
    }
    type(): ValueType {
        return 'array';
    }
    css(): string {
        return '[' + this.value.map((x) => x.css()).join(', ') + ']';
    }
    equals(v: Value): boolean {
        return (
            isArray(v) &&
            this.value.length === v.value.length &&
            this.value.every((val, idx) => val === v.value[idx])
        );
    }
}

export function parseColorName(
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

export function parseHex(
    hex: string
): { r: number; g: number; b: number; a: number } {
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

function hueToRgbChannel(t1: number, t2: number, hue: number): number {
    if (hue < 0) hue += 6;
    if (hue >= 6) hue -= 6;

    if (hue < 1) return (t2 - t1) * hue + t1;
    else if (hue < 3) return t2;
    else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
    else return t1;
}

export function hslToRgb(
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

export function rgbToHsl(
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
export function isColor(arg: Value): arg is Color {
    return arg instanceof Color;
}

/**
 * Convert a value to a color object.
 *
 * @param {object|string} value - hex string, color name or object with partial
 *
 */

export function asColor(value: object | string): Color {
    if (!value) return undefined;
    let result: Color;
    try {
        result = new Color(value);
    } catch (_err) {
        result = undefined;
    }
    return result;
}

export function isColorArray(arg: Value): arg is ArrayValue {
    return arg instanceof ArrayValue && arg.value.every((x) => isColor(x));
}

export function isNumber(arg: Value): arg is NumberValue {
    return arg instanceof NumberValue;
}

export function assertNumber(arg: Value): asserts arg is NumberValue {
    console.assert(arg instanceof NumberValue);
}

function assertNumberOrPercentage(arg: Value): asserts arg is NumberValue {
    console.assert(arg instanceof NumberValue || arg instanceof Percentage);
}

export function assertLength(arg: Value): asserts arg is Length {
    console.assert(arg instanceof Length);
}

export function isPercentage(arg: Value): arg is Percentage {
    return arg instanceof Percentage;
}

export function isLength(arg: Value): arg is Length {
    return arg instanceof Length;
}

export function isString(arg: Value): arg is StringValue {
    return arg instanceof StringValue;
}

export function isAngle(arg: Value): arg is Angle {
    return arg instanceof Angle;
}

export function isTime(arg: Value): arg is Time {
    return arg instanceof Time;
}

export function isFrequency(arg: Value): arg is Frequency {
    return arg instanceof Frequency;
}

export function isArray(arg: Value): arg is ArrayValue {
    return arg instanceof ArrayValue;
}

export function isZero(arg: Value): arg is NumberValue {
    return arg instanceof NumberValue && arg.value === 0;
}

export function asInteger(value: Value, defaultValue?: number): number {
    if (isNumber(value)) {
        return Math.round(value.value);
    }
    if (typeof defaultValue === 'undefined') assertNumber(value);
    return defaultValue;
}

export function asDecimalRatio(
    value: Value,
    defaultValue?: number | null
): number {
    if (isPercentage(value)) {
        return value.value / 100;
    } else if (isNumber(value)) {
        return value.value;
    }

    if (typeof defaultValue === 'undefined') assertNumberOrPercentage(value);
    return defaultValue;
}

export function asDegree(value: Value): number {
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
    baseUnits?: BaseLengthUnits
): number {
    // See https://drafts.csswg.org/css-values-3/#lengths
    if (typeof value !== 'number') {
        console.assert(unit === 'multi');
        let pxSum = value['px'] ?? 0;
        Object.keys(value).forEach((x) => {
            const inPx = asPx(this.value[x], x as LengthUnit, baseUnits);
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
        base = Math.min(baseUnits?.vh ?? NaN, baseUnits?.vw ?? NaN);
    } else if (unit === 'vmax') {
        base = Math.max(baseUnits?.vh ?? NaN, baseUnits?.vw ?? NaN);
    } else {
        base = baseUnits?.[unit] ?? NaN;
    }

    return base * value;
}

export function asPercent(value: Value): number {
    if (isPercentage(value)) {
        return value.value / 100;
    }
    assertNumber(value);
    return value.value;
}

export function asString(value: Value, defaultValue: string): string {
    if (!isString(value)) {
        return defaultValue;
    }
    return value.value;
}

export function compareValue(a: Value, b: Value): number {
    // @todo: compare strings (asCanonicalString())
    return b.canonicalScalar() - a.canonicalScalar();
}

export function promoteToMulti(value: Length | NumberValue): Length {
    if (isNumber(value)) {
        return new Length({ px: value.value }, 'multi');
    }
    if (value.unit === 'multi') return value;

    const newValue: MultiLength = {};
    newValue[value.unit] = value.value;

    return new Length(newValue, 'multi');
}

export function scaleLength(arg1: Length, arg2?: Value): ArrayValue {
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
        scale = scaleName.split(':').map((x) => parseFloat(x));
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
