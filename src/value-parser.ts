import { throwErrorWithContext, ErrorCode, SyntaxError } from './errors';
import { terminal } from './terminal';
import { getSuggestion } from './utils';
import {
  Value,
  Frequency,
  FrequencyUnit,
  Time,
  TimeUnit,
  Length,
  LengthUnit,
  BaseLengthUnits,
  MultiLength,
  Angle,
  AngleUnit,
  StringValue,
  Percentage,
  NumberValue,
  ArrayValue,
  compareValue,
  asColor,
  asInteger,
  asPercent,
  asDegree,
  isArray,
  isAngle,
  isColor,
  isLength,
  isNumber,
  isFrequency,
  isPercentage,
  isTime,
  isString,
  isZero,
  makeValueFrom,
  assertLength,
  scaleLength,
  promoteToMulti,
} from './value';
import {
  COLOR_ARGUMENTS_FUNCTIONS,
  COLOR_FUNCTION_ARGUMENTS,
  COLOR_FUNCTIONS,
  darkMode,
  scaleColor,
} from './color-functions';

// @todo: convert frequency and time (1/s -> Hz)
// @todo: have a base-font-size property in the tokenfile as well (under global: )

export interface ValueParserOptions {
  baseUnits?: BaseLengthUnits;

  /** When an alias (identifier in {}) is encountered, this function
   * is called to resolve it.
   * Return either the resolved value, or a string which is a suggestion
   * for the best matching identifier.
   */
  aliasResolver?: (identifier: string) => Value | string;
}

// Definition of the functions that can be used in the expression
// of token values.
let FUNCTIONS: {
  [key: string]: (...args: Value[]) => Value;
} = {};
FUNCTIONS = {
  /** The calc() function is a no-op, but it's there for compatibility with CSS */
  'calc': (x: Value): Value => x,
  'min': (a: Value, b: Value): Value => {
    return compareValue(a, b) < 0 ? a : b;
  },
  'max': (a: Value, b: Value): Value => {
    return compareValue(a, b) < 0 ? b : a;
  },
  'clamp'(a: Value, b: Value, c: Value): Value {
    return compareValue(b, a) < 0 ? a : compareValue(b, c) > 0 ? c : b;
  },

  'scale': (arg1: Value, arg2: Value, arg3: Value, arg4: Value): ArrayValue => {
    if (isColor(arg1)) return scaleColor(arg1, arg2, arg3, arg4);
    if (isLength(arg1)) return scaleLength(arg1, arg2);
  },
  'dark-mode': (value: Value): Value => darkMode(value),
  ...COLOR_FUNCTIONS,
};

const FUNCTION_ARGUMENTS = {
  calc: 'any',
  min: 'any, any',
  max: 'any, any',
  clamp: 'any, any, any',
  ...COLOR_FUNCTION_ARGUMENTS,
};

function validateArguments(fn: string, args: any[]): void {
  const expectedArguments = FUNCTION_ARGUMENTS[fn]
    ?.split(',')
    .map((x) => x.trim());
  if (expectedArguments) {
    expectedArguments.forEach((x: string, i: number) => {
      const types = x.split('|').map((x) => x.trim());

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
        Object.keys(rhs.value as MultiLength).forEach((unit) => {
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
      Object.keys(lhs.value as MultiLength).forEach((unit) => {
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
        return new NumberValue((lhs.value as number) / (rhs.value as number));
      } else {
        // The units are not the same. Attempt to conver them to a scalar
        return new NumberValue(lhs.canonicalScalar() / rhs.canonicalScalar());
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
    ].forEach((unit) => {
      if (typeof rhsMulti.value[unit] === 'undefined') {
        multiLength[unit] = lhsMulti.value[unit];
      } else if (typeof lhsMulti.value[unit] === 'undefined') {
        multiLength[unit] = rhsMulti.value[unit];
      } else {
        multiLength[unit] = opFn(lhsMulti.value[unit], rhsMulti.value[unit]);
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
      // It's an array literal
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
                  m[2] === '50' ? 0 : Math.round(parseInt(m[2]) / 100);
                alias = scaleLength(resolvedValue)?.get(index);
              }
            } else if (typeof resolvedValue === 'string') {
              // A string indicate the identifier could not be
              // resolved. The string is the suggestion
              this.error(ErrorCode.UnknownToken, m[1], resolvedValue);
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
        const args = COLOR_ARGUMENTS_FUNCTIONS.includes(fn)
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
    const result = this.parseCall() || this.parseGroup() || this.parseLiteral();

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
        lhs = new NumberValue(lhs.canonicalScalar() / rhs.canonicalScalar());
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
        lhs = new Percentage(100 * opFn(asPercent(lhs), asPercent(rhs)));
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
