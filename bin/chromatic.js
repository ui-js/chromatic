'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["NoError"] = 0] = "NoError";
    ErrorCode[ErrorCode["SyntaxError"] = 1] = "SyntaxError";
    ErrorCode[ErrorCode["UnexpectedOpenBracket"] = 2] = "UnexpectedOpenBracket";
    ErrorCode[ErrorCode["ExpectedCloseBracket"] = 3] = "ExpectedCloseBracket";
    ErrorCode[ErrorCode["ExpectedCloseCurlyBracket"] = 4] = "ExpectedCloseCurlyBracket";
    ErrorCode[ErrorCode["ExpectedOpenParen"] = 5] = "ExpectedOpenParen";
    ErrorCode[ErrorCode["ExpectedCloseParen"] = 6] = "ExpectedCloseParen";
    ErrorCode[ErrorCode["ExpectedQuote"] = 7] = "ExpectedQuote";
    ErrorCode[ErrorCode["UnknownToken"] = 8] = "UnknownToken";
    ErrorCode[ErrorCode["UnknownUnit"] = 9] = "UnknownUnit";
    ErrorCode[ErrorCode["UnknownFunction"] = 10] = "UnknownFunction";
    ErrorCode[ErrorCode["MissingArgument"] = 11] = "MissingArgument";
    ErrorCode[ErrorCode["ExpectedArgument"] = 12] = "ExpectedArgument";
    ErrorCode[ErrorCode["TooManyArguments"] = 13] = "TooManyArguments";
    ErrorCode[ErrorCode["InvalidArgument"] = 14] = "InvalidArgument";
    ErrorCode[ErrorCode["ExpectedOperand"] = 15] = "ExpectedOperand";
    ErrorCode[ErrorCode["InvalidOperand"] = 16] = "InvalidOperand";
    ErrorCode[ErrorCode["InvalidUnaryOperand"] = 17] = "InvalidUnaryOperand";
    ErrorCode[ErrorCode["ExpectedIntegerIndex"] = 18] = "ExpectedIntegerIndex";
    ErrorCode[ErrorCode["CircularDefinition"] = 19] = "CircularDefinition";
    ErrorCode[ErrorCode["UnexpectedTokensArray"] = 20] = "UnexpectedTokensArray";
    ErrorCode[ErrorCode["UnexpectedTokensType"] = 21] = "UnexpectedTokensType";
    ErrorCode[ErrorCode["InvalidTokenName"] = 22] = "InvalidTokenName";
    ErrorCode[ErrorCode["InvalidTokenValue"] = 23] = "InvalidTokenValue";
    ErrorCode[ErrorCode["InconsistentTokenType"] = 24] = "InconsistentTokenType";
    ErrorCode[ErrorCode["UnknownFormat"] = 25] = "UnknownFormat";
    ErrorCode[ErrorCode["UnknownValueFormatter"] = 26] = "UnknownValueFormatter";
    ErrorCode[ErrorCode["UnknownNameFormatter"] = 27] = "UnknownNameFormatter";
})(ErrorCode || (ErrorCode = {}));
const ERRORS = {
    [ErrorCode.SyntaxError]: 'Syntax error',
    [ErrorCode.UnexpectedOpenBracket]: 'Unexpected `[`',
    [ErrorCode.ExpectedCloseBracket]: 'Expected `]`',
    [ErrorCode.ExpectedCloseCurlyBracket]: 'Expected `}`',
    [ErrorCode.ExpectedOpenParen]: 'Expected `(`',
    [ErrorCode.ExpectedCloseParen]: 'Expected `)`',
    [ErrorCode.ExpectedQuote]: 'Expected `"`',
    [ErrorCode.UnknownToken]: 'Unknown token `%1`%2',
    [ErrorCode.UnknownUnit]: 'Unknown unit `%1`',
    [ErrorCode.UnknownFunction]: 'Unknown function `%1`%2',
    [ErrorCode.MissingArgument]: 'Missing argument %1 of `%2` of type `%3`',
    [ErrorCode.ExpectedArgument]: 'Expected argument %1 of `%2` to be of type `%3`',
    [ErrorCode.TooManyArguments]: 'Too many arguments for function `%1(%2)`',
    [ErrorCode.InvalidArgument]: 'Invalid argument `%2` for function `%1`%3',
    [ErrorCode.ExpectedOperand]: 'Expected operand',
    [ErrorCode.InvalidOperand]: 'Invalid operand',
    [ErrorCode.InvalidUnaryOperand]: 'Invalid operand',
    [ErrorCode.CircularDefinition]: 'Circular definition of the "%1" token',
    [ErrorCode.UnexpectedTokensArray]: 'The "tokens" property is an array. It should be a key/value map of tokens.\n%1',
    [ErrorCode.UnexpectedTokensType]: 'The "tokens" property should be a key/value map of tokens.',
    [ErrorCode.InvalidTokenName]: 'Invalid token name "%1": it must only contain digits, letters, "_" and "-"',
    [ErrorCode.InvalidTokenValue]: 'The "%1" token is invalid. If using a YAML file, make sure RGB hex values are within quotes',
    [ErrorCode.InconsistentTokenType]: 'Inconsistent token type in valus of token "%1"',
    [ErrorCode.UnknownFormat]: 'Unknown format "%1"%2',
    [ErrorCode.UnknownValueFormatter]: 'Unknown value formatter "%1"%2',
    [ErrorCode.UnknownNameFormatter]: 'Unknown name formatter "%1"%2',
    [ErrorCode.ExpectedIntegerIndex]: 'Expected array index to be a number',
};
class SyntaxError extends Error {
    constructor(code, ...args) {
        super(ERRORS[code]);
        this.code = code;
        this.args = args;
    }
}
function throwErrorIf(condition, code, ...args) {
    if (condition)
        throwErrorWithContext(undefined, code, ...args);
}
function throwError(code, ...args) {
    throwErrorWithContext(undefined, code, ...args);
}
function throwErrorWithContext(context, code, ...args) {
    var _a;
    let message = '';
    if (process.env.TEST) {
        message = '[ERR] ' + ((_a = ErrorCode[code]) !== null && _a !== void 0 ? _a : code);
    }
    else {
        if (context)
            message = context.join('\n') + '\n';
        message += ERRORS[code];
        args.forEach((val, index) => {
            message = message.replace(new RegExp(`%${index + 1}`, 'g'), val);
        });
    }
    throw new Error(message);
}

const stringSimilarity = require('string-similarity');
function findClosestKey(key, o) {
    if (!key || !o)
        return '';
    let keys;
    if (o instanceof Map) {
        keys = Array.from(o.keys());
    }
    else if (Array.isArray(o)) {
        keys = o;
    }
    else {
        keys = Object.keys(o);
    }
    if (keys.length === 0)
        return '';
    const result = stringSimilarity.findBestMatch(key, keys);
    return result.bestMatch.rating > 0.1 ? result.bestMatch.target : '';
}
function getSuggestion(key, o) {
    const alt = findClosestKey(key, o);
    return alt ? `. Did you mean "${alt}"?` : '';
}

const DefaultFormatters = {
    nameFormatters: {
        camelcase: (name, theme) => (name + !theme ? '' : '.' + theme)
            .toLowerCase()
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase())
            .replace(/\s+/g, ''),
        kebabcase: (name, theme) => (name + !theme ? '' : '.' + theme)
            .match(/[A-Z]{2,}(?=[A-Z][a-z0-9]*|\b)|[A-Z]?[a-z0-9]*|[A-Z]|[0-9]+/g)
            .filter(Boolean)
            .map((x) => x.toLowerCase())
            .join('-'),
        uppercase: (name, theme) => (name + !theme ? '' : '.' + theme).toUpperCase(),
        lowercase: (name, theme) => (name + !theme ? '' : '.' + theme).toLowerCase(),
    },
    handlebarsHelpers: {
        'uppercase': (s) => s.toUpperCase(),
        'sanitizeCssPropertyName': (s) => s.replace(/[^a-zA-Z0-9_-]/g, '-'),
        'cssValue': (v) => { var _a; return (_a = v === null || v === void 0 ? void 0 : v.css()) !== null && _a !== void 0 ? _a : '[MISSING VALUE]'; },
        'remove-last-comma': function (context) {
            const lines = context.fn(this).split('\n');
            const lastCommaLine = lines.reduce((acc, v, idx) => (/,$/.test(v) ? idx : acc), -1);
            return lines
                .map((line, idx) => (idx !== lastCommaLine ? line : line.slice(0, -1)))
                .join('\n');
        },
        'comment': function (s, format = '/* */') {
            var _a, _b;
            if (typeof s !== 'string') {
                return this.comment;
            }
            if (!s)
                return '';
            if (typeof format !== 'string')
                format = '/* */';
            const prefix = (_b = (_a = format.match(/(\s*)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
            const suffix = format.slice(prefix.length);
            let [open, close] = suffix.split(' ');
            if (open === '/*' && close === '*/') {
                return (prefix +
                    '/* ' +
                    s.split('\n').join('\n' + prefix + ' * ') +
                    '\n' +
                    prefix +
                    ' */');
            }
            if (!close) {
                open = format.slice(prefix.length);
                close = '';
            }
            return (prefix + open + s.split('\n').join((close !== null && close !== void 0 ? close : '') + '\n' + prefix + open));
        },
    },
};

const DEFAULT_FILE_HEADER = `
This file was automatically generated by Chromatic.
Do not edit.
Generated ${new Date().toISOString()}
`;

const colorName = require('color-name');
function clampByte(v) {
    if (v < 0)
        return 0;
    if (v > 255)
        return 255;
    return Math.round(v);
}
class Value {
    constructor() {
        this.source = '';
    }
    css() {
        return '';
    }
    type() {
        return undefined;
    }
    canonicalScalar() {
        return 0;
    }
    getSource() {
        return this.source;
    }
    setSource(source) {
        this.source = source;
    }
    equals(v) {
        return (this.type() === v.type() && this.canonicalScalar() == v.canonicalScalar());
    }
}
function roundTo(num, precision) {
    return (Math.round(num * Math.pow(10, precision) + 1e-14) / Math.pow(10, precision));
}
class Percentage extends Value {
    constructor(from) {
        super();
        this.value = from;
    }
    css() {
        return roundTo(this.value, 2) + '%';
    }
    type() {
        return 'percentage';
    }
    canonicalScalar() {
        return this.value / 100;
    }
    equals(v) {
        if (isLength(v)) {
            const v1 = promoteToMulti(this);
            const v2 = promoteToMulti(v);
            return [...Object.keys(v1.value), ...Object.keys(v2.value)].every((x) => v1.value[x] === v2.value[x]);
        }
        return false;
    }
}
class Angle extends Value {
    constructor(from, unit) {
        super();
        this.value = from;
        this.unit = unit;
    }
    css() {
        return roundTo(this.value, 2) + this.unit;
    }
    type() {
        return 'angle';
    }
    canonicalScalar() {
        return asDegree(this);
    }
}
class Length extends Value {
    constructor(from, unit) {
        super();
        if (typeof from === 'number') {
            this.value = from;
            if (from === 0) {
                this.unit = 'px';
            }
            else {
                this.unit = unit;
            }
        }
        else if (typeof unit === 'undefined') {
            const nonZeroKeys = Object.keys(from).filter((x) => typeof from[x] === 'number' && from[x] !== 0);
            if (nonZeroKeys.length === 0) {
                this.value = 0;
                this.unit = 'px';
            }
            else if (nonZeroKeys.length === 1) {
                this.value = from[nonZeroKeys[0]];
                this.unit = nonZeroKeys[0];
            }
            else {
                this.value = from;
                this.unit = 'multi';
            }
        }
        else {
            this.value = from;
            this.unit = 'multi';
            console.assert(unit === 'multi');
        }
    }
    css() {
        if (typeof this.value === 'number') {
            return this.value === 0 || isNaN(this.value)
                ? Number(this.value).toString()
                : roundTo(this.value, 2) + this.unit;
        }
        const result = {};
        let units = Object.keys(this.value);
        if (units.length > 1) {
            let pxSum = 0;
            units.forEach((x) => {
                const inPx = asPx(this.value[x], x);
                if (!isNaN(inPx)) {
                    pxSum += inPx;
                }
                else if (x !== 'px') {
                    result[x] = this.value[x];
                }
            });
            if (pxSum !== 0) {
                result['px'] = pxSum;
            }
        }
        else {
            result[units[0]] = this.value[units[0]];
        }
        units = Object.keys(result);
        if (units.length === 1) {
            if (units[0] === 'px' && result['px'] === 0) {
                return '0';
            }
            return roundTo(result[units[0]], 2) + units[0];
        }
        return ('calc(' +
            units.map((x) => Number(result[x]).toString() + x).join(' + ') +
            ')');
    }
    type() {
        return 'length';
    }
    canonicalScalar() {
        return this.unit === 'multi' ? NaN : asPx(this.value, this.unit);
    }
}
class Time extends Value {
    constructor(from, unit) {
        super();
        this.value = from;
        this.unit = unit;
    }
    css() {
        return roundTo(this.value, 2) + this.unit;
    }
    type() {
        return 'time';
    }
    canonicalScalar() {
        return this.unit === 'ms' ? this.value / 1000 : this.value;
    }
}
class Frequency extends Value {
    constructor(from, unit) {
        super();
        this.value = from;
        this.unit = unit;
    }
    css() {
        return roundTo(this.value, 2) + this.unit;
    }
    type() {
        return 'frequency';
    }
    canonicalScalar() {
        return this.unit === 'khz' ? this.value * 1000 : this.value;
    }
}
class NumberValue extends Value {
    constructor(from) {
        super();
        this.value = from;
    }
    css() {
        return Number(this.value).toString();
    }
    type() {
        return 'number';
    }
    canonicalScalar() {
        return this.value;
    }
}
class StringValue extends Value {
    constructor(from) {
        super();
        this.value = from;
    }
    css(quoteLiteral = '') {
        return quoteLiteral + this.value + quoteLiteral;
    }
    type() {
        return 'string';
    }
    canonicalScalar() {
        return parseFloat(this.value);
    }
    equals(v) {
        return isString(v) && this.value === v.value;
    }
}
class ArrayValue extends Value {
    constructor(from) {
        super();
        this.value = from.map(makeValueFrom);
    }
    get(index) {
        return this.value[index];
    }
    type() {
        return 'array';
    }
    css() {
        return '[' + this.value.map((x) => x.css()).join(', ') + ']';
    }
    equals(v) {
        return (isArray(v) &&
            this.value.length === v.value.length &&
            this.value.every((val, idx) => val === v.value[idx]));
    }
}
function parseColorName(name) {
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
function parseHex(hex) {
    if (!hex)
        return undefined;
    if (hex[0] !== '#')
        return undefined;
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
    }
    else {
        result = {
            r: parseInt(hex[0] + hex[1], 16),
            g: parseInt(hex[2] + hex[3], 16),
            b: parseInt(hex[4] + hex[5], 16),
        };
        if (hex.length === 8) {
            result.a = parseInt(hex[6] + hex[7], 16) / 255;
        }
    }
    if (result && typeof result.a === 'undefined')
        result.a = 1.0;
    return result;
}
function hueToRgbChannel(t1, t2, hue) {
    if (hue < 0)
        hue += 6;
    if (hue >= 6)
        hue -= 6;
    if (hue < 1)
        return (t2 - t1) * hue + t1;
    else if (hue < 3)
        return t2;
    else if (hue < 4)
        return (t2 - t1) * (4 - hue) + t1;
    else
        return t1;
}
function hslToRgb(hue, sat, light) {
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
function rgbToHsl(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const delta = max - min;
    let h;
    let s;
    if (max === min) {
        h = 0;
    }
    else if (r === max) {
        h = (g - b) / delta;
    }
    else if (g === max) {
        h = 2 + (b - r) / delta;
    }
    else if (b === max) {
        h = 4 + (r - g) / delta;
    }
    h = Math.min(h * 60, 360);
    if (h < 0) {
        h += 360;
    }
    const l = (min + max) / 2;
    if (max === min) {
        s = 0;
    }
    else if (l <= 0.5) {
        s = delta / (max + min);
    }
    else {
        s = delta / (2 - max - min);
    }
    return { h: h, s: s, l: l };
}
class Color extends Value {
    constructor(from) {
        super();
        if (typeof from === 'string') {
            if (from.toLowerCase() === 'transparent') {
                [this.r, this.g, this.b, this.a] = [0, 0, 0, 0];
                [this.h, this.s, this.l] = [0, 0, 0];
            }
            else {
                const rgb = parseHex(from) || parseColorName(from);
                if (!rgb)
                    throw new Error();
                Object.assign(this, rgb);
                Object.assign(this, rgbToHsl(this.r, this.g, this.b));
            }
        }
        else {
            Object.assign(this, from);
            if (typeof this.r === 'number') {
                Object.assign(this, rgbToHsl(this.r, this.g, this.b));
            }
            else {
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
    type() {
        return 'color';
    }
    opaque() {
        return new Color({ r: this.r, g: this.g, b: this.b });
    }
    luma() {
        let r = this.r / 255.0;
        let g = this.g / 255.0;
        let b = this.b / 255.0;
        r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    hex() {
        let hexString = ((1 << 24) +
            (clampByte(this.r) << 16) +
            (clampByte(this.g) << 8) +
            clampByte(this.b))
            .toString(16)
            .slice(1);
        if (this.a < 1.0) {
            hexString += ('00' + Math.round(this.a * 255).toString(16)).slice(-2);
        }
        if (hexString[0] === hexString[1] &&
            hexString[2] === hexString[3] &&
            hexString[4] === hexString[5] &&
            hexString[6] === hexString[7]) {
            hexString =
                hexString[0] +
                    hexString[2] +
                    hexString[4] +
                    (this.a < 1.0 ? hexString[6] : '');
        }
        return '#' + hexString;
    }
    rgb() {
        return `rgb(${roundTo(this.r, 2)}, ${roundTo(this.g, 2)}, ${roundTo(this.b, 2)}${this.a < 1.0 ? ', ' + roundTo(100 * this.a, 2) + '%' : ''})`;
    }
    hsl() {
        return `hsl(${this.h}deg, ${this.s}%, ${this.l}%, ${this.a < 1.0 ? ', ' + roundTo(100 * this.a, 2) + '%' : ''})`;
    }
    css() {
        if (this.r === 0 && this.g === 0 && this.b === 0 && this.a === 0)
            return 'transparent';
        if (this.a < 1) {
            return this.rgb();
        }
        return this.hex();
    }
    canonicalScalar() {
        return this.luma();
    }
    equals(v) {
        return (isColor(v) &&
            this.r === v.r &&
            this.g === v.g &&
            this.b === v.b &&
            this.a === v.a);
    }
}
function makeValueFrom(from) {
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
function isColor(arg) {
    return arg instanceof Color;
}
function asColor(value) {
    if (!value)
        return undefined;
    let result;
    try {
        result = new Color(value);
    }
    catch (_err) {
        result = undefined;
    }
    return result;
}
function isColorArray(arg) {
    return arg instanceof ArrayValue && arg.value.every((x) => isColor(x));
}
function isNumber(arg) {
    return arg instanceof NumberValue;
}
function assertNumber(arg) {
    console.assert(arg instanceof NumberValue);
}
function assertNumberOrPercentage(arg) {
    console.assert(arg instanceof NumberValue || arg instanceof Percentage);
}
function assertLength(arg) {
    console.assert(arg instanceof Length);
}
function isPercentage(arg) {
    return arg instanceof Percentage;
}
function isLength(arg) {
    return arg instanceof Length;
}
function isString(arg) {
    return arg instanceof StringValue;
}
function isAngle(arg) {
    return arg instanceof Angle;
}
function isTime(arg) {
    return arg instanceof Time;
}
function isFrequency(arg) {
    return arg instanceof Frequency;
}
function isArray(arg) {
    return arg instanceof ArrayValue;
}
function isZero(arg) {
    return arg instanceof NumberValue && arg.value === 0;
}
function asInteger(value, defaultValue) {
    if (isNumber(value)) {
        return Math.round(value.value);
    }
    if (typeof defaultValue === 'undefined')
        assertNumber(value);
    return defaultValue;
}
function asDecimalRatio(value, defaultValue) {
    if (isPercentage(value)) {
        return value.value / 100;
    }
    else if (isNumber(value)) {
        return value.value;
    }
    if (typeof defaultValue === 'undefined')
        assertNumberOrPercentage(value);
    return defaultValue;
}
function asDegree(value) {
    if (isAngle(value)) {
        if (value.unit === 'deg') {
            return value.value;
        }
        else if (value.unit === 'rad') {
            return (value.value * 180) / Math.PI;
        }
        else if (value.unit === 'grad') {
            return (value.value * 180) / 200;
        }
        else if (value.unit === 'turn') {
            return value.value * 360.0;
        }
        throwError(ErrorCode.UnknownUnit, value.unit);
    }
    else {
        assertNumber(value);
        return value.value;
    }
}
function asPx(value, unit, baseUnits) {
    var _a, _b, _c, _d, _e, _f;
    if (typeof value !== 'number') {
        console.assert(unit === 'multi');
        let pxSum = (_a = value['px']) !== null && _a !== void 0 ? _a : 0;
        Object.keys(value).forEach((x) => {
            const inPx = asPx(this.value[x], x, baseUnits);
            if (isNaN(inPx))
                return NaN;
            pxSum += pxSum;
        });
        return pxSum;
    }
    if (unit === 'px') {
        return value;
    }
    else if (unit === 'cm') {
        return (value * 96.0) / 2.54;
    }
    else if (unit === 'mm') {
        return (value * 96.0) / 25.4;
    }
    else if (unit === 'Q') {
        return (value * 96.0) / 2.54 / 40.0;
    }
    else if (unit === 'in') {
        return value * 96.0;
    }
    else if (unit === 'pc') {
        return value * 16.0;
    }
    else if (unit === 'pt') {
        return (value * 96.0) / 72.0;
    }
    let base;
    if (unit === 'vmin') {
        base = Math.min((_b = baseUnits === null || baseUnits === void 0 ? void 0 : baseUnits.vh) !== null && _b !== void 0 ? _b : NaN, (_c = baseUnits === null || baseUnits === void 0 ? void 0 : baseUnits.vw) !== null && _c !== void 0 ? _c : NaN);
    }
    else if (unit === 'vmax') {
        base = Math.max((_d = baseUnits === null || baseUnits === void 0 ? void 0 : baseUnits.vh) !== null && _d !== void 0 ? _d : NaN, (_e = baseUnits === null || baseUnits === void 0 ? void 0 : baseUnits.vw) !== null && _e !== void 0 ? _e : NaN);
    }
    else {
        base = (_f = baseUnits === null || baseUnits === void 0 ? void 0 : baseUnits[unit]) !== null && _f !== void 0 ? _f : NaN;
    }
    return base * value;
}
function asPercent(value) {
    if (isPercentage(value)) {
        return value.value / 100;
    }
    assertNumber(value);
    return value.value;
}
function asString(value, defaultValue) {
    if (!isString(value)) {
        return defaultValue;
    }
    return value.value;
}
function compareValue(a, b) {
    return b.canonicalScalar() - a.canonicalScalar();
}
function promoteToMulti(value) {
    if (isNumber(value)) {
        return new Length({ px: value.value }, 'multi');
    }
    if (value.unit === 'multi')
        return value;
    const newValue = {};
    newValue[value.unit] = value.value;
    return new Length(newValue, 'multi');
}
function scaleLength(arg1, arg2) {
    if (arg1.unit === 'multi') {
        throw new SyntaxError(ErrorCode.InvalidOperand);
    }
    const scaleName = asString(arg2, 'pentatonic').toLowerCase();
    let scale = {
        'tritonic': [2, 3],
        'tetratonic': [2, 4],
        'pentatonic': [2, 5],
        'golden': [1.618, 1],
        'golden ditonic': [1.618, 2],
    }[scaleName];
    if (typeof scale === 'undefined') {
        scale = scaleName.split(':').map((x) => parseFloat(x));
        if (isNaN(scale[0]) || isNaN(scale[1])) {
            throw new SyntaxError(ErrorCode.InvalidOperand);
        }
        scale = [scale[1] / scale[0], 1];
    }
    const [r, n] = scale;
    const range = arg1.value * (Math.pow(r, 7 / n) - Math.pow(r, -2 / n));
    const precision = range < 10 || arg1.value * Math.pow(r, -2 / n) < 1 ? 2 : 0;
    const result = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((i) => new Length(roundTo(arg1.value * Math.pow(r, i / n), precision), arg1.unit));
    return new ArrayValue(result);
}

var _a;
const chalk = require('chalk');
const ciInfo = require('ci-info');
const tcOrange = '#ffcc00';
const tcRed = '#fa2040';
const tcBlue = '#6ab3ff';
const tcPurple = '#d1d7ff';
let gUseColor = ((_a = process.stdout.isTTY) !== null && _a !== void 0 ? _a : false) && !ciInfo.isCI;
const terminal = {
    useColor: (flag) => {
        gUseColor = flag;
    },
    autoFormat: (m) => {
        return m
            .replace(/("(.*)")/g, (x) => {
            return terminal.string(x.slice(1, -1));
        })
            .replace(/(`(.*)`)/g, (x) => {
            return terminal.keyword(x);
        });
    },
    success: (m = '') => {
        chalk.green('✔︎   ' + m);
        return gUseColor ? chalk.bold.green('✔︎   ' + m) : '✔︎   ' + m;
    },
    error: (m = '') => {
        return gUseColor ? chalk.hex(tcRed)(chalk.bold('✘   ' + m)) : '✘   ' + m;
    },
    warning: (m = '') => {
        return gUseColor
            ? chalk.hex(tcOrange)(chalk.bold('⚠️   ' + m))
            : '⚠   ' + m;
    },
    path: (m = '') => {
        return gUseColor ? chalk.hex(tcBlue).italic(m) : m;
    },
    keyword: (m = '') => {
        return gUseColor ? chalk.hex(tcOrange)(m) : m;
    },
    string: (m = '') => {
        return gUseColor
            ? chalk.hex(tcOrange)('"' + chalk.italic(m) + '"')
            : '"' + m + '"';
    },
    dim: (m = '') => {
        return gUseColor ? chalk.hex('#999')(m) : m;
    },
    time: (t = new Date()) => {
        return gUseColor
            ? chalk.hex(tcPurple)(`[${t.toLocaleTimeString()}]`)
            : '[' + t + ']';
    },
    link: (m) => {
        return gUseColor
            ? '\n▷   ' +
                chalk.hex(tcPurple)('https://github.com/arnog/chromatic/docs/errors/' + m + '.md')
            : '\n▷   https://github.com/arnog/chromatic/docs/errors/' + m + '.md';
    },
};

const chroma = require('chroma-js');
function clampUnit(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}
function asDecimalByte(value) {
    if (isPercentage(value)) {
        return Math.round((255 * value.value) / 100);
    }
    assertNumber(value);
    return Math.round(value.value);
}
function labToRgb(L, aStar, bStar) {
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
function rgbToLab(r, g, b) {
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
function rgbToXyz(r, g, b) {
    return {
        x: 0.430574 * r + 0.34155 * g + 0.178325 * b,
        y: 0.222015 * r + 0.706655 * g + 0.07133 * b,
        z: 0.020183 * r + 0.129553 * g + 0.93918 * b,
    };
}
function xyzToRgb(x, y, z) {
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
function hwbToRgb(hue, white, black) {
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
function mixColor(c1, c2, weight, model) {
    const modelName = asString(model, 'hsl').toLowerCase();
    const color1 = asColor(c1);
    if (!color1)
        return undefined;
    const color2 = asColor(c2);
    if (!color2)
        return color1;
    const w = asDecimalRatio(weight, 0.5);
    let alpha = typeof color2.a === 'number' ? color2.a : 1.0;
    alpha = alpha + ((typeof color1.a === 'number' ? color2.a : 1.0) - alpha) * w;
    if (modelName === 'rgb') {
        return new Color({
            r: color1.r + (color2.r - color1.r) * w,
            g: color1.g + (color2.g - color1.g) * w,
            b: color1.b + (color2.b - color1.b) * w,
            a: alpha,
        });
    }
    else if (modelName === 'hsl') {
        return new Color({
            h: color1.h + (color2.h - color1.h) * w,
            s: color1.s + (color2.s - color1.s) * w,
            l: color1.l + (color2.l - color1.l) * w,
            a: alpha,
        });
    }
}
function getHPrimeFn(x, y) {
    if (x === 0 && y === 0)
        return 0;
    const hueAngle = (Math.atan2(x, y) * 180) / Math.PI;
    return hueAngle >= 0 ? hueAngle : hueAngle + 360;
}
function getDeltaE(c1, c2) {
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
    const aPrime = 1 - Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7)));
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
    const deltahPrime = C1 === 0 || C2 === 0
        ? 0
        : Math.abs(hPrime1 - hPrime2) <= 180
            ? hPrime2 - hPrime1
            : hPrime2 <= hPrime1
                ? hPrime2 - hPrime1 + 360
                : hPrime2 - hPrime1 - 360;
    const deltaHPrime = 2 *
        Math.sqrt(CPrime1 * CPrime2) *
        Math.sin((deltahPrime * Math.PI) / 180 / 2);
    const HBarPrime = Math.abs(hPrime1 - hPrime2) > 180
        ? (hPrime1 + hPrime2 + 360) / 2
        : (hPrime1 + hPrime2) / 2;
    const T = 1 -
        0.17 * Math.cos((Math.PI / 180) * (HBarPrime - 30)) +
        0.24 * Math.cos((Math.PI / 180) * (2 * HBarPrime)) +
        0.32 * Math.cos((Math.PI / 180) * (3 * HBarPrime + 6)) -
        0.2 * Math.cos((Math.PI / 180) * (4 * HBarPrime - 63));
    const S_H = 1 + 0.015 * CBarPrime * T;
    const R_T = -2 *
        Math.sqrt(Math.pow(CBarPrime, 7) / (Math.pow(CBarPrime, 7) + Math.pow(25, 7))) *
        Math.sin((Math.PI / 180) * (60 * Math.exp(-Math.pow((HBarPrime - 275) / 25, 2))));
    const lightness = deltaLPrime / (kSubL * S_L);
    const chroma = deltaCPrime / (kSubC * S_C);
    const hue = deltaHPrime / (kSubH * S_H);
    return Math.sqrt(lightness * lightness + chroma * chroma + hue * hue + R_T * chroma * hue);
}
function filterColor(c, filter) {
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
            const { x, y, z } = rgbToXyz(Math.pow(c.r / 255, gamma), Math.pow(c.g / 255, gamma), Math.pow(c.b / 255, gamma));
            const u = x + y + z != 0 ? x / (x + y + z) : 0;
            const v = x + y + z != 0 ? y / (x + y + z) : 0;
            const nx = (y * 0.312713) / 0.329016;
            const nz = (y * 0.358271) / 0.329016;
            let clm;
            if (u < colorDeficiencyTable[filter].cpu) {
                clm =
                    (colorDeficiencyTable[filter].cpv - v) /
                        (colorDeficiencyTable[filter].cpu - u);
            }
            else {
                clm =
                    (v - colorDeficiencyTable[filter].cpv) /
                        (u - colorDeficiencyTable[filter].cpu);
            }
            const clyi = v - u * clm;
            const dU = (colorDeficiencyTable[filter].ayi - clyi) /
                (clm - colorDeficiencyTable[filter].am);
            const dV = clm * dU + clyi;
            const xPrime = (dU * y) / dV;
            const zPrime = ((1 - (dU + dV)) * y) / dV;
            const dX = nx - xPrime;
            const dZ = nz - zPrime;
            const { r: dr, g: dg, b: db } = xyzToRgb(dX, 0, dZ);
            let { r: rPrime, g: gPrime, b: bPrime } = xyzToRgb(xPrime, y, zPrime);
            const deltaR = rPrime ? ((rPrime < 0 ? 0 : 1) - rPrime) / dr : 0;
            const deltaG = gPrime ? ((gPrime < 0 ? 0 : 1) - gPrime) / dg : 0;
            const deltaB = bPrime ? ((bPrime < 0 ? 0 : 1) - bPrime) / db : 0;
            const adjustment = Math.max(deltaR > 1 || deltaR < 0 ? 0 : deltaR, deltaG > 1 || deltaG < 0 ? 0 : deltaG, deltaB > 1 || deltaB < 0 ? 0 : deltaB);
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
function getSimilarColors(target, colors, filter) {
    const result = [];
    const filteredTarget = filterColor(target, filter);
    colors.forEach((x) => {
        if (!target.equals(x.color)) {
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
function scaleColor(arg1, arg2, arg3, arg4) {
    let c1 = new Color('#fff');
    let c2;
    let c3 = new Color('#000');
    let n = 10;
    if ((arg3 === null || arg3 === void 0 ? void 0 : arg3.type()) === 'color') {
        c1 = asColor(arg1);
        c2 = asColor(arg2);
        c3 = asColor(arg3);
        n = asInteger(arg4, 10);
    }
    else if ((arg2 === null || arg2 === void 0 ? void 0 : arg2.type()) === 'color') {
        c1 = asColor(arg1);
        c2 = asColor(arg2);
        c3 = asColor(arg2);
        n = asInteger(arg3, 10);
    }
    else if (arg1.type() === 'color') {
        c2 = asColor(arg1);
        c3 = new Color({
            h: c2.h - 20 * Math.sin(4 * Math.PI * (c2.h / 360)),
            s: c2.s + 0.2 * Math.sin(2 * Math.PI * (c2.h / 360)),
            l: c2.h >= 180
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
        ]);
    }
    if (!c1 || !c2 || !c3)
        return undefined;
    const colors = chroma
        .scale([c1.opaque().hex(), c2.opaque().hex(), c3.opaque().hex()])
        .mode('lab')
        .correctLightness()
        .colors(n + 1);
    return new ArrayValue(colors.map((x) => new Color(x)));
}
const COLOR_ARGUMENTS_FUNCTIONS = [
    'rgb',
    'rgba',
    'hsl',
    'hsla',
    'hwb',
    'gray',
    'lab',
];
const COLOR_FUNCTION_ARGUMENTS = {
    rgb: 'number|percentage, number|percentage, number|percentage,number|percentage|none',
    rgba: 'number|percentage, number|percentage, number|percentage,number|percentage|none',
    hsl: 'number|angle, number|percentage, number|percentage, number|percentage|none',
    hsla: 'number|angle, number|percentage, number|percentage, number|percentage|none',
    hsv: 'number|angle, number|percentage, number|percentage, number|percentage|none',
    hwb: 'number|angle, number|percentage, number|percentage, number|percentage|none',
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
const COLOR_FUNCTIONS = {
    rgb: (r, g, b, a) => new Color({
        r: asDecimalByte(r),
        g: asDecimalByte(g),
        b: asDecimalByte(b),
        a: asDecimalRatio(a, 1.0),
    }),
    hsl: (h, s, l, a) => new Color({
        h: asDegree(h),
        s: asPercent(s),
        l: asPercent(l),
        a: asDecimalRatio(a, 1.0),
    }),
    hsv: (h, sat, val, a) => {
        let s = asPercent(sat);
        const v = asPercent(val);
        const l = ((2 - s) * v) / 2;
        if (l != 0) {
            if (l == 1) {
                s = 0;
            }
            else if (l < 0.5) {
                s = (s * v) / (l * 2);
            }
            else {
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
    hwb: (h, w, b, a) => {
        return new Color({
            a: asDecimalRatio(a, 1.0),
            ...hwbToRgb(asDegree(h), asPercent(w), asPercent(b)),
        });
    },
    lab: (l, a, b, alpha) => {
        return new Color({
            a: asDecimalRatio(alpha, 1.0),
            ...labToRgb(100 * asPercent(l), asDecimalRatio(a), asDecimalRatio(b)),
        });
    },
    gray: (g, alpha) => {
        return new Color({
            a: asDecimalRatio(alpha, 1.0),
            ...labToRgb(100 * asPercent(g), 0, 0),
        });
    },
    filter: (c, filterValue) => {
        const filterName = asString(filterValue, 'none').toLowerCase();
        const result = filterColor(c, asString(filterValue, 'none').toLowerCase());
        if (!result) {
            throwError(ErrorCode.InvalidArgument, 'filter()', `"${filterName}"`, getSuggestion(filterName, [
                'none',
                'grayscale',
                'protanopia',
                'deuteranopia',
                'tritanopia',
            ]));
        }
        return result;
    },
    mix: (c1, c2, weight, model) => {
        const modelName = asString(model, 'hsl').toLowerCase();
        const color1 = asColor(c1);
        if (!color1)
            return undefined;
        const color2 = asColor(c2);
        if (!color2)
            return color1;
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
        }
        else if (modelName === 'hsl') {
            return new Color({
                h: color1.h + (color2.h - color1.h) * w,
                s: color1.s + (color2.s - color1.s) * w,
                l: color1.l + (color2.l - color1.l) * w,
                a: alpha,
            });
        }
        else if (modelName === 'lab') {
            const { L: L1, a: a1, b: b1 } = rgbToLab(color1.r, color1.g, color1.b);
            const { L: L2, a: a2, b: b2 } = rgbToLab(color2.r, color2.g, color2.b);
            return new Color({
                ...labToRgb(L1 + (L2 - L1) * w, a1 + (a2 - a1) * w, b1 + (b2 - b1) * w),
                a: alpha,
            });
        }
        else {
            throwError(ErrorCode.InvalidArgument, 'mix()', `"${modelName}"`, getSuggestion(modelName, ['hsl', 'lab', 'rgb']));
        }
    },
    saturate: (c, v) => {
        const color = asColor(c);
        if (!color)
            return undefined;
        return new Color({
            h: color.h,
            s: color.s + (1.0 - color.s) * asDecimalRatio(v, 0.1),
            l: color.l,
            a: color.a,
        });
    },
    desaturate: (c, v) => {
        const color = asColor(c);
        if (!color)
            return undefined;
        return new Color({
            h: color.h,
            s: color.s - color.s * asDecimalRatio(v, 0.1),
            l: color.l,
            a: color.a,
        });
    },
    lighten: (c, v) => {
        const color = asColor(c);
        if (!color)
            return undefined;
        return new Color({
            h: color.h,
            s: color.s,
            l: color.l + (1.0 - color.l) * asDecimalRatio(v, 0.1),
            a: color.a,
        });
    },
    darken: (c, v) => {
        const color = asColor(c);
        if (!color)
            return undefined;
        return new Color({
            h: color.h,
            s: color.s,
            l: color.l - color.l * asDecimalRatio(v, 0.1),
            a: color.a,
        });
    },
    rotateHue: (c, v) => {
        const color = asColor(c);
        if (color) {
            if (!v || (!isAngle(v) && !isNumber(v))) {
                return color;
            }
            else {
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
    complement: (c) => {
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
    contrast: (base, dark, light) => {
        const baseColor = asColor(base);
        const darkColor = asColor(dark) || blackColor;
        const lightColor = asColor(light) || whiteColor;
        let darkContrast, lightContrast;
        const baseLuma = baseColor.luma();
        const darkLuma = darkColor.luma();
        const lightLuma = lightColor.luma();
        if (baseLuma > darkLuma) {
            darkContrast = (baseLuma + 0.05) / (darkLuma + 0.05);
        }
        else {
            darkContrast = (darkLuma + 0.05) / (baseLuma + 0.05);
        }
        if (baseLuma > lightLuma) {
            lightContrast = (baseLuma + 0.05) / (lightLuma + 0.05);
        }
        else {
            lightContrast = (lightLuma + 0.05) / (baseLuma + 0.05);
        }
        return darkContrast > lightContrast ? darkColor : lightColor;
    },
    rgba: (r, g, b, a) => new Color({
        r: asDecimalByte(r),
        g: asDecimalByte(g),
        b: asDecimalByte(b),
        a: asDecimalRatio(a, 1.0),
    }),
    hsla: (h, s, l, a) => new Color({
        h: asDegree(h),
        s: asPercent(s),
        l: asPercent(l),
        a: asDecimalRatio(a, 1.0),
    }),
    tint: (c, w) => mixColor(whiteColor, c, w !== null && w !== void 0 ? w : new NumberValue(0.1)),
    shade: (c, w) => mixColor(blackColor, c, w !== null && w !== void 0 ? w : new NumberValue(0.1)),
};

let FUNCTIONS = {};
FUNCTIONS = {
    calc: (x) => x,
    min: (a, b) => {
        return compareValue(a, b) < 0 ? a : b;
    },
    max: (a, b) => {
        return compareValue(a, b) < 0 ? b : a;
    },
    clamp(a, b, c) {
        return compareValue(b, a) < 0 ? a : compareValue(b, c) > 0 ? c : b;
    },
    scale: (arg1, arg2, arg3, arg4) => {
        if (isColor(arg1)) {
            return scaleColor(arg1, arg2, arg3, arg4);
        }
        else if (isLength(arg1)) {
            return scaleLength(arg1, arg2);
        }
    },
    ...COLOR_FUNCTIONS,
};
const FUNCTION_ARGUMENTS = {
    calc: 'any',
    min: 'any, any',
    max: 'any, any',
    clamp: 'any, any, any',
    ...COLOR_FUNCTION_ARGUMENTS,
};
function validateArguments(fn, args) {
    var _a;
    const expectedArguments = (_a = FUNCTION_ARGUMENTS[fn]) === null || _a === void 0 ? void 0 : _a.split(',').map((x) => x.trim());
    if (expectedArguments) {
        expectedArguments.forEach((x, i) => {
            var _a;
            const types = x.split('|').map((x) => x.trim());
            if (!types.includes('none') && !args[i]) {
                throw new SyntaxError(ErrorCode.MissingArgument, String(i + 1), fn, types.join(', '));
            }
            if (args[i] &&
                !types.includes('any') &&
                !types.includes((_a = args[i]) === null || _a === void 0 ? void 0 : _a.type())) {
                throw new SyntaxError(ErrorCode.ExpectedArgument, String(i + 1), fn, types.join(', '));
            }
        });
        if (args.length > expectedArguments.length) {
            throw new SyntaxError(ErrorCode.TooManyArguments, fn, expectedArguments.join(', '));
        }
    }
}
class Stream {
    constructor(s, options = {}) {
        this.s = '';
        this.index = 0;
        this.options = {};
        this.s = s;
        this.index = 0;
        this.options = options;
    }
    isEOF() {
        return this.index >= this.s.length;
    }
    lookAhead(n) {
        return this.s.slice(this.index, this.index + n);
    }
    skipWhiteSpace() {
        this.match(/^\s*/);
    }
    match(target) {
        if (typeof target === 'string') {
            if (this.lookAhead(target.length) === target) {
                this.index += target.length;
                return target;
            }
        }
        else {
            const m = this.s.slice(this.index).match(target);
            if (m && m[0]) {
                this.index += m[0].length;
                return m[1] || true;
            }
        }
        return undefined;
    }
    error(code, ...args) {
        var _a, _b, _c, _d;
        const prefix = (_b = (_a = this.s.slice(0, this.index).match(/^(.*)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
        const suffix = (_d = (_c = this.s.slice(this.index).match(/(.*)$/)) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : '';
        throwErrorWithContext([prefix + terminal.dim(suffix), ' '.repeat(prefix.length) + '⇧'], code, ...args);
    }
    applyOpToLength(op, lhs, rhs) {
        if (isNumber(lhs) && op === '/')
            this.error(ErrorCode.InvalidOperand);
        if (!isNumber(lhs) && !isNumber(rhs) && op === '*')
            this.error(ErrorCode.InvalidOperand);
        const opFn = {
            '+': (a, b) => a + b,
            '-': (a, b) => a - b,
            '*': (a, b) => a * b,
            '/': (a, b) => a / b,
        }[op];
        if (isNumber(lhs)) {
            assertLength(rhs);
            if (rhs.unit === 'multi') {
                const multiLength = {};
                Object.keys(rhs.value).forEach((unit) => {
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
            Object.keys(lhs.value).forEach((unit) => {
                multiLength[unit] = opFn(lhs.value[unit], rhs.value);
            });
            return new Length(multiLength);
        }
        if (op === '/') {
            if (lhs.unit === 'multi' || rhs.unit === 'multi') {
                this.error(ErrorCode.InvalidOperand);
            }
            if (lhs.unit === rhs.unit) {
                return new NumberValue(lhs.value / rhs.value);
            }
            else {
                return new NumberValue(lhs.canonicalScalar() / rhs.canonicalScalar());
            }
        }
        const lhsMulti = promoteToMulti(lhs);
        const rhsMulti = promoteToMulti(rhs);
        const multiLength = {};
        [
            ...Object.keys(lhsMulti.value),
            ...Object.keys(rhsMulti.value),
        ].forEach((unit) => {
            if (typeof rhsMulti.value[unit] === 'undefined') {
                multiLength[unit] = lhsMulti.value[unit];
            }
            else if (typeof lhsMulti.value[unit] === 'undefined') {
                multiLength[unit] = rhsMulti.value[unit];
            }
            else {
                multiLength[unit] = opFn(lhsMulti.value[unit], rhsMulti.value[unit]);
            }
        });
        return new Length(multiLength);
    }
    parseUnit(num) {
        if (this.match('%')) {
            return new Percentage(num);
        }
        let unit = this.match(/^(em|ex|ch|rem|vw|vh|vmin|vmax|px|cm|mm|in|pt|pc|Q)/);
        if (unit) {
            return new Length(num, unit);
        }
        unit = this.match(/^(deg|°|rad|grad|turn)/);
        if (unit) {
            return new Angle(num, (unit === '°' ? 'deg' : unit));
        }
        unit = this.match(/^(ms|s)/);
        if (unit) {
            return new Time(num, unit);
        }
        unit = this.match(/^(khz|hz|kHz|Hz)/);
        if (unit) {
            return new Frequency(num, unit.toLowerCase());
        }
        unit = this.match(/^([a-zA-Z]+)/);
        if (unit) {
            this.error(ErrorCode.UnknownUnit, unit);
        }
        return new NumberValue(num);
    }
    parseIndex(v) {
        let result = v;
        if (this.match('[')) {
            if (v.type() !== 'array') {
                this.error(ErrorCode.UnexpectedOpenBracket);
            }
            else {
                const index = asInteger(this.parseExpression(), NaN);
                if (isNaN(index))
                    this.error(ErrorCode.ExpectedIntegerIndex);
                result = v.get(index);
                this.skipWhiteSpace();
                if (!this.match(']')) {
                    this.error(ErrorCode.ExpectedCloseBracket);
                }
            }
        }
        return result;
    }
    parseLiteral() {
        var _a, _b, _c, _d;
        let result;
        const saveIndex = this.index;
        const op = this.match(/^\s*([+\-])\s*/);
        if (op) {
            const operand = this.parseLiteral();
            if (op === '-') {
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
                    return this.applyOpToLength('-', new Length(0, 'px'), operand);
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
            let s = '';
            while (this.lookAhead(1) !== '"' && !this.isEOF()) {
                if (this.lookAhead(1) === '\\') {
                    s += this.s[this.index + 1];
                    this.index += 2;
                }
                else {
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
            const identifier = this.match(/^([a-zA-Z_-][a-zA-Z0-9\._-]*)/);
            if (identifier) {
                let alias = (_a = this.options) === null || _a === void 0 ? void 0 : _a.aliasResolver(identifier);
                if (typeof alias === 'string') {
                    const m = identifier.match(/^(.+)-([0-9]{2,3})$/);
                    if (m) {
                        const resolvedValue = (_b = this.options) === null || _b === void 0 ? void 0 : _b.aliasResolver(m[1]);
                        if (typeof resolvedValue !== 'string') {
                            if (isArray(resolvedValue)) {
                                const index = Math.round(parseInt(m[2]) / 100);
                                alias = resolvedValue.get(index);
                            }
                            else if (isColor(resolvedValue)) {
                                const index = Math.round(parseInt(m[2]) / 100);
                                alias = (_c = scaleColor(resolvedValue)) === null || _c === void 0 ? void 0 : _c.get(index);
                            }
                            else if (isLength(resolvedValue)) {
                                const index = m[2] === '50' ? 0 : Math.round(parseInt(m[2]) / 100);
                                alias = (_d = scaleLength(resolvedValue)) === null || _d === void 0 ? void 0 : _d.get(index);
                            }
                        }
                        else if (typeof resolvedValue === 'string') {
                            this.error(ErrorCode.UnknownToken, m[1], resolvedValue);
                        }
                        else
                            this.error(ErrorCode.InvalidOperand);
                    }
                }
                if (typeof alias === 'string') {
                    this.error(ErrorCode.UnknownToken, identifier, alias);
                }
                result = alias;
                if (result) {
                    result = makeValueFrom(result);
                    result.setSource('{' + identifier + '}');
                }
            }
            if (!this.match('}')) {
                this.error(ErrorCode.ExpectedCloseCurlyBracket);
            }
        }
        if (!result) {
            result = asColor(this.match(/^\s*(#[0-9a-fA-F]{3,8})/));
        }
        if (!result) {
            this.index = saveIndex;
            result = asColor(this.match(/^\s*([a-zA-Z]+)/));
        }
        if (!result) {
            this.index = saveIndex;
        }
        return result;
    }
    parseColorArguments() {
        const result = [];
        this.skipWhiteSpace();
        if (!this.match('('))
            return undefined;
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
    parseArguments() {
        this.skipWhiteSpace();
        if (!this.match('('))
            return undefined;
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
    parseCall() {
        const saveIndex = this.index;
        const fn = this.match(/^([a-zA-Z\-]+)/);
        if (fn) {
            if (!FUNCTIONS[fn]) {
                if (this.lookAhead(1) === '(') {
                    this.error(ErrorCode.UnknownFunction, fn, getSuggestion(fn, FUNCTIONS));
                }
            }
            else {
                const args = COLOR_ARGUMENTS_FUNCTIONS.includes(fn)
                    ? this.parseColorArguments()
                    : this.parseArguments();
                if (args) {
                    try {
                        validateArguments(fn, args);
                    }
                    catch (err) {
                        if (err.code) {
                            this.error(err.code, ...err.args);
                        }
                        else {
                            this.error(err.message);
                        }
                    }
                    return FUNCTIONS[fn](...args);
                }
                else {
                    this.error(ErrorCode.SyntaxError);
                }
            }
        }
        this.index = saveIndex;
        return undefined;
    }
    parseTerminal() {
        const result = this.parseCall() || this.parseGroup() || this.parseLiteral();
        if (!result)
            return result;
        return this.parseIndex(result);
    }
    parseFactor() {
        let lhs = this.parseTerminal();
        let op = this.match(/^\s*([*|/])\s*/);
        while (op) {
            const opFn = {
                '*': (a, b) => a * b,
                '/': (a, b) => a / b,
            }[op];
            const rhs = this.parseTerminal();
            if (!rhs)
                this.error(ErrorCode.ExpectedOperand);
            if (isNumber(rhs)) {
                if (isNumber(lhs)) {
                    lhs = new NumberValue(opFn(lhs.value, rhs.value));
                }
                else if (isPercentage(lhs)) {
                    lhs = new Percentage(opFn(lhs.value, rhs.value));
                }
                else if (isLength(lhs)) {
                    lhs = this.applyOpToLength(op, lhs, rhs);
                }
                else if (isAngle(lhs)) {
                    lhs = new Angle(opFn(lhs.value, rhs.value), lhs.unit);
                }
                else if (isFrequency(lhs)) {
                    lhs = new Frequency(opFn(lhs.value, rhs.value), lhs.unit);
                }
                else if (isTime(lhs)) {
                    lhs = new Time(opFn(lhs.value, rhs.value), lhs.unit);
                }
            }
            else if ((isNumber(lhs) || isLength(lhs)) && isLength(rhs)) {
                return this.applyOpToLength(op, lhs, rhs);
            }
            else if (isNumber(lhs)) {
                if (isPercentage(rhs)) {
                    lhs = new Percentage(opFn(lhs.value, rhs.value));
                }
                else if (isLength(rhs)) {
                    lhs = this.applyOpToLength(op, lhs, rhs);
                }
                else if (isAngle(rhs)) {
                    lhs = new Angle(opFn(lhs.value, rhs.value), rhs.unit);
                }
                else if (isFrequency(rhs)) {
                    lhs = new Frequency(opFn(lhs.value, rhs.value), rhs.unit);
                }
                else if (isTime(rhs)) {
                    lhs = new Time(opFn(lhs.value, rhs.value), rhs.unit);
                }
            }
            else if (op === '/' && lhs.type() === rhs.type()) {
                lhs = new NumberValue(lhs.canonicalScalar() / rhs.canonicalScalar());
            }
            else {
                this.error(ErrorCode.InvalidOperand);
            }
            op = this.match(/^\s*([*|/])\s*/);
        }
        return lhs;
    }
    parseTerm() {
        let lhs = this.parseFactor();
        let op = this.match(/^\s*([+\-])\s*/);
        while (op) {
            const opFn = {
                '+': (a, b) => a + b,
                '-': (a, b) => a - b,
            }[op];
            const rhs = this.parseFactor();
            if (!rhs)
                this.error(ErrorCode.ExpectedOperand);
            if (isString(lhs) || isString(rhs)) {
                if (op === '-')
                    this.error(ErrorCode.InvalidOperand);
                lhs = new StringValue(opFn(lhs.css(), rhs.css()));
            }
            else if (isNumber(lhs) && isNumber(rhs)) {
                lhs = new NumberValue(opFn(lhs.value, rhs.value));
            }
            else if ((isZero(lhs) || isPercentage(lhs)) &&
                (isZero(rhs) || isPercentage(rhs))) {
                lhs = new Percentage(100 * opFn(asPercent(lhs), asPercent(rhs)));
            }
            else if (isZero(lhs) && isTime(rhs)) {
                lhs = new Time(opFn(0, rhs.value), rhs.unit);
            }
            else if (isTime(lhs) && isZero(rhs)) {
                lhs = new Time(lhs.value, lhs.unit);
            }
            else if (isTime(lhs) && isTime(rhs)) {
                if (lhs.unit === rhs.unit) {
                    lhs = new Time(opFn(lhs.value, rhs.value), lhs.unit);
                }
                else {
                    lhs = new Time(opFn(lhs.canonicalScalar(), rhs.canonicalScalar()), 's');
                }
            }
            else if (isZero(lhs) && isFrequency(rhs)) {
                lhs = new Frequency(opFn(0, rhs.value), rhs.unit);
            }
            else if (isFrequency(lhs) && isZero(rhs)) {
                lhs = new Frequency(lhs.value, lhs.unit);
            }
            else if (isFrequency(lhs) && isFrequency(rhs)) {
                if (lhs.unit === rhs.unit) {
                    lhs = new Frequency(opFn(lhs.value, rhs.value), lhs.unit);
                }
                else {
                    lhs = new Frequency(opFn(lhs.canonicalScalar(), rhs.canonicalScalar()), 'hz');
                }
            }
            else if (isZero(lhs) && isAngle(rhs)) {
                lhs = new Angle(opFn(0, rhs.value), rhs.unit);
            }
            else if (isAngle(lhs) && isZero(rhs)) {
                lhs = new Angle(lhs.value, lhs.unit);
            }
            else if (isAngle(lhs) && isAngle(rhs)) {
                if (lhs.unit === rhs.unit) {
                    lhs = new Angle(opFn(lhs.value, rhs.value), lhs.unit);
                }
                else {
                    lhs = new Angle(opFn(asDegree(lhs), asDegree(rhs)), 'deg');
                }
            }
            else if ((isZero(lhs) || isLength(lhs)) &&
                (isZero(rhs) || isLength(rhs))) {
                lhs = this.applyOpToLength(op, lhs, rhs);
            }
            else {
                this.error(ErrorCode.InvalidOperand);
            }
            op = this.match(/^\s*([+\-])\s*/);
        }
        return lhs;
    }
    parseGroup() {
        let result;
        if (this.match('(')) {
            result = this.parseExpression();
            this.skipWhiteSpace();
            if (!this.match(')')) {
                this.error(ErrorCode.ExpectedCloseParen);
            }
        }
        if (result && isNumber(result)) {
            result = this.parseUnit(result.value);
        }
        return result;
    }
    parseExpression() {
        this.skipWhiteSpace();
        return this.parseTerm();
    }
}
function parseValue(expression, options = {}) {
    const stream = new Stream(expression, options);
    const result = stream.parseExpression();
    stream.skipWhiteSpace();
    if (!stream.isEOF()) {
        return undefined;
    }
    if (result) {
        result.setSource(expression);
    }
    return result;
}

const fs$3 = require('fs');
const GenericFormats = {
    formats: {
        'yaml': {
            ext: '.yaml',
            render: (context) => context.renderTemplate(fs$3.readFileSync(__dirname + '/templates/yaml.hbs', 'utf-8'), context),
        },
        'json': {
            ext: '.json',
            render: (context) => context.renderTemplate(fs$3.readFileSync(__dirname + '/templates/json.hbs', 'utf-8'), context),
            handlebarsHelpers: {},
        },
        'data-dump': {
            ext: '.yaml',
            render: (context) => context.renderTemplate(fs$3.readFileSync(__dirname + '/templates/data-dump.hbs', 'utf-8'), context),
        },
    },
};

const fs$2 = require('fs');
const WebFormats = {
    formats: {
        sass: {
            ext: '.scss',
            render: (context) => context.renderTemplate(fs$2.readFileSync(__dirname + '/templates/sass.hbs', 'utf-8'), context),
        },
        css: {
            ext: '.css',
            render: (context) => context.renderTemplate(fs$2.readFileSync(__dirname + '/templates/css.hbs', 'utf-8'), context),
        },
    },
};

const marked = require('marked');
const highlight = require('highlight.js');
const handlebars$1 = require('handlebars');
const fs$1 = require('fs');
function renderColorSection(context) {
    let result = '';
    const handlebarsContext = { colors: [], colorRamps: [], group: '' };
    const allColors = [];
    context.themes.forEach((theme) => {
        theme.tokens.forEach((token) => {
            if (isColor(token.tokenValue))
                allColors.push({
                    name: token.tokenId +
                        (theme.theme === '_' || theme.theme === ''
                            ? ''
                            : '.' + theme.theme),
                    color: token.tokenValue,
                });
        });
    });
    context.themes.forEach((theme) => {
        handlebarsContext.group =
            context.themes.length === 1
                ? ''
                : theme.theme === '_'
                    ? 'Base'
                    : theme.theme;
        handlebarsContext.colors = [];
        theme.tokens.forEach((token) => {
            var _a, _b;
            if (isColor(token.tokenValue)) {
                const color = token.tokenValue;
                let cls = color.luma() >= 1.0 ? 'frame ' : '';
                if (color.luma() > 0.42)
                    cls += 'light';
                let opaqueColor;
                if (color.a < 1.0) {
                    opaqueColor = new Color(color);
                    opaqueColor.a = 1.0;
                }
                const similarColors = getSimilarColors(color, allColors);
                const similarProtanopiaColors = getSimilarColors(color, allColors, 'protanopia');
                const similarDeuteranopiaColors = (_a = getSimilarColors(color, allColors, 'deuteranopia')) === null || _a === void 0 ? void 0 : _a.filter((x) => !(similarColors === null || similarColors === void 0 ? void 0 : similarColors.includes(x)));
                const similarTritanopiaColors = getSimilarColors(color, allColors, 'tritanopia');
                const similarColorsColorDeficient = [];
                [
                    ...(similarDeuteranopiaColors !== null && similarDeuteranopiaColors !== void 0 ? similarDeuteranopiaColors : []),
                    ...(similarTritanopiaColors !== null && similarTritanopiaColors !== void 0 ? similarTritanopiaColors : []),
                    ...(similarProtanopiaColors !== null && similarProtanopiaColors !== void 0 ? similarProtanopiaColors : []),
                ].forEach((x) => {
                    if (similarColorsColorDeficient.findIndex((y) => y.name === x.name) < 0) {
                        if (!similarColors ||
                            similarColors.findIndex((y) => y.name === x.name) < 0) {
                            similarColorsColorDeficient.push(x);
                        }
                    }
                });
                handlebarsContext.colors.push({
                    name: token.tokenId,
                    value: token.tokenValue,
                    source: color.getSource(),
                    css: color.css(),
                    protanopiaCss: filterColor(color, 'protanopia').css(),
                    deuteranopiaCss: filterColor(color, 'deuteranopia').css(),
                    tritanopiaCss: filterColor(color, 'tritanopia').css(),
                    comment: (_b = token.tokenDefinition.comment) !== null && _b !== void 0 ? _b : '',
                    cls,
                    opaqueColor: opaqueColor === null || opaqueColor === void 0 ? void 0 : opaqueColor.css(),
                    similarColors: {
                        normal: similarColors
                            ? similarColors.map((x) => {
                                return {
                                    name: x.name,
                                    css: x.color.css(),
                                    deltaE: roundTo(x.deltaE, 2),
                                };
                            })
                            : null,
                        colorDeficient: similarColorsColorDeficient
                            ? similarColorsColorDeficient.map((x) => {
                                return {
                                    name: x.name,
                                    css: x.color.css(),
                                    deltaE: roundTo(x.deltaE, 2),
                                };
                            })
                            : null,
                        protanopia: similarProtanopiaColors
                            ? similarProtanopiaColors.map((x) => {
                                return {
                                    name: x.name,
                                    css: x.color.css(),
                                    deltaE: roundTo(x.deltaE, 2),
                                };
                            })
                            : null,
                        deuteranopia: similarDeuteranopiaColors
                            ? similarDeuteranopiaColors.map((x) => {
                                return {
                                    name: x.name,
                                    css: x.color.css(),
                                    deltaE: roundTo(x.deltaE, 2),
                                };
                            })
                            : null,
                        tritanopia: similarTritanopiaColors
                            ? similarTritanopiaColors.map((x) => {
                                return {
                                    name: x.name,
                                    css: x.color.css(),
                                    deltaE: roundTo(x.deltaE, 2),
                                };
                            })
                            : null,
                    },
                });
            }
            else if (isColorArray(token.tokenValue)) {
                let previousColor;
                handlebarsContext.colorRamps.push({
                    name: token.tokenId,
                    source: token.tokenValue.getSource(),
                    values: token.tokenValue.value.map((x, i) => {
                        const color = x;
                        let cls = color.luma() >= 1.0 ? 'frame ' : '';
                        if (color.luma() > 0.42)
                            cls += 'light';
                        let opaqueColor;
                        if (color.a < 1.0) {
                            opaqueColor = new Color(color);
                            opaqueColor.a = 1.0;
                        }
                        const deltaEWithPrevious = previousColor && getDeltaE(color, previousColor);
                        previousColor = color;
                        return {
                            name: i === 0 ? '50' : i * 100,
                            cls,
                            value: color,
                            css: color.css(),
                            opaqueColor: opaqueColor === null || opaqueColor === void 0 ? void 0 : opaqueColor.css(),
                            deltaE: deltaEWithPrevious < 2
                                ? roundTo(deltaEWithPrevious, 2)
                                : undefined,
                        };
                    }),
                });
            }
        });
        result += handlebars$1.compile(fs$1.readFileSync(__dirname + '/templates/html-colors.hbs', 'utf-8'))(handlebarsContext);
    });
    return result;
}
const StyleGuideFormat = {
    formats: {
        'html/colors': {
            ext: '.html',
            render: renderColorSection,
        },
        'html': {
            ext: '.html',
            render: (context) => context.renderTemplate(fs$1.readFileSync(__dirname + '/templates/html-file.hbs', 'utf-8'), { ...context, 'color-section': renderColorSection(context) }),
        },
    },
};
marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: (code) => highlight.highlightAuto(code).value,
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false,
});

const { cosmiconfigSync } = require('cosmiconfig');
const configParser = cosmiconfigSync('chromatic');
const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const json5 = require('json5');
const resolveFrom = require('resolve-from');
const handlebars = require('handlebars');
const gConfig = {};
let gWatching = false;
let gIgnoreErrors = false;
let gThemes;
let gGroups;
let gTokenDefinitions;
let gTokenValues;
let gRecursiveEvaluationStack;
let gErroredTokens;
let gProcessedFiles;
function error(m) {
    var _a;
    if (typeof m === 'string')
        m = [m];
    const msg = '\n' + [].concat(...m.map((x) => x.split('\n'))).join('\n    ');
    (_a = gConfig.console) === null || _a === void 0 ? void 0 : _a.error(terminal.autoFormat(msg));
    if (!gWatching && !gIgnoreErrors) {
        process.exit(1);
    }
}
function log(m) {
    var _a;
    (_a = gConfig.console) === null || _a === void 0 ? void 0 : _a.log(m);
}
function mergeObject(object, source) {
    if (object === source)
        return;
    if (!source)
        return;
    Object.keys(source).forEach((key) => {
        if (Array.isArray(source[key])) {
            if (!object[key])
                object[key] = [];
            object[key] = [
                ...object[key],
                ...source[key],
            ];
        }
        else if (typeof source[key] === 'object') {
            if (!object[key])
                object[key] = {};
            mergeObject(object[key], source[key]);
        }
        else if (typeof source[key] !== 'undefined') {
            object[key] = source[key];
        }
    });
}
function normalizeToken(defaultTheme, entry) {
    if (typeof entry !== 'string' &&
        (typeof entry !== 'object' || !entry.value)) {
        return undefined;
    }
    let result = { value: {} };
    if (typeof entry === 'string') {
        result.value._ = entry;
    }
    else {
        result = { ...entry };
    }
    if (typeof result.value === 'string') {
        result.value = { _: result.value };
    }
    if (defaultTheme && result.value['_']) {
        result.value[defaultTheme] = result.value['_'];
        result.value['_'] = undefined;
    }
    Object.keys(result.value).forEach((theme) => {
        if (!gThemes.includes(theme)) {
            gThemes.push(theme);
        }
    });
    return result;
}
function evaluateTokenExpression(qualifiedToken, expression, theme) {
    if (!expression)
        return undefined;
    if (gErroredTokens.includes(qualifiedToken))
        return undefined;
    try {
        throwErrorIf(gRecursiveEvaluationStack.includes(qualifiedToken), ErrorCode.CircularDefinition, qualifiedToken);
        gRecursiveEvaluationStack.push(qualifiedToken);
        const result = parseValue(expression, {
            ...gConfig,
            aliasResolver: (identifier) => {
                var _a, _b, _c, _d, _e;
                let aliasValue;
                if (theme) {
                    if (gTokenValues.has(identifier + '.' + theme))
                        return gTokenValues.get(identifier + '.' + theme);
                    if (gTokenDefinitions.has(identifier)) {
                        aliasValue = evaluateTokenExpression(identifier + '.' + theme, (_b = (_a = gTokenDefinitions.get(identifier)) === null || _a === void 0 ? void 0 : _a.value[theme]) !== null && _b !== void 0 ? _b : (_c = gTokenDefinitions.get(qualifiedToken)) === null || _c === void 0 ? void 0 : _c.value['_'], theme);
                    }
                    if (aliasValue)
                        return aliasValue;
                }
                if (gTokenValues.has(identifier))
                    return gTokenValues.get(identifier);
                if (gTokenDefinitions.has(identifier)) {
                    if (theme) {
                        aliasValue = evaluateTokenExpression(identifier + '.' + theme, (_d = gTokenDefinitions.get(identifier)) === null || _d === void 0 ? void 0 : _d.value[theme], theme);
                    }
                    if (!aliasValue) {
                        aliasValue = evaluateTokenExpression(identifier, (_e = gTokenDefinitions.get(qualifiedToken)) === null || _e === void 0 ? void 0 : _e.value['_'], theme);
                    }
                }
                return aliasValue !== null && aliasValue !== void 0 ? aliasValue : getSuggestion(identifier, gTokenDefinitions);
            },
        });
        gRecursiveEvaluationStack.pop();
        return result;
    }
    catch (err) {
        if (!gErroredTokens.includes(qualifiedToken)) {
            gErroredTokens.push(qualifiedToken);
            error([
                terminal.error('Syntax error') +
                    ` in "${qualifiedToken + ": '" + expression}\'"`,
                err.message,
            ]);
        }
    }
    return undefined;
}
function processTokenGroup(tokenFile, groupPath, tokens) {
    throwErrorIf(Array.isArray(tokens), ErrorCode.UnexpectedTokensArray, terminal.link('tokens-as-array'));
    if (!gGroups.has(groupPath)) {
        gGroups.set(groupPath, {});
    }
    Object.keys(tokens).forEach((token) => {
        var _a;
        const tokenPath = (groupPath ? groupPath + '.' : '') + token;
        throwErrorIf(!/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(token), ErrorCode.InvalidTokenName, tokenPath);
        throwErrorIf(!tokens[token], ErrorCode.InvalidTokenValue, token);
        try {
            const normalizedToken = normalizeToken((_a = tokenFile.theme) !== null && _a !== void 0 ? _a : gConfig.defaultTheme, tokens[token]);
            if (!normalizedToken) {
                processTokenGroup(tokenFile, tokenPath, tokens[token]);
            }
            else {
                if (!gTokenDefinitions.has(tokenPath)) {
                    gTokenDefinitions.set(tokenPath, normalizedToken);
                }
                else {
                    const mergedToken = gTokenDefinitions.get(tokenPath);
                    mergeObject(mergedToken, normalizedToken);
                    gTokenDefinitions.set(tokenPath, mergedToken);
                }
            }
        }
        catch (err) {
            throw new Error(`${tokenPath}: "${tokens[token]}"\n${err.message}`);
        }
    });
}
function processPath(f) {
    const errors = [];
    f = path.resolve(path.normalize(f));
    if (gProcessedFiles.includes(f))
        return;
    gProcessedFiles.push(f);
    if (fs.lstatSync(f).isDirectory()) {
        glob.sync(f + '/**/*' + gConfig.tokenFileExt).forEach(processPath);
        return;
    }
    let tokenFile;
    try {
        const content = fs.readFileSync(f, 'utf8');
        if (/^\.json/.test(path.extname(f))) {
            tokenFile = json5.parse(content);
        }
        else {
            tokenFile = yaml.parse(content);
        }
    }
    catch (err) {
        errors.push((err.name ? err.name + ': ' : '') + err.message);
    }
    if (tokenFile === null || tokenFile === void 0 ? void 0 : tokenFile.import) {
        if (typeof tokenFile.import === 'string') {
            tokenFile.import = [tokenFile.import];
        }
        if (Array.isArray(tokenFile.import)) {
            tokenFile.import.forEach((x) => {
                let resolvedPath = f;
                try {
                    resolvedPath = resolveFrom(path.parse(f).dir, x);
                    processPath(resolvedPath);
                }
                catch (err) {
                    errors.push(`option "import: ${x}"`);
                    if (err.code === 'MODULE_NOT_FOUND') {
                        errors.push('Module not found.' +
                            (x.slice(0, 2) === './'
                                ? ''
                                : `\nTo import as a file, use a relative path: "./${x}"`));
                    }
                    else if (err.code === 'ENOENT') {
                        errors.push('→ ' + terminal.path(resolvedPath) + '\nFile not found.');
                    }
                    else {
                        errors.push(err.message);
                    }
                }
            });
        }
        else {
            errors.push('Option "import" should be a path or an array of paths');
        }
    }
    if (tokenFile &&
        gConfig.verbose &&
        (tokenFile['imports'] ||
            tokenFile['extends'] ||
            tokenFile['include'] ||
            tokenFile['includes']) &&
        !tokenFile.import) {
        log(terminal.warning() +
            terminal.path(path.relative('', f)) +
            `\n${terminal.warning('Warning:')} use the \`"import"\` property to import other token files`);
    }
    if (tokenFile === null || tokenFile === void 0 ? void 0 : tokenFile.groups) {
        Object.keys(tokenFile.groups).forEach((group) => {
            var _a;
            if (gGroups.has(group)) {
                const info = gGroups.get(group);
                info.name = (_a = tokenFile.groups[group].name) !== null && _a !== void 0 ? _a : info.name;
                info.comment =
                    (info.comment ? info.comment + '\n' : '') +
                        tokenFile.groups[group].comment;
                info.remarks =
                    (info.remarks ? info.remarks + '\n' : '') +
                        tokenFile.groups[group].remarks;
                gGroups.set(group, info);
            }
            else {
                gGroups.set(group, tokenFile.groups[group]);
            }
        });
    }
    if (tokenFile === null || tokenFile === void 0 ? void 0 : tokenFile.tokens) {
        throwErrorIf(typeof tokenFile.tokens !== 'object', ErrorCode.UnexpectedTokensType);
        try {
            processTokenGroup(tokenFile, '', tokenFile.tokens);
        }
        catch (err) {
            errors.push(err.message);
        }
    }
    if (gConfig.verbose && errors.length === 0) {
        log(terminal.success() +
            '← ' +
            terminal.path(process.env.TEST ? path.basename(f) : path.relative('', f)));
    }
    if (errors.length > 0) {
        error([
            terminal.error() +
                '← ' +
                terminal.path(process.env.TEST ? path.basename(f) : path.relative('', f)),
            ...errors,
        ]);
    }
}
function areThemesValid() {
    var _a;
    if (((_a = gConfig.themes) === null || _a === void 0 ? void 0 : _a.length) > 0) {
        gThemes = gThemes.filter((x) => gConfig.themes.includes(x));
    }
    gThemes.forEach((theme) => {
        let count = 0;
        gTokenDefinitions.forEach((entry, _token) => {
            if (typeof entry.value[theme] !== 'undefined') {
                count += 1;
            }
        });
        if (count === 0) {
            gThemes.splice(gThemes.indexOf(theme), 1);
        }
    });
    if (gThemes.length === 0 || gTokenDefinitions.size === 0) {
        error([
            terminal.error('No tokens found.'),
            `Token files should have a "${'tokens'}" property`,
            terminal.link('../guide'),
        ]);
        return false;
    }
    return true;
}
function getFormat(formatName) {
    const result = {
        fileHeader: DEFAULT_FILE_HEADER,
        formatFilename: function ({ theme, basename, }) {
            return basename + (!theme ? '' : '-' + theme);
        },
        handlebarsHelpers: { ...gConfig.handlebarsHelpers },
        render: (_context) => 'Expected a render() function in the Format definition.',
    };
    throwErrorIf(!gConfig.formats[formatName], ErrorCode.UnknownFormat, formatName, getSuggestion(formatName, gConfig.formats));
    const baseFormat = gConfig.formats[formatName].extends;
    if (baseFormat) {
        throwErrorIf(!gConfig.formats[baseFormat], ErrorCode.UnknownFormat, baseFormat, getSuggestion(baseFormat, gConfig.formats));
        mergeObject(result, gConfig.formats[baseFormat]);
    }
    mergeObject(result, gConfig.formats[formatName]);
    Object.keys(result.handlebarsHelpers).forEach((helper) => {
        handlebars.registerHelper(helper, result.handlebarsHelpers[helper]);
    });
    return result;
}
function renderFile(format, themes, filepath) {
    gTokenDefinitions.forEach((def, token) => {
        Object.keys(def.value).forEach((tokenTheme) => {
            if (themes.includes(tokenTheme)) ;
        });
    });
    const tokensByGroup = [];
    gGroups.forEach((info, group) => {
        const groupTokens = [...gTokenDefinitions].filter(([token, _def]) => group ? token.startsWith(group + '.') : !/\./.test(token));
        tokensByGroup.push({
            groupId: group,
            groupInfo: info,
            tokens: groupTokens.map(([tokenId, tokenDefinition]) => {
                return {
                    tokenId,
                    tokenDefinition,
                    themes: themes
                        .map((theme) => {
                        const qualifiedToken = tokenId + (theme === '_' ? '' : '.' + theme);
                        return {
                            theme: theme,
                            tokenName: qualifiedToken,
                            tokenValue: gTokenValues.get(qualifiedToken),
                        };
                    })
                        .filter((x) => x.tokenValue),
                };
            }),
        });
    });
    const tokensByTheme = {};
    gTokenDefinitions.forEach((def, tokenId) => {
        if (Object.keys(def.value).length > 1) {
            Object.keys(def.value).forEach((theme) => {
                if (!tokensByTheme[theme])
                    tokensByTheme[theme] = [];
                const qualifiedToken = tokenId + (theme === '_' ? '' : '.' + theme);
                tokensByTheme[theme].push({
                    tokenId: tokenId,
                    tokenName: qualifiedToken,
                    tokenDefinition: def,
                    tokenValue: gTokenValues.get(qualifiedToken),
                });
            });
        }
        else {
            const theme = Object.keys(def.value)[0];
            const qualifiedToken = tokenId + (theme === '_' ? '' : '.' + theme);
            if (!tokensByTheme[''])
                tokensByTheme[''] = [];
            tokensByTheme[''].push({
                tokenId: tokenId,
                tokenName: qualifiedToken,
                tokenDefinition: def,
                tokenValue: gTokenValues.get(qualifiedToken),
            });
        }
    });
    return format.render({
        filepath,
        fileHeader: format.fileHeader,
        themes: Object.keys(tokensByTheme).map((theme) => {
            return {
                theme,
                isDefaultTheme: theme === '_',
                tokens: tokensByTheme[theme],
            };
        }),
        groups: tokensByGroup,
        renderTemplate: (template, context) => handlebars.compile(template.replace(/\r\n/g, '\n'))(context),
    });
}
function render(baseOutputPath, format) {
    var _a;
    const result = {};
    let outputPath = '';
    if (!areThemesValid())
        return;
    const pathRecord = (_a = (baseOutputPath && path.parse(baseOutputPath))) !== null && _a !== void 0 ? _a : {
        name: 'tokens',
    };
    if (gConfig.splitOutput) {
        gThemes.forEach((theme) => {
            outputPath = path.format({
                dir: pathRecord.dir,
                name: format.formatFilename({
                    theme: theme,
                    basename: pathRecord.name,
                }),
                ext: format.ext,
            });
            result[outputPath] = renderFile(format, [theme], outputPath);
        });
    }
    else {
        outputPath = path.format({
            dir: pathRecord.dir,
            name: format.formatFilename({
                theme: '',
                basename: pathRecord.name,
            }),
            ext: format.ext,
        });
        result[outputPath] = renderFile(format, gThemes, outputPath);
    }
    return result;
}
function writeOutputFile(content, outputPath) {
    const dirname = path.dirname(outputPath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirsSync(dirname);
    }
    fs.writeFileSync(outputPath, content);
    if (gConfig.verbose || gWatching) {
        log(terminal.success() +
            (gWatching ? terminal.time() + ' ' : '') +
            '→ ' +
            terminal.path(path.relative('', outputPath)));
    }
}
function build(paths, options) {
    var _a, _b;
    gWatching = (_a = options === null || options === void 0 ? void 0 : options.watching) !== null && _a !== void 0 ? _a : false;
    gThemes = [];
    gTokenDefinitions = new Map();
    gGroups = new Map();
    gTokenValues = new Map();
    gRecursiveEvaluationStack = [];
    gProcessedFiles = [];
    gErroredTokens = [];
    paths.forEach((x) => {
        const files = glob.sync(x);
        if (files.length === 0) {
            error(terminal.error('File not found: ') + terminal.path(x));
            return;
        }
        files.forEach(processPath);
    });
    try {
        gTokenDefinitions.forEach((def, token) => {
            Object.keys(def.value).forEach((theme) => {
                var _a;
                const qualifiedToken = token + (theme === '_' ? '' : '.' + theme);
                const value = (_a = evaluateTokenExpression(qualifiedToken, def.value[theme], gConfig.defaultTheme)) !== null && _a !== void 0 ? _a : new StringValue(def.value[theme]);
                gTokenValues.set(qualifiedToken, value);
                if (def.type && value.type() != def.type) {
                    log(terminal.warning('Warning:') +
                        ` Type mismatch. Expected \`${def.type}\` but got \`${value.type()}\` for "${qualifiedToken}" token`);
                }
            });
        });
        gTokenValues.forEach((value, _token) => {
            if (isString(value)) {
                value.value = value.value.replace(/{[a-zA-Z0-9\._-]+}/g, (match) => {
                    const alias = match.slice(1, -1);
                    if (gTokenValues.has(alias)) {
                        return gTokenValues.get(alias).css();
                    }
                    error(terminal.error('Unresolved alias. ') +
                        `Cannot find token "${match}"` +
                        getSuggestion(alias, gTokenValues));
                    return match;
                });
            }
        });
        gTokenDefinitions.forEach((def, token) => {
            gThemes.forEach((theme) => {
                var _a;
                if (theme !== '_' && typeof def.value[theme] === 'undefined') {
                    const qualifiedToken = token + '.' + theme;
                    const value = (_a = evaluateTokenExpression(qualifiedToken, def.value['_'], theme)) !== null && _a !== void 0 ? _a : new StringValue(def.value['_']);
                    gTokenValues.set(qualifiedToken, value);
                }
            });
        });
        gTokenDefinitions.forEach((_def, token) => {
            gThemes.forEach((theme) => {
                var _a;
                if (theme !== '_') {
                    const qualifiedToken = token + '.' + theme;
                    if ((_a = gTokenValues.get(token)) === null || _a === void 0 ? void 0 : _a.equals(gTokenValues.get(qualifiedToken))) {
                        gTokenValues.delete(qualifiedToken);
                    }
                }
            });
        });
        gTokenDefinitions.forEach((def, token) => {
            const types = Object.keys(def.value).reduce((acc, x) => {
                var _a, _b;
                const qualifiedToken = x === '_' ? token : token + '.' + x;
                if (!acc.includes((_a = gTokenValues.get(qualifiedToken)) === null || _a === void 0 ? void 0 : _a.type()))
                    acc.push((_b = gTokenValues.get(qualifiedToken)) === null || _b === void 0 ? void 0 : _b.type());
                return acc;
            }, []);
            throwErrorIf(types.length > 1, ErrorCode.InconsistentTokenType, token);
        });
        const format = getFormat(gConfig.outputFormat);
        format.fileHeader = (_b = options.header) !== null && _b !== void 0 ? _b : format.fileHeader;
        const outputPath = (options === null || options === void 0 ? void 0 : options.output) && path.resolve(options.output);
        const content = render(outputPath, format);
        if (content && !(options === null || options === void 0 ? void 0 : options.dryRun)) {
            if (!outputPath) {
                return content;
            }
            else {
                if (gConfig.verbose) {
                    let themesMessage = '';
                    if (gThemes.length !== 1 || gThemes[0] !== '_') {
                        if (gThemes.length === 1) {
                            themesMessage = `for theme "${gThemes[0]}"`;
                        }
                        else {
                            themesMessage =
                                'for themes ' + gThemes.map((x) => '"' + x + '"').join(', ');
                        }
                    }
                    log(`    Writing ${terminal.string(gConfig.outputFormat)} format ${themesMessage}`);
                }
                Object.keys(content).forEach((file) => {
                    writeOutputFile(content[file], file);
                });
            }
        }
    }
    catch (err) {
        error(terminal.error(err.message));
    }
    return {};
}
function chromatic(paths, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (typeof paths === 'string') {
        paths = [paths];
    }
    let configResult = configParser.search();
    if (!((_a = configResult === null || configResult === void 0 ? void 0 : configResult.isEmpty) !== null && _a !== void 0 ? _a : true)) {
        mergeObject(gConfig, configResult.config);
    }
    if (options === null || options === void 0 ? void 0 : options.config) {
        configResult = configParser.load(options.config);
        if (!((_b = configResult === null || configResult === void 0 ? void 0 : configResult.isEmpty) !== null && _b !== void 0 ? _b : true)) {
            mergeObject(gConfig, configResult.config);
        }
    }
    if (options === null || options === void 0 ? void 0 : options.themes) {
        if (typeof options.themes === 'string') {
            gConfig.themes = options.themes.split(',').map((x) => x.trim());
        }
        else if (Array.isArray(options.themes)) {
            gConfig.themes = [...options.themes];
        }
    }
    gIgnoreErrors = (_c = options === null || options === void 0 ? void 0 : options.ignoreErrors) !== null && _c !== void 0 ? _c : false;
    const messages = [];
    if (typeof (options === null || options === void 0 ? void 0 : options.console) === 'string') {
        if ((options === null || options === void 0 ? void 0 : options.console) === 'log') {
            terminal.useColor(false);
            gConfig.console = {
                log: (m) => {
                    messages.push(m);
                },
                error: (m) => {
                    messages.push(m);
                },
            };
        }
    }
    else {
        gConfig.console = (_d = options === null || options === void 0 ? void 0 : options.console) !== null && _d !== void 0 ? _d : {
            log: (m) => console.error(m),
            error: (m) => console.error(m),
        };
    }
    if (!gConfig.themes)
        gConfig.themes = [];
    gConfig.tokenFileExt =
        (_f = (_e = options === null || options === void 0 ? void 0 : options.tokenFileExt) !== null && _e !== void 0 ? _e : gConfig === null || gConfig === void 0 ? void 0 : gConfig.tokenFileExt) !== null && _f !== void 0 ? _f : 'yaml';
    gConfig.verbose = (_h = (_g = options === null || options === void 0 ? void 0 : options.verbose) !== null && _g !== void 0 ? _g : gConfig === null || gConfig === void 0 ? void 0 : gConfig.verbose) !== null && _h !== void 0 ? _h : false;
    gConfig.splitOutput = options.splitOutput;
    gConfig.outputFormat = (_k = (_j = options === null || options === void 0 ? void 0 : options.format) !== null && _j !== void 0 ? _j : gConfig === null || gConfig === void 0 ? void 0 : gConfig.outputFormat) !== null && _k !== void 0 ? _k : '';
    if (!gConfig.outputFormat) {
        const fileExt = (options === null || options === void 0 ? void 0 : options.output) && path.extname(options === null || options === void 0 ? void 0 : options.output);
        if (fileExt) {
            const matchingExtensions = Object.keys(gConfig.formats).filter((x) => {
                var _a, _b;
                return gConfig.formats[x].ext === fileExt ||
                    ((_b = gConfig.formats[(_a = gConfig.formats[x]) === null || _a === void 0 ? void 0 : _a.extends]) === null || _b === void 0 ? void 0 : _b.ext);
            });
            if (matchingExtensions.length === 1) {
                gConfig.outputFormat = matchingExtensions[0];
            }
            else {
                if (gConfig.formats[fileExt.slice(1)]) {
                    gConfig.outputFormat = fileExt.slice(1);
                }
                else if (matchingExtensions.length > 1) {
                    error([
                        terminal.error('Ambiguous format. ') +
                            `Use ${terminal.keyword('--format')} to indicate which output format to use.`,
                        `Did you mean \`${matchingExtensions.join(', ')}\`?`,
                    ]);
                }
            }
        }
        if (gConfig.outputFormat) {
            if (gConfig.verbose) {
                log(terminal.warning() +
                    `Setting the format to "gConfig.outputFormat" based on the output file extension. ` +
                    'Use `--format` to indicate which output format to use.');
            }
        }
        else {
            gConfig.outputFormat = 'yaml';
            log(terminal.warning('Format not specified.') +
                ` Using "${terminal.keyword('yaml')}". ` +
                `Use ${terminal.keyword('--format')} to indicate which output format to use.`);
        }
    }
    mergeObject(gConfig.handlebarsHelpers, options === null || options === void 0 ? void 0 : options.handlebarsHelpers);
    const result = build(paths, options);
    if (messages.length > 0) {
        result['stderr'] = messages.join('\n');
    }
    return result;
}
mergeObject(gConfig, DefaultFormatters);
mergeObject(gConfig, WebFormats);
mergeObject(gConfig, GenericFormats);
mergeObject(gConfig, StyleGuideFormat);
module.exports = chromatic;

exports.chromatic = chromatic;
//# sourceMappingURL=chromatic.js.map
