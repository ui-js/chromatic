const colorName = require('color-name');

import { getSuggestion } from './utils';

// @todo: multi-units for relative lengths
// @todo: convert frequency and time (1/s -> Hz)
// @todo: have a base-font-size property in the tokenfile as well (under global: )

export type ValueType =
    | 'string'
    | 'float'
    | 'percentage'
    | 'angle'
    | 'color'
    | 'length'
    | 'time'
    | 'frequency';

export interface ValueParserOptions {
    'base-font-size'?: number;
    aliasResolver?: (name: string) => Value;
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
    hue = hue / 60.0;
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

/*
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

    return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
*/

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

export interface Value {
    css: () => string;
    type: () => ValueType;
    canonicalScalar: () => number;
}

class Percentage implements Value {
    value: number; /* [0..100] */
    constructor(from: number) {
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

class Angle implements Value {
    value: number;
    unit: AngleUnit;
    constructor(from: number, unit: AngleUnit) {
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

class Length implements Value {
    value: number;
    unit: LengthUnit;
    constructor(from: number, unit: LengthUnit) {
        this.value = from;
        this.unit = unit;
    }
    css(): string {
        return roundTo(this.value, 2) + this.unit;
    }
    type(): ValueType {
        return 'length';
    }
    canonicalScalar(): number {
        return asPx(this);
    }
}
class Time implements Value {
    value: number;
    unit: TimeUnit;
    constructor(from: number, unit: TimeUnit) {
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

class Frequency implements Value {
    value: number;
    unit: FrequencyUnit;
    constructor(from: number, unit: FrequencyUnit) {
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

class Float implements Value {
    value: number;
    constructor(from: number) {
        this.value = from;
    }
    css(): string {
        return Number(this.value).toString();
    }
    type(): ValueType {
        return 'float';
    }
    canonicalScalar(): number {
        return this.value;
    }
}

export class StringValue implements Value {
    value: string;
    constructor(from: string) {
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
}

export class Color implements Value {
    r?: number; /* [0..255] */
    g?: number; /* [0..255] */
    b?: number; /* [0..255] */
    l?: number;
    h?: number; /* [0..360] */
    s?: number;
    a: number; /* [0..1] */
    constructor(from: object | string) {
        if (typeof from === 'string') {
            if (from.toLowerCase() === 'transparent') {
                [this.r, this.g, this.b, this.a] = [0, 0, 0, 0];
                [this.h, this.s, this.l] = [0, 0, 0];
            } else {
                const rgb = parseHex(from) || parseColorName(from);
                if (!rgb) throw new Error('Expected a color');
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
            } else if (typeof this.h === 'number') {
                // HSL data
                Object.assign(this, hslToRgb(this.h, this.s, this.l));
            } else {
                throw new Error('Expected a color');
            }
        }
        if (typeof this.a !== 'number') {
            this.a = 1.0;
        }
    }
    type(): ValueType {
        return 'color';
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
        return `rgb(${this.r}, ${this.g}, ${this.b}${
            this.a < 1.0 ? ', ' + Number(100 * this.a).toFixed(0) + '%' : ''
        })`;
    }
    hsl(): string {
        return `hsl(${this.h}deg, ${this.s}%, ${this.l}%, ${
            this.a < 1.0 ? ', ' + Number(100 * this.a).toFixed(0) + '%' : ''
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
}

function isFloat(arg): arg is Float {
    return arg instanceof Float;
}

function isPercentage(arg): arg is Percentage {
    return arg instanceof Percentage;
}

function isLength(arg): arg is Length {
    return arg instanceof Length;
}

function isString(arg): arg is StringValue {
    return arg instanceof StringValue;
}

function isAngle(arg): arg is Angle {
    return arg instanceof Angle;
}

function isTime(arg): arg is Time {
    return arg instanceof Time;
}

function isFrequency(arg): arg is Frequency {
    return arg instanceof Frequency;
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
    if (isFloat(value)) {
        return Math.round(value.value);
    }
    throw new Error('Expected a number or percentage');
}

function asDecimalRatio(value: Value, defaultValue?: number | null): number {
    if (isPercentage(value)) {
        return value.value / 100;
    } else if (isFloat(value)) {
        return value.value;
    }

    if (typeof defaultValue === 'undefined')
        throw new Error('Expected a number or percentage.');
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
        throw new Error(`Unknown unit "${value.unit}"`);
    } else if (isFloat(value)) {
        // Degree is the canonical unit for angles
        return value.value;
    }
    throw new Error('Expected an angle.');
}

function asPx(
    value: Value,
    defaultValue?: number,
    options?: ValueParserOptions
): number {
    // See https://drafts.csswg.org/css-values-3/#lengths
    if (isLength(value)) {
        if (value.unit === 'px') {
            return value.value;
        } else if (value.unit === 'cm') {
            return (value.value * 96.0) / 2.54;
        } else if (value.unit === 'mm') {
            return (value.value * 96.0) / 25.4;
        } else if (value.unit === 'Q') {
            return (value.value * 96.0) / 2.54 / 40.0;
        } else if (value.unit === 'in') {
            return value.value * 96.0;
        } else if (value.unit === 'pc') {
            return value.value * 16.0;
        } else if (value.unit === 'pt') {
            return (value.value * 96.0) / 72.0;
        } else if (value.unit === 'rem' && options['base-font-size']) {
            return value.value * options['base-font-size'];
        } else {
            if (/^(rem|em|ex|ch|vw|vh|vmin|vmax)/.test(value.unit)) {
                throw new Error(
                    `Relative unit "${value.unit}" cannot be evaluated. Use an absolute unit (px, pt, etc...)`
                );
            } else {
                throw new Error(`Unknown unit "${value.unit}"`);
            }
        }
    } else if (isFloat(value)) {
        // Px is the canonical unit for dimensions
        return value.value;
    }
    if (typeof defaultValue === 'undefined') {
        throw new Error('Expected a length.');
    }
    return defaultValue;
}

function asPercent(value: Value): number {
    if (isPercentage(value)) {
        return value.value / 100;
    }
    if (isFloat(value)) {
        return value.value;
    }
    throw new Error('Expected a percentage or a float.');
}

function asString(value: Value, defaultValue?: string): string {
    if (!isString(value)) {
        if (typeof defaultValue === 'undefined')
            throw new Error('Expected a string.');
        return defaultValue;
    }
    return value.value;
}

function compareValue(a: Value, b: Value): number {
    // @todo: compare strings (asCanonicalString())
    return b.canonicalScalar() - a.canonicalScalar();
}

const whiteColor = new Color('#fff');
const blackColor = new Color('#000');

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
        const modelName = asString(model, 'rgb').toLowerCase();
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
                r: color2.r + (color1.r - color2.r) * w,
                g: color2.g + (color1.g - color2.g) * w,
                b: color2.b + (color1.b - color2.b) * w,
                a: alpha,
            });
        } else if (modelName === 'hsl') {
            return new Color({
                h: color2.h + (color1.h - color2.h) * w,
                s: color2.s + (color1.s - color2.s) * w,
                l: color2.l + (color1.l - color2.l) * w,
                a: alpha,
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
            if (!v || (!isAngle(v) && !isFloat(v))) {
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

        if (!baseColor) throw new Error('"contrast()" requires a color');

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
        FUNCTIONS.mix(whiteColor, c, w ?? new Float(0.1)) as Color,
    shade: (c: Value, w: Value): Color =>
        FUNCTIONS.mix(blackColor, c, w ?? new Float(0.1)) as Color,
};

/* Functions that take a "color" argument list */
/* Which includes either space or comma as a separator, and "/" for alpha */
const colorFunctions = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'grey', 'lab'];

const FUNCTION_ARGUMENTS = {
    calc: 'any',
    rgb:
        'float|percentage, float|percentage, float|percentage,float|percentage|none',
    rgba:
        'float|percentage, float|percentage, float|percentage,float|percentage|none',
    hsl:
        'float|angle, float|percentage, float|percentage, float|percentage|none',
    hsla:
        'float|angle, float|percentage, float|percentage, float|percentage|none',
    hsv:
        'float|angle, float|percentage, float|percentage, float|percentage|none',
    hwb:
        'float|angle, float|percentage, float|percentage, float|percentage|none',
    // lab: 'float|percentage, float, float, float|percentage|none',
    gray: 'float|percentage, float|percentage|none',
    min: 'any, any',
    max: 'any, any',
    clamp: 'any, any, any',
    mix: 'color, color, float|percentage|none, string|none',
    saturate: 'color, float|percentage|none',
    desaturate: 'color, float|percentage|none',
    lighten: 'color, float|percentage|none',
    darken: 'color, float|percentage|none',
    rotateHue: 'color, angle|float|none',
    complement: 'color',
    contrast: 'color, color|none, color|none',

    tint: 'color, float|percentage|none',
    shade: 'color, float|percentage|none',
};

function validateArguments(fn: string, args: any[]): void {
    const expectedArguments = FUNCTION_ARGUMENTS[fn]
        ?.split(',')
        .map(x => x.trim());
    if (expectedArguments) {
        expectedArguments.forEach((x: string, i: number) => {
            const types = x.split('|').map(x => x.trim());

            if (!types.includes('none') && !args[i]) {
                throw new Error(
                    `Missing argument ${i +
                        1} of \`${fn}\`. Expected \`${types.join(', ')}\`.`
                );
            }

            if (
                args[i] &&
                !types.includes('any') &&
                !types.includes(args[i]?.type())
            ) {
                throw new Error(
                    `Expected argument ${i +
                        1} of \`${fn}\` to be \`${types.join(', ')}\`.`
                );
            }
        });
        if (args.length > expectedArguments.length) {
            throw new Error(
                `Too many arguments for \`${fn}(${expectedArguments.join(
                    ', '
                )})\`.`
            );
        }
    }
    if (args.every(x => typeof x.type === 'function')) {
        console.log('looks legit');
    } else {
        console.error('seems fishy');
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
        unit = this.match(/^(kHz|Hz)/);
        if (unit) {
            return new Frequency(num, unit as FrequencyUnit);
        }
        return new Float(num);
    }

    parseLiteral(): Value {
        let result: Value;
        const saveIndex = this.index;

        const num = this.match(/^([0-9]*\.[0-9]+|\.?[0-9]+)/);
        if (num) {
            result = this.parseUnit(parseFloat(num));
        }

        if (!result && this.match('{')) {
            const identifier = this.match(/^([a-zA-Z0-9\._-]+)/);
            if (identifier) {
                result =
                    this.options?.aliasResolver(identifier) ||
                    new StringValue('{' + identifier + '}');
            }
            this.match('}');
        }

        if (!result && this.match('"')) {
            // It's a string
            let s = '';
            while (this.s[this.index] !== '"' && !this.isEOF()) {
                if (this.s[this.index] === '\\') {
                    // Escape character
                    s += this.s[this.index + 1];
                    this.index += 2;
                } else {
                    s += this.s[this.index];
                    this.index += 1;
                }
            }

            if (this.isEOF()) {
                throw new Error("Expected '\"'");
            }
            this.match('"');
            return new StringValue(s);
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
                throw new Error(`Syntax error in argument list`);
            }
            result.push(argument);
            this.match(/^(\s*,?|\s+)/);
        }
        if (this.isEOF()) {
            throw new Error('Missing closing ")"');
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
                    throw new Error(
                        `Unknown function "${fn}"` +
                            getSuggestion(fn, FUNCTIONS)
                    );
                }
            } else {
                const args = colorFunctions.includes(fn)
                    ? this.parseColorArguments()
                    : this.parseArguments();
                if (args) {
                    validateArguments(fn, args);
                    return FUNCTIONS[fn](...args);
                } else {
                    throw new Error(
                        `Syntax error when calling function "${fn}"`
                    );
                }
            }
        }
        // Backtrack
        this.index = saveIndex;
        return undefined;
    }

    parseProduct(): Value {
        const lhs =
            this.parseCall() || this.parseGroup() || this.parseLiteral();
        if (!lhs) return lhs;

        const saveIndex = this.index;

        this.skipWhiteSpace();

        const op = this.match(/^([*|/])/);
        if (!op) {
            this.index = saveIndex;
        } else {
            // Multiplication or division
            this.skipWhiteSpace();
            const rhs = this.parseProduct();

            if (!rhs) throw new Error(`Expected right operand after "${op}"`);
            // Type combination rules (for * AND /)
            // ---
            // num * num            -> num
            // num * angle          -> angle
            // num * percent        -> percent
            // num * length         -> length
            // Other combinations are invalid, but division of two
            // values of the same type is valid (and yields a unitless number)
            if (isFloat(rhs)) {
                if (isFloat(lhs)) {
                    return new Float(
                        op === '*'
                            ? lhs.value * rhs.value
                            : lhs.value / rhs.value
                    );
                } else if (isPercentage(lhs)) {
                    return new Percentage(
                        (op === '*'
                            ? asPercent(lhs) * rhs.value
                            : asPercent(lhs) / rhs.value) * 100
                    );
                } else if (isLength(lhs)) {
                    return new Length(
                        op === '*'
                            ? lhs.value * rhs.value
                            : lhs.value / rhs.value,
                        lhs.unit
                    );
                } else if (isAngle(lhs)) {
                    return new Angle(
                        op === '*'
                            ? lhs.value * rhs.value
                            : lhs.value / rhs.value,
                        lhs.unit
                    );
                } else if (isFrequency(lhs)) {
                    return new Frequency(
                        op === '*'
                            ? lhs.value * rhs.value
                            : lhs.value / rhs.value,
                        lhs.unit
                    );
                } else if (isTime(lhs)) {
                    return new Time(
                        op === '*'
                            ? lhs.value * rhs.value
                            : lhs.value / rhs.value,
                        lhs.unit
                    );
                }
            } else {
                return new Float(
                    op === '*'
                        ? lhs.canonicalScalar() * rhs.canonicalScalar()
                        : lhs.canonicalScalar() / rhs.canonicalScalar()
                );
            }
            throw new Error('Unexpected operand type');
        }

        return lhs;
    }

    parseTerm(): Value {
        const lhs = this.parseProduct();

        const op = {
            '+': (a: string, b: string): string => a + b,
            '-': (a: number, b: number): number => a - b,
        }[this.match(/^\s*([+\-])\s*/)];
        if (op) {
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
            const rhs = this.parseProduct();

            if (!rhs) throw new Error(`Expected right operand`);

            if (!lhs) {
                // Unary operator
                if (isPercentage(rhs)) {
                    return new Percentage(100 * op(0, asPercent(rhs)));
                }
                if (isFloat(rhs)) {
                    return new Float(op(0, rhs.value));
                }
                if (isAngle(rhs)) {
                    return new Angle(op(0, rhs.value), rhs.unit);
                }
                if (isLength(rhs)) {
                    return new Length(op(0, rhs.value), rhs.unit);
                }

                throw new Error(
                    `Operator cannot be applied to "${rhs.type()}"`
                );
            } else {
                // Binary operator
                if (isString(lhs) || isString(rhs)) {
                    return new StringValue(op(lhs.css(), rhs.css()));
                }
                if (isPercentage(lhs) && isPercentage(rhs)) {
                    return new Percentage(
                        100 * op(asPercent(lhs), asPercent(rhs))
                    );
                }
                if (isFloat(lhs) && isFloat(rhs)) {
                    return new Float(op(lhs.value, rhs.value));
                }
                if (isAngle(lhs) && isAngle(rhs)) {
                    if (lhs.unit === rhs.unit) {
                        return new Angle(op(lhs.value, rhs.value), lhs.unit);
                    }
                    return new Angle(op(asDegree(lhs), asDegree(rhs)), 'deg');
                }
                if (isLength(lhs) && isLength(rhs)) {
                    if (lhs.unit === rhs.unit) {
                        return new Length(op(lhs.value, rhs.value), lhs.unit);
                    }
                    return new Length(
                        op(
                            asPx(lhs, undefined, this.options),
                            asPx(rhs, undefined, this.options)
                        ),
                        'px'
                    );
                }
                throw new Error(
                    `Operator cannot be applied to "${lhs.type()}" and "${rhs.type()}"`
                );
            }
        }

        return lhs;
    }

    parseGroup(): Value {
        let result: Value;
        if (this.match('(')) {
            result = this.parseExpression();
            this.skipWhiteSpace();
            if (!this.match(')')) {
                throw new Error('Expected ")"');
            }
        }

        if (result && isFloat(result)) {
            // If the value of the group is a float
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
    value: string,
    options: ValueParserOptions = {}
): Value {
    const stream = new Stream(value, options);
    const result = stream.parseExpression();
    stream.skipWhiteSpace();
    if (!stream.isEOF()) {
        // There was some additional content that we couldn't parse.
        // Return 'undefined' to avoid partially parsing things
        // that shouldn't be. For example "3px red" should
        // be interpreted as a string, not as "3px".
        return undefined;
    }
    return result;
}
