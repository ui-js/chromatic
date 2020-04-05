const chroma = require('chroma-js');
import {
    NumberValue,
    Color,
    StringValue,
    Value,
    clampByte,
    ArrayValue,
    isAngle,
    isNumber,
    isPercentage,
    assertNumber,
    asDecimalRatio,
    asColor,
    asDegree,
    asInteger,
    asPercent,
    asString,
    hslToRgb,
} from './value';
import { getSuggestion } from './utils';
import { throwError, ErrorCode } from './errors';

function clampUnit(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}

function asDecimalByte(value: Value): number {
    if (isPercentage(value)) {
        return Math.round((255 * value.value) / 100);
    }
    assertNumber(value);
    return Math.round(value.value);
}

/**
 * L: 0..100
 * a: -128..128
 * b: -128..128
 */

function labToRgb(
    L: number,
    aStar: number,
    bStar: number
): { r: number; g: number; b: number } {
    L = Math.max(0, Math.min(100, L));
    aStar = Math.max(-128, Math.min(128, aStar));
    bStar = Math.max(-128, Math.min(128, bStar));
    let y = (L + 16) / 116;
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

/**
 * r: 0..255
 * g: 0..255
 * b: 0..255
 * L: 0..100
 * a: -128..128
 * b: -128..128
 */
function rgbToLab(
    r: number,
    g: number,
    b: number
): { L: number; a: number; b: number } {
    r = clampByte(r) / 255;
    g = clampByte(g) / 255;
    b = clampByte(b) / 255;

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

function rgbToXyz(
    r: number,
    g: number,
    b: number
): { x: number; y: number; z: number } {
    return {
        x: 0.430574 * r + 0.34155 * g + 0.178325 * b,
        y: 0.222015 * r + 0.706655 * g + 0.07133 * b,
        z: 0.020183 * r + 0.129553 * g + 0.93918 * b,
    };
}

function xyzToRgb(
    x: number,
    y: number,
    z: number
): { r: number; g: number; b: number } {
    return {
        r: 3.063218 * x - 1.393325 * y - 0.475802 * z,
        g: -0.969243 * x + 1.875966 * y + 0.041555 * z,
        b: 0.067871 * x - 0.228834 * y + 1.069251 * z,
    };
}

const colorDeficiencyTable = {
    protanopia: { cpu: 0.735, cpv: 0.265, am: 1.273463, ayi: -0.073894 },
    deuteranopia: { cpu: 1.14, cpv: -0.14, am: 0.968437, ayi: 0.003331 },
    tritanopia: { cpu: 0.171, cpv: -0.003, am: 0.062921, ayi: 0.292119 },
};

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

function getHPrimeFn(x, y): number {
    if (x === 0 && y === 0) return 0;
    const hueAngle = (Math.atan2(x, y) * 180) / Math.PI;
    return hueAngle >= 0 ? hueAngle : hueAngle + 360;
}

/**
 * Measure the distance between two colors.
 * Colors that have a deltaE of less than 2 are difficult to distinguish.
 *
 *  Uses the CIE-2000 algorithm which correct for perceptual uniformity.
 *  http://en.wikipedia.org/wiki/Color_difference#CIEDE2000
 *  http://www2.ece.rochester.edu/~gsharma/ciede2000/ciede2000noteCRNA.pdf
 */

export function getDeltaE(c1: Color, c2: Color): number {
    const kSubL = 1;
    const kSubC = 1;
    const kSubH = 1;

    const x1 = rgbToLab(c1.r, c1.g, c1.b);
    const x2 = rgbToLab(c2.r, c2.g, c2.b);

    const deltaLPrime = x2.L - x1.L;
    const LBar = (x1.L + x2.L) / 2;

    const C1 = Math.sqrt(x1.a * x1.a + x1.b * x1.b);
    const C2 = Math.sqrt(x2.a * x2.a + x2.b * x2.b);
    const CBar = (C1 + C2) / 2;

    const aPrime =
        1 -
        Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7)));
    const aPrime1 = x1.a + (x1.a / 2) * aPrime;
    const aPrime2 = x2.a + (x2.a / 2) * aPrime;

    const CPrime1 = Math.sqrt(aPrime1 * aPrime1 + x1.b * x1.b);
    const CPrime2 = Math.sqrt(aPrime2 * aPrime2 + x2.b * x2.b);
    const CBarPrime = (CPrime1 + CPrime2) / 2;
    const deltaCPrime = CPrime2 - CPrime1;
    const LBarPrime = Math.pow(LBar - 50, 2);
    const S_L = 1 + (0.015 * LBarPrime) / Math.sqrt(20 + LBarPrime);
    const S_C = 1 + 0.045 * CBarPrime;

    const hPrime1 = getHPrimeFn(x1.b, aPrime1);
    const hPrime2 = getHPrimeFn(x2.b, aPrime2);

    const deltahPrime =
        C1 === 0 || C2 === 0
            ? 0
            : Math.abs(hPrime1 - hPrime2) <= 180
            ? hPrime2 - hPrime1
            : hPrime2 <= hPrime1
            ? hPrime2 - hPrime1 + 360
            : hPrime2 - hPrime1 - 360;
    const deltaHPrime =
        2 *
        Math.sqrt(CPrime1 * CPrime2) *
        Math.sin((deltahPrime * Math.PI) / 180 / 2);
    const HBarPrime =
        Math.abs(hPrime1 - hPrime2) > 180
            ? (hPrime1 + hPrime2 + 360) / 2
            : (hPrime1 + hPrime2) / 2;
    const T =
        1 -
        0.17 * Math.cos((Math.PI / 180) * (HBarPrime - 30)) +
        0.24 * Math.cos((Math.PI / 180) * (2 * HBarPrime)) +
        0.32 * Math.cos((Math.PI / 180) * (3 * HBarPrime + 6)) -
        0.2 * Math.cos((Math.PI / 180) * (4 * HBarPrime - 63));
    const S_H = 1 + 0.015 * CBarPrime * T;
    const R_T =
        -2 *
        Math.sqrt(
            Math.pow(CBarPrime, 7) / (Math.pow(CBarPrime, 7) + Math.pow(25, 7))
        ) *
        Math.sin(
            (Math.PI / 180) *
                (60 * Math.exp(-Math.pow((HBarPrime - 275) / 25, 2)))
        );
    const lightness = deltaLPrime / (kSubL * S_L);
    const chroma = deltaCPrime / (kSubC * S_C);
    const hue = deltaHPrime / (kSubH * S_H);

    return Math.sqrt(
        lightness * lightness + chroma * chroma + hue * hue + R_T * chroma * hue
    );
}

export function filterColor(c: Color, filter: string): Color {
    // https://ixora.io/projects/colorblindness/color-blindness-simulation-research/
    // https://github.com/hx2A/ColorBlindness/blob/master/src/colorblind/ColorUtilities.java
    switch (filter) {
        case 'none':
            return c;

        case 'grayscale':
            const lab = rgbToLab(c.r, c.g, c.b);
            return new Color({
                a: c.a,
                ...labToRgb(lab.L, 0, 0),
            });

        case 'protanopia':
        case 'deuteranopia':
        case 'tritanopia': {
            const gamma = 2.2;
            // (x, y, z) in [0..1]^3
            const { x, y, z } = rgbToXyz(
                Math.pow(c.r / 255, gamma),
                Math.pow(c.g / 255, gamma),
                Math.pow(c.b / 255, gamma)
            );
            const u = x + y + z != 0 ? x / (x + y + z) : 0;
            const v = x + y + z != 0 ? y / (x + y + z) : 0;
            const nx = (y * 0.312713) / 0.329016;
            const nz = (y * 0.358271) / 0.329016;

            let clm: number;
            if (u < colorDeficiencyTable[filter].cpu) {
                clm =
                    (colorDeficiencyTable[filter].cpv - v) /
                    (colorDeficiencyTable[filter].cpu - u);
            } else {
                clm =
                    (v - colorDeficiencyTable[filter].cpv) /
                    (u - colorDeficiencyTable[filter].cpu);
            }
            const clyi = v - u * clm;
            const dU =
                (colorDeficiencyTable[filter].ayi - clyi) /
                (clm - colorDeficiencyTable[filter].am);
            const dV = clm * dU + clyi;

            const xPrime = (dU * y) / dV;
            const zPrime = ((1 - (dU + dV)) * y) / dV;

            const dX = nx - xPrime;
            const dZ = nz - zPrime;
            const { r: dr, g: dg, b: db } = xyzToRgb(dX, 0, dZ);
            let { r: rPrime, g: gPrime, b: bPrime } = xyzToRgb(
                xPrime,
                y,
                zPrime
            );
            const deltaR = rPrime ? ((rPrime < 0 ? 0 : 1) - rPrime) / dr : 0;
            const deltaG = gPrime ? ((gPrime < 0 ? 0 : 1) - gPrime) / dg : 0;
            const deltaB = bPrime ? ((bPrime < 0 ? 0 : 1) - bPrime) / db : 0;

            const adjustment = Math.max(
                deltaR > 1 || deltaR < 0 ? 0 : deltaR,
                deltaG > 1 || deltaG < 0 ? 0 : deltaG,
                deltaB > 1 || deltaB < 0 ? 0 : deltaB
            );
            rPrime += adjustment * dr;
            gPrime += adjustment * dg;
            bPrime += adjustment * db;
            return new Color({
                r: 255 * Math.pow(clampUnit(rPrime), 1 / gamma),
                g: 255 * Math.pow(clampUnit(gPrime), 1 / gamma),
                b: 255 * Math.pow(clampUnit(bPrime), 1 / gamma),
            });
        }
    }
    return undefined;
}

export function getSimilarColors(
    target: Color,
    colors: { name: string; color: Color }[],
    filter?: string
): { name: string; color: Color; deltaE: number }[] {
    const result = [];

    const filteredTarget = filterColor(target, filter);

    colors.forEach((x) => {
        if (!target.equals(x.color)) {
            // Use an increased threshold (6) when applying a filter.
            // Seems to produce more accurate results for
            // confusing colors for color deficient people.
            const diff = filter
                ? getDeltaE(filteredTarget, filterColor(x.color, filter)) / 3
                : getDeltaE(target, x.color);
            if (diff < 2) {
                result.push({
                    name: x.name,
                    color: x.color,
                    deltaE: diff,
                });
            }
        }
    });
    return result.length === 0
        ? null
        : result.sort((a, b) => a.deltaE - b.deltaE);
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
        // If a single color is provided, we'll calculate a color ramp
        // with the provided color as the midpoint, and black and white
        // as the extremes.
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
                    : c2.l - 0.2 + 0.1 * Math.sin(4 * Math.PI * (c2.h / 360)),
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

    return new ArrayValue(colors.map((x) => new Color(x)));
}

/* Functions that take a "color" argument list */
/* Which includes either space or comma as a separator, and "/" for alpha */
export const COLOR_ARGUMENTS_FUNCTIONS = [
    'rgb',
    'rgba',
    'hsl',
    'hsla',
    'hwb',
    'gray',
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
    filter: 'color, string',

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
            ...labToRgb(
                100 * asPercent(l),
                asDecimalRatio(a),
                asDecimalRatio(b)
            ),
        });
    },
    gray: (g: Value, alpha: Value): Color => {
        return new Color({
            a: asDecimalRatio(alpha, 1.0),
            ...labToRgb(100 * asPercent(g), 0, 0),
        });
    },
    filter: (c: Color, filterValue: StringValue): Color => {
        const filterName = asString(filterValue, 'none').toLowerCase();
        const result = filterColor(
            c,
            asString(filterValue, 'none').toLowerCase()
        );
        if (!result) {
            throwError(
                ErrorCode.InvalidArgument,
                'filter()',
                `"${filterName}"`,
                getSuggestion(filterName, [
                    'none',
                    'grayscale',
                    'protanopia',
                    'deuteranopia',
                    'tritanopia',
                ])
            );
        }

        return result;
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
        } else {
            throwError(
                ErrorCode.InvalidArgument,
                'mix()',
                `"${modelName}"`,
                getSuggestion(modelName, ['hsl', 'lab', 'rgb'])
            );
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
