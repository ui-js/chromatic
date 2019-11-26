// @todo handle comments, remarks for non-token scopes (e.g. groups, categories, file). Have a 'categories' key with data for the categories.
// @todo: group by categories (groupByCategory)
// @todo: breakpoints (using a 'breakpoint:' instead of 'value:' property)
// and media queries
// @todo: array as a value (for scales) and array references in aliases ({font-scale[2]})
// @todo: compatibility with theo design tokens, support {!} style alias

const { cosmiconfigSync } = require('cosmiconfig');
const configParser = cosmiconfigSync('chromatic');
const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const json5 = require('json5');
const resolveFrom = require('resolve-from');

import { getSuggestion } from './utils';
import { DefaultFormatters } from './default-formatters';
import {
    Format,
    NameFormatter,
    TokenDefinition,
    ValueFormatter,
    DEFAULT_FILE_HEADER,
    RenderPropertyContext,
    RenderGroupContext,
    RenderFileContext,
} from './formats';
import {
    parseValue,
    ValueParserOptions,
    Value,
    StringValue,
} from './value-parser';

import { GenericFormats } from './formats-generic';
import { WebFormats } from './formats-web';
import { StyleGuideFormat } from './formats-styleguide';

import { terminal } from './terminal';

//
// Type definitions
//

type TokenGroup = { [token: string]: TokenDefinition | TokenGroup };

type TokenFile = {
    theme?: string;
    import: string | string[];
    tokens: TokenGroup;
};

interface Config extends ValueParserOptions {
    tokenFileExt?: string;
    verbose?: boolean;

    /** All the themes to generate output for */
    themes?: string[];

    /** The default theme when none is provied */
    defaultTheme?: string;

    /** The output format */
    outputFormat?: string;

    /** If true, themes are output in separate files. Otherwise, they're
     * combined in a single file
     */
    splitOutput?: boolean;

    /** A list of custom output formats */
    formats?: { [key: string]: Format };
    valueFormatters?: { [key: string]: ValueFormatter };
    nameFormatters?: NameFormatter[];

    /** An object to output error and log messages to (defaults to the system
     * console) */
    console?: {
        error: (m: string) => void;
        log: (m: string) => void;
    };
}

interface Options {
    /** If true, only do validation of token files and formats */
    dryRun: boolean;

    /** Path to a config file */
    config: string;

    /** A comma delimited list or an array of themes to be processed */
    themes: string | string[];

    /** The default file extension for token files (when scanning a directory */
    tokenFileExt: string;

    /** If true, output additional info during processing */
    verbose: boolean;

    /** Output format */
    format: string;

    /** Output file or directory */
    output: string;

    /** A map of name formatter functions */
    nameFormatters: { [key: string]: NameFormatter };

    /** A map of value formatter functions */
    valueFormatters: { [key: string]: ValueFormatter };

    /** If true, the process is in 'watch' mode */
    watching: boolean;

    /** If true, attempt to continue when an error is encountered */
    ignoreErrors: boolean;

    /** Header to include at the top of each generated file */
    header: string;

    /** Group the items in a file by their category property */
    groupByCategory?: boolean;

    /**  Split themes in multiple files. */
    splitOutput?: boolean;

    /** An object to capture error and log messages to (defaults to the system
     * console) */
    console?:
        | {
              error: (m: string) => void;
              log: (m: string) => void;
          }
        | string;
}

//
// Globals
//

const gConfig: Config = {};

/** True if in --watch mode */
let gWatching = false;

/** True if an attempt to continue should be made after encountering an error */
let gIgnoreErrors = false;

/** The themes encountered while parsing */
let gThemes: string[];

let gTokenDefinitions: Map<string, TokenDefinition>;

/** For a given qualified token, the evaluated value */
let gTokenValues: Map<string, Value>;

/**  The qualified token names that are in the process of being evaluated. Used to detect recursive definitions. */
let gRecursiveEvaluationStack: string[];

/* Paths of the processed files (used to detect and prevent circular references) */
let gProcessedFiles: string[];

function error(m: string): void {
    gConfig.console?.error('\n' + m);

    if (!gWatching && !gIgnoreErrors) {
        process.exit(1);
    }
}

function log(m: string): void {
    gConfig.console?.log(m);
}

/**
 * Merge "source" into object by doing a deep copy of enumerable properties.
 */
function mergeObject(object: object, source: object): object {
    if (object === source) return;
    if (!source) return;
    Object.keys(source).forEach(key => {
        if (Array.isArray(source[key])) {
            if (!object[key]) object[key] = [];
            object[key] = [...object[key], ...source[key]];
        } else if (typeof source[key] === 'object') {
            // Object literal
            if (!object[key]) object[key] = {};
            mergeObject(object[key], source[key]);
        } else if (typeof source[key] !== 'undefined') {
            object[key] = source[key];
        }
    });
}

/**
 * Return a normalized token value, with default theme applied
 *
 */
function normalizeToken(
    defaultTheme: string,
    entry: string | TokenDefinition
): TokenDefinition {
    if (
        typeof entry !== 'string' &&
        (typeof entry !== 'object' || !entry.value)
    ) {
        return undefined;
    }
    let result: TokenDefinition = { value: {} };
    if (typeof entry === 'string') {
        result.value._ = entry;
    } else {
        result = { ...entry };
    }
    if (typeof result.value === 'string') {
        result.value = { _: result.value };
    }

    // If there is a default theme, apply it now
    if (defaultTheme && result.value['_']) {
        result.value[defaultTheme] = result.value['_'];
        result.value['_'] = undefined;
    }

    Object.keys(result.value).forEach(theme => {
        if (!gThemes.includes(theme)) {
            gThemes.push(theme);
        }
    });

    return result;
}

/**
 * Evaluate an expression (e.g. "18pt + 5px" or "darken(crimson)") and
 * return a corresponding value.
 *
 * Aliases (denoted by a pair of curly brackets) are resolved.
 *
 */
function evaluateTokenExpression(
    qualifiedToken: string,
    expression: string
): Value {
    if (!expression) return undefined;
    if (gRecursiveEvaluationStack.includes(qualifiedToken)) {
        throw new Error(`Circular definition of the "${qualifiedToken}" token`);
    }

    gRecursiveEvaluationStack.push(qualifiedToken);

    const result = parseValue(expression, {
        ...gConfig,
        aliasResolver: (identifier): Value => {
            // If we have already evaluated this token, return its value
            if (gTokenValues.has(identifier))
                return gTokenValues.get(identifier);

            // The token 'identifier' has not been evaluated yet.
            // Let's try to evaluate it now.
            let aliasValue: Value;
            if (gTokenDefinitions.has(identifier)) {
                // There is a token definition with that name
                // Let's try for a value for the current theme
                if (gConfig.defaultTheme) {
                    aliasValue = evaluateTokenExpression(
                        identifier + '.' + gConfig.defaultTheme,
                        gTokenDefinitions.get(identifier)?.value[
                            gConfig.defaultTheme
                        ]
                    );
                }
                // If that didn't work, try a default value
                if (!aliasValue) {
                    aliasValue = evaluateTokenExpression(
                        identifier,
                        gTokenDefinitions.get(qualifiedToken)?.value['_']
                    );
                }
            }
            return aliasValue;
        },
    });
    gRecursiveEvaluationStack.pop();

    return result;
}

/**
 * Process an object literal that contains a group of tokens
 *
 * @param tokenFile - A parsed token file
 * @param tokenPath - A dot separated path to this group, if not at root
 * @param tokens - A key/value map of token names and values
 */
function processTokenGroup(
    tokenFile: TokenFile,
    tokenPath: string,
    tokens: object
): void {
    if (Array.isArray(tokens)) {
        throw new Error(
            `The ${terminal.string(
                'tokens'
            )} property is an array. It should be a key/value map of tokens.${terminal.link(
                'tokens-as-array'
            )}`
        );
    }
    Object.keys(tokens).forEach(token => {
        const qualifiedToken = (tokenPath ? tokenPath + '.' : '') + token;
        if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
            throw new Error(
                'Invalid token name "' +
                    qualifiedToken +
                    '": it must only contain digits, letters, "_" and "-"'
            );
        }
        if (!tokens[token]) {
            throw new Error(
                `The ${terminal.string(
                    token
                )} token is null. If using a YAML file, make sure RGB hex values are within quotes.`
            );
        }
        try {
            const normalizedToken = normalizeToken(
                tokenFile.theme ?? gConfig.defaultTheme,
                tokens[token]
            );
            if (!normalizedToken) {
                // If it's not a token, it's a group of tokens
                processTokenGroup(tokenFile, qualifiedToken, tokens[token]);
            } else {
                if (!gTokenDefinitions.has(qualifiedToken)) {
                    gTokenDefinitions.set(qualifiedToken, normalizedToken);
                } else {
                    // There's already a definition for this token.
                    // Check that the types are consistent.
                    if (
                        normalizedToken.type &&
                        gTokenDefinitions.get(qualifiedToken).type &&
                        gTokenDefinitions.get(qualifiedToken).type !==
                            normalizedToken.type
                    ) {
                        throw new Error(
                            'Inconsistent token type: "' +
                                normalizedToken.type +
                                '" (was "' +
                                gTokenDefinitions.get(qualifiedToken).type +
                                '")'
                        );
                    }

                    // Merge the new definition with the previous one
                    const mergedToken = gTokenDefinitions.get(qualifiedToken);
                    mergeObject(mergedToken, normalizedToken);
                    gTokenDefinitions.set(qualifiedToken, mergedToken);
                }
            }
        } catch (err) {
            throw new Error(
                `  ${qualifiedToken}: "${tokens[token]}"\n    ${err.message}`
            );
        }
    });
}

/**
 * @param  f    - path to a file or directory. If a directory,
 * its content are recursively walked and parsed
 *
 * The result of the processing is accumulated in gTokenDefinitions.
 *
 */
function processPath(f: string): void {
    const errors: string[] = [];
    f = path.resolve(path.normalize(f));

    // Avoid processing the same file (or directory) more than once
    if (gProcessedFiles.includes(f)) return;
    gProcessedFiles.push(f);

    // If the path to process is a directory, process (recursively) all the
    // token files it contains.
    if (fs.lstatSync(f).isDirectory()) {
        glob.sync(f + '/**/*.' + gConfig.tokenFileExt).forEach(processPath);
        return;
    }

    //
    // 1. Read the token file
    //

    let tokenFile: TokenFile;

    try {
        const content = fs.readFileSync(f, 'utf8');
        if (/^\.json/.test(path.extname(f))) {
            // If the extension is ".json", ".jsonc", ".json5", etc.., attempt to read it as a JSON5 file
            tokenFile = json5.parse(content);
        } else {
            tokenFile = yaml.parse(content);
        }
    } catch (err) {
        errors.push((err.name ? err.name + ': ' : '') + err.message);
    }

    //
    // 2. Process any 'import' directive
    //
    if (tokenFile?.import) {
        if (typeof tokenFile.import === 'string') {
            tokenFile.import = [tokenFile.import];
        }
        if (Array.isArray(tokenFile.import)) {
            tokenFile.import.forEach((x: any) => {
                let resolvedPath = f;
                try {
                    resolvedPath = resolveFrom(path.parse(f).dir, x);
                    processPath(resolvedPath);
                } catch (err) {
                    errors.push('option ' + terminal.string(`import: ${x}`));
                    if (err.code === 'MODULE_NOT_FOUND') {
                        errors.push(
                            'Module not found.' +
                                (x.slice(0, 2) === './'
                                    ? ''
                                    : `\n    To import as a file, use a relative path: "./${x}"`)
                        );
                    } else if (err.code === 'ENOENT') {
                        errors.push(
                            '→ ' +
                                terminal.path(resolvedPath) +
                                '\n    File not found.'
                        );
                    } else {
                        errors.push(err.message);
                    }
                }
            });
        } else {
            errors.push(
                'Option "import" should be a path or an array of paths'
            );
        }
    }

    if (tokenFile && gConfig.verbose) {
        if (
            (tokenFile['imports'] ||
                tokenFile['extends'] ||
                tokenFile['include'] ||
                tokenFile['includes']) &&
            !tokenFile.import
        ) {
            log(
                terminal.warning() +
                    terminal.path(path.relative('', f)) +
                    `\n${terminal.warning(
                        'Warning:'
                    )} use the \`"import"\` property to import other token files`
            );
        }
    }

    //
    // 3. Process any token declaration
    //
    if (tokenFile?.tokens) {
        try {
            if (typeof tokenFile.tokens !== 'object') {
                throw new Error(
                    `The ${terminal.string(
                        'tokens'
                    )} property should be a key/value map of tokens.`
                );
            } else {
                processTokenGroup(tokenFile, '', tokenFile.tokens);
            }
        } catch (err) {
            errors.push(err.message);
        }
    }

    //
    // 4. Display any accumulated errors
    //
    if (gConfig.verbose && errors.length === 0) {
        log(terminal.success() + '← ' + terminal.path(path.relative('', f)));
    }
    if (errors.length > 0) {
        error(
            terminal.error() +
                terminal.path(path.relative('', f)) +
                '\n    ' +
                errors.join('\n    ')
        );
    }
}

function formatTokenValues(
    tokens: string[],
    valueFormatter: ValueFormatter
): Map<string, string> {
    if (!valueFormatter) return undefined;
    const result = new Map<string, string>();
    tokens.forEach(token => {
        try {
            result.set(token, valueFormatter(gTokenValues.get(token)));
        } catch (err) {
            error(
                terminal.error(
                    `Error formatting ${terminal.string(
                        gTokenValues.get(token).css()
                    )} for the ${terminal.string(token)} token`
                ) +
                    '\n    ' +
                    err.message
            );
        }
    });
    return result;
}

function areThemesValid(): boolean {
    // Filter out themes
    if (gConfig.themes?.length > 0) {
        gThemes = gThemes.filter(x => gConfig.themes.includes(x));
    }

    // Check
    gThemes.forEach(theme => {
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
        error(
            terminal.error('No tokens found.') +
                '\n    ' +
                `Token files should have a ${terminal.string(
                    'tokens'
                )} property` +
                terminal.link('../guide')
        );
        return false;
    }

    return true;
}

function setFormat(formatName: string): Format {
    const result: Format = {
        fileHeader: DEFAULT_FILE_HEADER,
        renderFilename: function({
            theme,
            basename,
        }: {
            theme: string;
            basename: string;
        }): string {
            return basename + (!theme ? '' : '-' + theme);
        },
        renderGroup: (context: RenderGroupContext): string =>
            context.properties.join('\n'),
        renderFile: (context: RenderFileContext): string => context.content,
    };

    if (!gConfig.formats[formatName]) {
        throw new Error(
            `Unknown format "${formatName}"` +
                getSuggestion(formatName, gConfig.formats)
        );
    }

    // If this format extends another...
    const baseFormat = gConfig.formats[formatName].extends;
    if (typeof baseFormat === 'string') {
        if (gConfig.formats[baseFormat]) {
            mergeObject(result, gConfig.formats[baseFormat]);
            mergeObject(result, gConfig.formats[formatName]);
        } else {
            throw new Error(
                `Unknown format "${baseFormat}" in \`${formatName}.extends\`` +
                    getSuggestion(baseFormat, gConfig.formats)
            );
        }
    } else {
        mergeObject(result, gConfig.formats[formatName]);
    }

    // Normalize shorthand format for valueFormatters and nameFormatters
    if (typeof result.valueFormatter === 'string') {
        if (!gConfig.valueFormatters[result.valueFormatter]) {
            throw new Error(
                `Unknown value formatter "${result.valueFormatter}"` +
                    getSuggestion(
                        result.valueFormatter,
                        gConfig.valueFormatters
                    )
            );
        }
    } else if (typeof result.valueFormatter !== 'function') {
        result.valueFormatter = (v): string => v.css();
    }

    if (typeof result.nameFormatter === 'string') {
        if (!gConfig.nameFormatters[result.nameFormatter]) {
            throw new Error(
                `Unknown name formatter "${result.nameFormatter}"` +
                    getSuggestion(result.nameFormatter, gConfig.nameFormatters)
            );
        }
    } else if (typeof result.nameFormatter !== 'function') {
        result.nameFormatter = (n, theme): string =>
            n + (!theme || theme === '_' ? '' : '-' + theme);
    }

    // Provide a default property template if none is provided
    // but issue a warning, as those should really be provided.
    if (typeof result.renderProperty !== 'function') {
        if (gConfig.verbose) {
            log(
                terminal.warning('Warning: ') +
                    ` the "${formatName}" format does not have a \`propertyTemplate\` function`
            );
        }
        result.renderProperty = (context: RenderPropertyContext): string =>
            `${context.propertyName}${
                context.theme ? '-' + context.theme : ''
            }: ${context.propertyValue}`;
    }

    return result;
}

function renderFile(format: Format, context: RenderFileContext): string {
    // @todo: filter tokens as necessary
    /** List of generated properties (used to detect duplicates).
     * Note those are not *token names* they are formatted property names */
    const propertyNames: string[] = [];

    const tokens = [];
    gTokenDefinitions.forEach((def, token) => {
        Object.keys(def.value).forEach(tokenTheme => {
            if (context.themes.includes(tokenTheme)) {
                tokens.push(
                    tokenTheme === '_' ? token : token + '.' + tokenTheme
                );
            }
        });
    });

    // 1. Apply the value formatter

    const formattedTokenValues = formatTokenValues(
        tokens,
        format.valueFormatter
    );

    // 2. If there are any remaining unresolved aliases (in a string such
    // as "1px solid {color.border.base}", for example), replace their value.

    formattedTokenValues.forEach((value, token) => {
        const newValue = value.replace(/{[a-zA-Z0-9_-]+}/g, match => {
            const alias = match.slice(1, -1);
            if (formattedTokenValues.has(alias)) {
                return formattedTokenValues.get(alias);
            }
            const m =
                terminal.error('Unresolved alias.') +
                `The ${terminal.string(
                    match
                )} identifier could not be resolved.` +
                getSuggestion(alias, formattedTokenValues);
            error(m);
            return match;
        });

        if (newValue) formattedTokenValues.set(token, newValue);
    });

    // 3. Render the properties

    const properties = [];
    context.themes.forEach(theme => {
        gTokenDefinitions.forEach((def, token) => {
            if (typeof def.value[theme] === 'undefined') return;

            // 3.1. Calculate the property name. Check it's not a duplicate
            const propertyName = format.nameFormatter(token, theme);

            if (propertyNames.includes(propertyName)) {
                if (propertyName !== token) {
                    log(
                        terminal.warning('Warning: ') +
                            ` the "${token}" token has multiple definitions as "${propertyName}"`
                    );
                } else {
                    log(
                        terminal.warning('Warning: ') +
                            ` the "${token}" token has multiple definitions`
                    );
                }
            }
            propertyNames.push(propertyName);

            // 3.2 Calculate the property (name + value)
            const qualifiedToken = token + (theme === '_' ? '' : '.' + theme);
            properties.push(
                format.renderProperty({
                    ...context,
                    theme: theme,
                    category: '',
                    properties: properties,
                    values: formattedTokenValues,

                    token: qualifiedToken,
                    definition: def,
                    propertyName: propertyName,
                    propertyValue: formattedTokenValues.get(qualifiedToken),
                })
            );
        });
    });

    // 4. Render the file
    return format.renderFile({
        ...context,
        content: format.renderGroup({
            ...context,
            category: '',
            properties: properties,
            values: formattedTokenValues,
        }),
    });
}

function render(
    baseOutputPath: string,
    format: Format
): { [filename: string]: string } {
    const result = {};

    // Check that there are tokens in each of the themes
    if (!areThemesValid()) return;

    const pathRecord = (baseOutputPath && path.parse(baseOutputPath)) ?? {
        name: 'tokens',
    };

    const context: RenderFileContext = {
        filepath: '',
        themes: [],
        header: format.fileHeader,
        definitions: gTokenDefinitions,
        rawValues: gTokenValues,
        content: '',
    };

    if (gConfig.splitOutput) {
        // Output one file per theme
        gThemes.forEach(theme => {
            context.filepath = path.format({
                dir: pathRecord.dir,
                name: format.renderFilename({
                    theme: theme,
                    basename: pathRecord.name,
                }),
                ext: format.ext,
            });

            context.themes = [theme];
            result[context.filepath] = renderFile(format, context);
        });
    } else {
        // Output a single file for all themes
        context.filepath = path.format({
            dir: pathRecord.dir,
            name: format.renderFilename({
                theme: '',
                basename: pathRecord.name,
            }),
            ext: format.ext,
        });
        context.themes = gThemes;
        result[context.filepath] = renderFile(format, context);
    }

    return result;
}

function writeOutputFile(content: string, outputPath: string): void {
    const dirname = path.dirname(outputPath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirsSync(dirname);
    }
    fs.writeFileSync(outputPath, content);
    if (gConfig.verbose || gWatching) {
        log(
            terminal.success() +
                (gWatching ? terminal.time() + ' ' : '') +
                '→ ' +
                terminal.path(path.relative('', outputPath))
        );
    }
}

/**
 * @returns If the result of the build process is a single
 * file, its content is returned as a string.
 *
 * Otherwise, the return value is an object literal with each key the
 * name of a file, and its value its content.
 */
function build(
    paths: string[],
    options: Options
): { [filename: string]: string } {
    //
    // 1. Process each file or directory
    //
    //    Parse the token files and accumulate the qualified token names
    //    (dot-separated paths) with their normalized definition (TokenDefinition)
    //    in gTokenDefinitions (in a normalized definition, the default theme has been applied, replacing '_')
    //
    gWatching = options?.watching ?? false;

    gThemes = [];
    gTokenDefinitions = new Map();
    gTokenValues = new Map();
    gRecursiveEvaluationStack = [];
    gProcessedFiles = [];

    paths.forEach((x: string): void => {
        const files = glob.sync(x);
        if (files.length === 0) {
            error(terminal.error('File not found: ') + terminal.path(x));
            return;
        }
        files.forEach(processPath);
    });

    //
    // 2. Evaluate the tokens
    //
    // Evaluate the token value expressions, including aliases,
    // except in strings. Store the result in gTokenValues.

    gTokenDefinitions.forEach((def, token) => {
        Object.keys(def.value).forEach(theme => {
            const qualifiedToken = token + (theme === '_' ? '' : '.' + theme);
            let value;
            try {
                value = evaluateTokenExpression(
                    qualifiedToken,
                    def.value[theme]
                );
                if (!value) {
                    value = new StringValue(def.value[theme]);
                    // throw new Error(
                    //     'Could not evaluate expression "' + def.value[theme] + '"'
                    // );
                }
            } catch (err) {
                error(
                    terminal.error('Syntax error') +
                        ` in ${terminal.string(
                            token + ': "' + def.value[theme]
                        ) + '"'} \n    ` +
                        terminal.dim(err.message)
                );
                value = new StringValue(def.value[theme]);
            }
            gTokenValues.set(qualifiedToken, value);

            const actualType = value.type();

            if (def.type && actualType != def.type) {
                log(
                    terminal.warning('Warning:') +
                        ` Type mismatch. Expected ${terminal.string(
                            def.type
                        )} but got ${terminal.string(
                            actualType
                        )} for ${terminal.string(qualifiedToken)} token`
                );
            }

            // @todo: cross-check category
        });
    });

    //
    // 3. Format and output
    //
    try {
        // 3.1 Determine the output format

        const format = setFormat(gConfig.outputFormat);

        // Override format settings from options
        format.fileHeader = options.header ?? format.fileHeader;

        //
        // 3.2. Render the properties
        //
        const outputPath = options?.output && path.resolve(options.output);
        const content = render(outputPath, format);

        //
        // 3.3. Write the files
        //
        if (content && !options?.dryRun) {
            if (!outputPath) {
                return content;
            } else {
                if (gConfig.verbose) {
                    let themesMessage = '';
                    if (gThemes.length !== 1 || gThemes[0] !== '_') {
                        if (gThemes.length === 1) {
                            themesMessage =
                                'for theme ' + terminal.string(gThemes[0]);
                        } else {
                            themesMessage =
                                'for themes ' +
                                gThemes.map(x => terminal.string(x)).join(', ');
                        }
                    }
                    log(
                        `    Writing ${terminal.string(
                            gConfig.outputFormat
                        )} format ${themesMessage}`
                    );
                }
                Object.keys(content).forEach(file => {
                    writeOutputFile(content[file], file);
                });
            }
        }
    } catch (err) {
        error(terminal.error(err.message));
    }
    return {};
}

/**
 * The main entry point of Chromatic.
 *
 * @param paths - A list of files or directories to process
 * @returns If the result is a single file, the content of the
 * file as a string. Otherwise, a map of key/values, where the
 * key is the file name and the value is the content.
 *
 */

export function chromatic(
    paths: string | string[],
    options: Options
): { [filename: string]: string } {
    if (typeof paths === 'string') {
        paths = [paths];
    }

    //
    // 1. Load from 'standard' config locations
    //
    let configResult = configParser.search();
    if (!(configResult?.isEmpty ?? true)) {
        mergeObject(gConfig, configResult.config);
    }

    //
    // 2. If a config file is specified, merge with previous config
    //
    if (options?.config) {
        configResult = configParser.load(options.config);
        if (!(configResult?.isEmpty ?? true)) {
            mergeObject(gConfig, configResult.config);
        }
    }

    //
    // 3. If options are specified, merge with previous config
    //
    if (options?.themes) {
        if (typeof options.themes === 'string') {
            gConfig.themes = options.themes
                .split(',')
                .map((x: string) => x.trim());
        } else if (Array.isArray(options.themes)) {
            gConfig.themes = [...options.themes];
        }
    }

    gIgnoreErrors = options?.ignoreErrors ?? false;

    // Configure the console/logger
    const messages: string[] = [];
    if (typeof options?.console === 'string') {
        if (options?.console === 'log') {
            terminal.useColor(false);
            gConfig.console = {
                log: (m: string): void => {
                    messages.push(m);
                },
                error: (m: string): void => {
                    messages.push(m);
                },
            };
        }
    } else {
        gConfig.console = options?.console ?? {
            // Output "log" (i.e. warnings) message to stdout (console.error)
            log: (m: string): void => console.error(m),
            error: (m: string): void => console.error(m),
        };
    }

    if (!gConfig.themes) gConfig.themes = [];

    gConfig.tokenFileExt =
        options?.tokenFileExt ?? gConfig?.tokenFileExt ?? 'yaml';

    gConfig.verbose = options?.verbose ?? gConfig?.verbose ?? false;

    gConfig.splitOutput = options.splitOutput;

    gConfig.outputFormat = options?.format ?? gConfig?.outputFormat ?? '';

    if (!gConfig.outputFormat) {
        // Try to guess the format based on the extension of the output file
        const fileExt = options?.output && path.extname(options?.output);
        if (fileExt) {
            const matchingExtensions = Object.keys(gConfig.formats).filter(
                x => gConfig.formats[x].ext === fileExt
            );
            if (matchingExtensions.length === 1) {
                gConfig.outputFormat = matchingExtensions[0];
            } else {
                // Multiple (or no) format can output to this extension.
                // If there is one whose name is exactly the extension, use it.
                if (gConfig.formats[fileExt.slice(1)]) {
                    gConfig.outputFormat = fileExt.slice(1);
                } else if (matchingExtensions.length > 1) {
                    error(
                        terminal.error(
                            'Ambiguous format. ' +
                                `Use ${terminal.option(
                                    '--format'
                                )} to indicate which output format to use.`
                        ) +
                            '\n    Did you mean ' +
                            terminal.string(matchingExtensions.join(', ')) +
                            '?'
                    );
                }
            }
        }

        if (gConfig.outputFormat) {
            if (gConfig.verbose) {
                log(
                    'Setting the format to ' +
                        terminal.string(gConfig.outputFormat) +
                        ' based on the output file extension. ' +
                        `Use ${terminal.option(
                            '--format'
                        )} to indicate which output format to use.`
                );
            }
        } else {
            gConfig.outputFormat = 'yaml';
            log(
                terminal.warning('Format not specified.') +
                    ` Using "${terminal.option('yaml')}". ` +
                    `Use ${terminal.option(
                        '--format'
                    )} to indicate which output format to use.`
            );
        }
    }

    // Merge (registers) any custom formatters
    mergeObject(gConfig.nameFormatters, options?.nameFormatters);
    mergeObject(gConfig.valueFormatters, options?.valueFormatters);

    const result = build(paths, options);
    if (messages) {
        result['stderr'] = messages.join('\n');
    }
    return result;
}

mergeObject(gConfig, DefaultFormatters);
mergeObject(gConfig, WebFormats);
mergeObject(gConfig, GenericFormats);
mergeObject(gConfig, StyleGuideFormat);

module.exports = chromatic;
