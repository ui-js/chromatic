const colorName = require('color-name');
const chroma = require('chroma-js');
import {
    NumberValue,
    StringValue,
    Value,
    ValueType,
    clampByte,
    ArrayValue,
    isAngle,
    isNumber,
    isPercentage,
    assertNumber,
    asDecimalRatio,
    asDegree,
    asInteger,
    asPercent,
    asString,
} from './value';

function asDecimalByte(value: Value): number {
    if (isPercentage(value)) {
        return Math.round((255 * value.value) / 100);
    }
    assertNumber(value);
    return Math.round(value.value);
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

export class Color extends Value {
    r?: number; /* [0..255] */
    g?: number; /* [0..255] */
    b?: number; /* [0..255] */
    l?: number;
    h?: number; /* [0..360] */
    s?: number;
    a: number; /* [0..1] */
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

export function isColor(arg: Value): arg is Color {
    return arg instanceof Color;
}

const whiteColor = new Color('#fff');
const blackColor = new Color('#000');

function mixColor(c1: Value, c2: Value, weight: Value, model?: Value): Color {
    // @todo: support additional color models. See color-convert npm module.
    const modelName = asString(model, 'hsl').toLowerCase();
    const color1 = asColor(c1);
    if (!color1) return undefined;
    const color2 = asColor(c2);
    if (!color2) return color1;

    const w = asDecimalRatio(weight, 0.5);

    let alpha = typeof color2.a === 'number' ? color2.a : 1.0;
    alpha =
        alpha + ((typeof color1.a === 'number' ? color2.a : 1.0) - alpha) * w;
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
    }
}

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
        c2 = asColor(arg1);
        c3 = new Color({
            h: c2.h >= 60 && c2.h <= 240 ? c2.h + 30 : c2.h - 30,
            s: c2.s,
            l: 0.35,
        });
        n = asInteger(arg2, 10);
        const mode = new StringValue('rgb');
        return new ArrayValue([
            mixColor(c1, c2, new NumberValue(0.12), mode),
            mixColor(c1, c2, new NumberValue(0.3), mode),
            mixColor(c1, c2, new NumberValue(0.5), mode),
            mixColor(c1, c2, new NumberValue(0.7), mode),
            mixColor(c1, c2, new NumberValue(0.85), mode),
            c2,
            mixColor(c3, c2, new NumberValue(0.85), mode),
            mixColor(c3, c2, new NumberValue(0.7), mode),
            mixColor(c3, c2, new NumberValue(0.5), mode),
            mixColor(c3, c2, new NumberValue(0.2), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.06), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.12), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.18), mode),
            // FUNCTIONS.darken(c2, new NumberValue(0.24), mode),
        ]);
    }

    if (!c1 || !c2 || !c3) return undefined;

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

/* Functions that take a "color" argument list */
/* Which includes either space or comma as a separator, and "/" for alpha */
export const COLOR_ARGUMENTS_FUNCTIONS = [
    'rgb',
    'rgba',
    'hsl',
    'hsla',
    'hwb',
    'grey',
    'lab',
];

export const COLOR_FUNCTION_ARGUMENTS = {
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

export const COLOR_FUNCTIONS = {
    /** r, g, b: a value as a number in [0...255] or as a percentage. a: a number in [0...1] or a percentage */
    rgb: (r: Value, g: Value, b: Value, a?: Value): Color =>
        new Color({
            r: asDecimalByte(r),
            g: asDecimalByte(g),
            b: asDecimalByte(b),
            a: asDecimalRatio(a, 1.0),
        }),
    hsl: (h: Value, s: Value, l: Value, a?: Value): Color =>
        new Color({
            h: asDegree(h),
            s: asPercent(s),
            l: asPercent(l),
            a: asDecimalRatio(a, 1.0),
        }),
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
    rgba: (r, g, b, a): Value =>
        new Color({
            r: asDecimalByte(r),
            g: asDecimalByte(g),
            b: asDecimalByte(b),
            a: asDecimalRatio(a, 1.0),
        }),
    hsla: (h, s, l, a): Value =>
        new Color({
            h: asDegree(h),
            s: asPercent(s),
            l: asPercent(l),
            a: asDecimalRatio(a, 1.0),
        }),
    tint: (c: Value, w: Value): Color =>
        mixColor(whiteColor, c, w ?? new NumberValue(0.1)) as Color,
    shade: (c: Value, w: Value): Color =>
        mixColor(blackColor, c, w ?? new NumberValue(0.1)) as Color,
};

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
