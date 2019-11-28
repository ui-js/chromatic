export enum ErrorCode {
    NoError = 0,
    SyntaxError,

    UnexpectedOpenBracket,
    ExpectedCloseBracket,
    ExpectedOpenParen,
    ExpectedCloseParen,
    ExpectedQuote,

    UnknownUnit,

    UnknownFunction,
    MissingArgument,
    ExpectedArgument,
    TooManyArguments,

    ExpectedOperand,
    InvalidOperand,
    InvalidUnaryOperand,

    ExpectedIntegerIndex,

    CircularDefinition,
    UnexpectedTokensArray,
    UnexpectedTokensType,
    InvalidTokenName,
    InvalidTokenValue,
    InconsistentTokenType,
    UnknownFormat,
    UnknownValueFormatter,
    UnknownNameFormatter,
}

const ERRORS = {
    [ErrorCode.SyntaxError]: 'Syntax error',

    [ErrorCode.UnexpectedOpenBracket]: 'Unexpected `[`',
    [ErrorCode.ExpectedCloseBracket]: 'Expected `]`',
    [ErrorCode.ExpectedOpenParen]: 'Expected `(`',
    [ErrorCode.ExpectedCloseParen]: 'Expected `)`',
    [ErrorCode.ExpectedQuote]: 'Expected `"`',

    [ErrorCode.UnknownUnit]: 'Unknown unit `%1`',

    [ErrorCode.UnknownFunction]: 'Unknown function `%1`%2',
    [ErrorCode.MissingArgument]: 'Missing argument %1 of `%2` of type `%3`',
    [ErrorCode.ExpectedArgument]:
        'Expected argument %1 of `%2` to be of type `%3`',
    [ErrorCode.TooManyArguments]: 'Too many arguments for function `%1(%2)`',

    [ErrorCode.ExpectedOperand]: 'Expected operand',
    [ErrorCode.InvalidOperand]: 'Invalid operand',
    [ErrorCode.InvalidUnaryOperand]: 'Invalid operand',

    [ErrorCode.CircularDefinition]: 'Circular definition of the "%1" token',
    [ErrorCode.UnexpectedTokensArray]:
        'The "tokens" property is an array. It should be a key/value map of tokens.\n%1',
    [ErrorCode.UnexpectedTokensType]:
        'The "tokens" property should be a key/value map of tokens.',
    [ErrorCode.InvalidTokenName]:
        'Invalid token name "%1": it must only contain digits, letters, "_" and "-"',
    [ErrorCode.InvalidTokenValue]:
        'The "%1" token is invalid. If using a YAML file, make sure RGB hex values are within quotes',
    [ErrorCode.InconsistentTokenType]: 'Inconsistent token type: "%1" ( "%2")',
    [ErrorCode.UnknownFormat]: 'Unknown format "%1"%2',
    [ErrorCode.UnknownValueFormatter]: 'Unknown value formatter "%1"%2',
    [ErrorCode.UnknownNameFormatter]: 'Unknown name formatter "%1"%2',
    [ErrorCode.ExpectedIntegerIndex]: 'Expected a number of array index',
};

export class SyntaxError extends Error {
    code: ErrorCode;
    args: string[];
    constructor(code: ErrorCode, ...args: string[]) {
        super();
        this.code = code;
        this.args = args;
    }
}

export function throwError(code: number, ...args: string[]): void {
    throwErrorWithContext(undefined, code, ...args);
}

export function throwErrorWithContext(
    context: string[],
    code: number,
    ...args: string[]
): void {
    let message = '';
    if (process.env.TEST) {
        message = '[ERR] ' + (ErrorCode[code] ?? code);
    } else {
        if (context) message = context.join('\n') + '\n';
        message += ERRORS[code];
        args.forEach((val, index) => {
            message = message.replace(new RegExp(`%${index + 1}`, 'g'), val);
        });
    }
    throw new Error(message);
}
