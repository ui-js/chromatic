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

// Forward declaration of the Color class
declare class Color extends Value {
    constructor(from: object | string);
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
                x => v1.value[x] === v2.value[x]
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

export function isColorArray(arg: Value): arg is ArrayValue {
    return arg instanceof ArrayValue && arg.value.every(x => isColor(x));
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
        Object.keys(value).forEach(x => {
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
