// @todo: breakpoints (using a 'breakpoint:' instead of 'value:' property)
// and media queries
// @todo: compatibility with theo design tokens, support {!} style alias

const { cosmiconfigSync } = require('cosmiconfig');
const configParser = cosmiconfigSync('chromatic');
const glob = require('glob');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const json5 = require('json5');
const resolveFrom = require('resolve-from');
const handlebars = require('handlebars');

import { throwErrorIf, ErrorCode } from './errors';
import { getSuggestion } from './utils';
import { DefaultFormatters } from './default-formatters';
import {
  Format,
  TokenDefinition,
  TokenGroupInfo,
  DEFAULT_FILE_HEADER,
  RenderContext,
} from './formats';
import { Value, StringValue, isString, isColorArray, isColor } from './value';
import { parseValue, ValueParserOptions } from './value-parser';

import { GenericFormats } from './formats-generic';
import { WebFormats } from './formats-web';
import { StyleGuideFormat } from './formats-styleguide';

import { terminal } from './terminal';

//
// Type definitions
//

type TokenGroup = { [token: string]: TokenDefinition | TokenGroup };

interface TokenFile {
  theme?: string;
  import: string | string[];
  groups?: { [group: string]: TokenGroupInfo };
  tokens: TokenGroup;
}

/** The configuration settings that can be defined in a configuration file
 */

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
  handlebarsHelpers?: { [helper: string]: (...args: string[]) => string };

  /** An object to output error and log messages to (defaults to the system
   * console) */
  console?: {
    error: (m: string) => void;
    log: (m: string) => void;
  };
  [key: string]: unknown;
}

/**
 * The parameters that can be specified in a token file, or overridden
 * as an option
 */
// interface Settings {
//     colorSimilarityThreshold: number;
//     colorDeficiencySimilariryThreshold: number;
// }

/** The set of options that can be passed to the chromatic() function
 * or to the CLI tool
 */
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

  /** A map of custom helper function for handlebar templates */
  handlebarsHelpers: { [helper: string]: (...args: string[]) => string };

  /** If true, the process is in 'watch' mode */
  watching: boolean;

  /** If true, attempt to continue when an error is encountered */
  ignoreErrors: boolean;

  /** Header to include at the top of each generated file */
  header: string;

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

/** The themes and groups encountered while parsing */
let gThemes: string[];

/** The groups encountered while parsing (and their associated metadata) */
let gGroups: Map<string, TokenGroupInfo>;

/** The key is a token path ('semantic.warning') and the value is
 * the definition of the tokens, including its values (as Value objects)
 * for each theme it has a definition for (including the default theme, '_')
 */
let gTokenDefinitions: Map<string, TokenDefinition>;

/** For a given qualified token (e.g. 'semantic.warning.dark'), its value */
let gTokenValues: Map<string, Value>;

/**  The qualified token names that are in the process of being evaluated. Used to detect recursive definitions. */
let gRecursiveEvaluationStack: string[];

/** Tokens that have failed to evaluate. */
/* We keep track of them to avoid repetitive error messages */
let gErroredTokens: string[];

/* Paths of the processed files (used to detect and prevent circular references) */
let gProcessedFiles: string[];

function error(m: string | string[]): void {
  if (typeof m === 'string') m = [m];

  // If there are any carriage returns, break them up in separate array elements
  const msg = '\n' + [].concat(...m.map((x) => x.split('\n'))).join('\n    ');

  gConfig.console?.error(terminal.autoFormat(msg));

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
function mergeObject(
  object: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  if (object === source) return;
  if (!source) return;
  Object.keys(source).forEach((key) => {
    if (Array.isArray(source[key])) {
      if (!object[key]) object[key] = [];
      object[key] = [
        ...(object[key] as unknown[]),
        ...(source[key] as unknown[]),
      ];
    } else if (typeof source[key] === 'object') {
      // Object literal
      if (!object[key]) object[key] = {};
      mergeObject(
        object[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
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

  Object.keys(result.value).forEach((theme) => {
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
  expression: string,
  theme: string
): Value {
  if (!expression) return undefined;
  if (gErroredTokens.includes(qualifiedToken)) return undefined;

  try {
    throwErrorIf(
      gRecursiveEvaluationStack.includes(qualifiedToken),
      ErrorCode.CircularDefinition,
      qualifiedToken
    );

    gRecursiveEvaluationStack.push(qualifiedToken);

    const result = parseValue(expression, {
      ...gConfig,
      aliasResolver: (identifier): Value | string => {
        // If we have already evaluated this token, return its value
        let aliasValue: Value;
        if (theme) {
          if (gTokenValues.has(identifier + '.' + theme))
            return gTokenValues.get(identifier + '.' + theme);
          if (gTokenDefinitions.has(identifier)) {
            // There is a token definition with that name
            // Let's try for a value for the current theme
            aliasValue = evaluateTokenExpression(
              identifier + '.' + theme,
              gTokenDefinitions.get(identifier)?.value[theme] ??
                gTokenDefinitions.get(qualifiedToken)?.value['_'],
              theme
            );
          }
          if (aliasValue) return aliasValue;
        }
        if (gTokenValues.has(identifier)) return gTokenValues.get(identifier);

        // The token 'identifier' has not been evaluated yet.
        // Let's try to evaluate it now.
        if (gTokenDefinitions.has(identifier)) {
          // There is a token definition with that name
          // Let's try for a value for the current theme
          if (theme) {
            aliasValue = evaluateTokenExpression(
              identifier + '.' + theme,
              gTokenDefinitions.get(identifier)?.value[theme],
              theme
            );
          }
          // If that didn't work, try a default value
          if (!aliasValue) {
            aliasValue = evaluateTokenExpression(
              identifier,
              gTokenDefinitions.get(qualifiedToken)?.value['_'],
              theme
            );
          }
        }
        return aliasValue ?? getSuggestion(identifier, gTokenDefinitions);
      },
    });
    gRecursiveEvaluationStack.pop();

    return result;
  } catch (err) {
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

/**
 * Process an object literal that contains a group of tokens
 *
 * @param tokenFile - A parsed token file
 * @param groupPath - A dot separated path to this group, if not at root
 * @param tokens - A key/value map of token names and values
 */
function processTokenGroup(
  tokenFile: TokenFile,
  groupPath: string,
  tokens: Record<string, string | TokenDefinition | TokenGroup>
): void {
  throwErrorIf(
    Array.isArray(tokens),
    ErrorCode.UnexpectedTokensArray,
    terminal.link('tokens-as-array')
  );

  if (!gGroups.has(groupPath)) {
    gGroups.set(groupPath, {});
  }
  Object.keys(tokens).forEach((token) => {
    const tokenPath = (groupPath ? groupPath + '.' : '') + token;
    throwErrorIf(
      !/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(token),
      ErrorCode.InvalidTokenName,
      tokenPath
    );
    throwErrorIf(!tokens[token], ErrorCode.InvalidTokenValue, token);
    try {
      const normalizedToken = normalizeToken(
        tokenFile.theme ?? gConfig.defaultTheme,
        tokens[token] as string | TokenDefinition
      );
      if (!normalizedToken) {
        // If it's not a token, it's a group of tokens
        processTokenGroup(tokenFile, tokenPath, tokens[token] as TokenGroup);
      } else {
        if (!gTokenDefinitions.has(tokenPath)) {
          gTokenDefinitions.set(tokenPath, normalizedToken);
        } else {
          // Merge the new definition with the previous one
          const mergedToken = gTokenDefinitions.get(tokenPath);
          mergeObject(mergedToken, normalizedToken);
          gTokenDefinitions.set(tokenPath, mergedToken);
        }
      }
    } catch (err) {
      throw new Error(`${tokenPath}: "${tokens[token]}"\n${err.message}`);
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
    glob.sync(f + '/**/*' + gConfig.tokenFileExt).forEach(processPath);
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
          errors.push(`option "import: ${x}"`);
          if (err.code === 'MODULE_NOT_FOUND') {
            errors.push(
              'Module not found.' +
                (x.slice(0, 2) === './'
                  ? ''
                  : `\nTo import as a file, use a relative path: "./${x}"`)
            );
          } else if (err.code === 'ENOENT') {
            errors.push(
              '→ ' + terminal.path(resolvedPath) + '\nFile not found.'
            );
          } else {
            errors.push(err.message);
          }
        }
      });
    } else {
      errors.push('Option "import" should be a path or an array of paths');
    }
  }

  if (
    tokenFile &&
    gConfig.verbose &&
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

  //
  // 3. Process group declarations
  //
  if (tokenFile?.groups) {
    Object.keys(tokenFile.groups).forEach((group) => {
      if (gGroups.has(group)) {
        const info = gGroups.get(group);
        info.name = tokenFile.groups[group].name ?? info.name;
        info.comment =
          (info.comment ? info.comment + '\n' : '') +
          tokenFile.groups[group].comment;
        info.remarks =
          (info.remarks ? info.remarks + '\n' : '') +
          tokenFile.groups[group].remarks;
        gGroups.set(group, info);
      } else {
        gGroups.set(group, tokenFile.groups[group]);
      }
    });
  }

  //
  // 4. Process any token declaration
  //
  if (tokenFile?.tokens) {
    throwErrorIf(
      typeof tokenFile.tokens !== 'object',
      ErrorCode.UnexpectedTokensType
    );
    try {
      processTokenGroup(tokenFile, '', tokenFile.tokens);
    } catch (err) {
      errors.push(err.message);
    }
  }

  //
  // 5. Display any accumulated errors
  //
  if (gConfig.verbose && errors.length === 0) {
    log(
      terminal.success() +
        '← ' +
        terminal.path(
          process.env.TEST ? path.basename(f) : path.relative('', f)
        )
    );
  }
  if (errors.length > 0) {
    error([
      terminal.error() +
        '← ' +
        terminal.path(
          process.env.TEST ? path.basename(f) : path.relative('', f)
        ),
      ...errors,
    ]);
  }
}

function areThemesValid(): boolean {
  // Filter out themes
  if (gConfig.themes?.length > 0) {
    gThemes = gThemes.filter((x) => gConfig.themes.includes(x));
  }

  // Check
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

function getFormat(formatName: string): Format {
  const result: Format = {
    fileHeader: DEFAULT_FILE_HEADER,
    formatFilename: function ({
      theme,
      basename,
    }: {
      theme: string;
      basename: string;
    }): string {
      return basename + (!theme ? '' : '-' + theme);
    },
    handlebarsHelpers: { ...gConfig.handlebarsHelpers },
    render: (_context: RenderContext): string =>
      'Expected a render() function in the Format definition.',
  };

  //
  // 1. Check that the format exists
  //
  throwErrorIf(
    !gConfig.formats[formatName],
    ErrorCode.UnknownFormat,
    formatName,
    getSuggestion(formatName, gConfig.formats)
  );

  //
  // 2. If this format extends another format,
  //    merge the base format
  //
  const baseFormat = gConfig.formats[formatName].extends;
  if (baseFormat) {
    throwErrorIf(
      !gConfig.formats[baseFormat],
      ErrorCode.UnknownFormat,
      baseFormat,
      getSuggestion(baseFormat, gConfig.formats)
    );

    mergeObject(result, gConfig.formats[baseFormat]);
  }

  //
  // 3. Add the override from this format
  //
  mergeObject(result, gConfig.formats[formatName]);

  //
  // 4. Register the handlebar helpers
  //

  // A handlebarsHelper can be defined:
  // - in a config file
  // - passed in as options to chromatic()
  // - in a format definition

  Object.keys(result.handlebarsHelpers).forEach((helper) => {
    handlebars.registerHelper(helper, result.handlebarsHelpers[helper]);
  });

  return result;
}

function renderFile(
  format: Format,
  themes: string[],
  filepath: string
): string {
  const tokens = [];
  gTokenDefinitions.forEach((def, token) => {
    Object.keys(def.value).forEach((tokenTheme) => {
      if (themes.includes(tokenTheme)) {
        tokens.push(tokenTheme === '_' ? token : token + '.' + tokenTheme);
      }
    });
  });

  //
  // 1. Aggregate the tokens by group
  //
  const tokensByGroup = [];

  gGroups.forEach((info, group) => {
    const groupTokens = [...gTokenDefinitions].filter(([token, _def]) =>
      group ? token.startsWith(group + '.') : !/\./.test(token)
    );
    tokensByGroup.push({
      groupId: group,
      groupInfo: info,
      tokens: groupTokens.map(([tokenId, tokenDefinition]) => {
        return {
          tokenId,
          tokenDefinition,
          themes: themes
            .map((theme) => {
              const qualifiedToken =
                tokenId + (theme === '_' ? '' : '.' + theme);
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

  //
  // 2. Aggregate the tokens by theme
  //
  const tokensByTheme = {};
  gTokenDefinitions.forEach((def, tokenId) => {
    if (Object.keys(def.value).length > 1) {
      Object.keys(def.value).forEach((theme) => {
        if (!tokensByTheme[theme]) tokensByTheme[theme] = [];
        const qualifiedToken = tokenId + (theme === '_' ? '' : '.' + theme);
        tokensByTheme[theme].push({
          tokenId: tokenId,
          isColor: isColor(gTokenValues.get(qualifiedToken)),
          tokenName: qualifiedToken,
          tokenDefinition: def,
          tokenValue: gTokenValues.get(qualifiedToken),
        });
      });
    } else {
      const theme = Object.keys(def.value)[0];
      const qualifiedToken = tokenId + (theme === '_' ? '' : '.' + theme);
      if (!tokensByTheme['']) tokensByTheme[''] = [];
      const value = gTokenValues.get(qualifiedToken);
      tokensByTheme[''].push({
        tokenId: tokenId,
        isColor: isColor(value),
        tokenName: qualifiedToken,
        tokenDefinition: def,
        tokenValue: value,
      });
      if (isColorArray(value)) {
        let index = 50;
        for (const v of value.value) {
          tokensByTheme[''].push({
            tokenId: tokenId + '-' + index,
            isColor: isColor(v),
            tokenName: qualifiedToken + '-' + index,
            tokenDefinition: def,
            tokenValue: v,
          });
          index += index < 100 ? 50 : 100;
        }
      }
    }
  });

  //
  // 3. Render the file
  //
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
    renderTemplate: (template: string, context: RenderContext): string =>
      handlebars.compile(template.replace(/\r\n/g, '\n'))(context),
  });
}

function render(
  baseOutputPath: string,
  format: Format
): { [filename: string]: string } {
  const result = {};
  let outputPath = '';

  // Check that there are tokens in each of the themes
  if (!areThemesValid()) return;

  const pathRecord = (baseOutputPath && path.parse(baseOutputPath)) ?? {
    name: 'tokens',
  };

  if (gConfig.splitOutput) {
    // Output one file per theme
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
  } else {
    // Output a single file for all themes
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
 * @returns A map where the key is a filename and the value is
 * the content of the file.
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
  gGroups = new Map();
  gTokenValues = new Map();
  gRecursiveEvaluationStack = [];
  gProcessedFiles = [];
  gErroredTokens = [];

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

  // 2.1 First pass
  // Evaluate the token value expressions, including aliases,
  // except in strings. Store the result in gTokenValues.
  try {
    gTokenDefinitions.forEach((def, token) => {
      Object.keys(def.value).forEach((theme) => {
        const qualifiedToken = token + (theme === '_' ? '' : '.' + theme);
        const value =
          evaluateTokenExpression(
            qualifiedToken,
            def.value[theme],
            gConfig.defaultTheme
          ) ?? new StringValue(def.value[theme]);

        gTokenValues.set(qualifiedToken, value);

        if (def.type && value.type() != def.type) {
          log(
            terminal.warning('Warning:') +
              ` Type mismatch. Expected \`${
                def.type
              }\` but got \`${value.type()}\` for "${qualifiedToken}" token`
          );
        }

        // @todo: cross-check category
      });
    });

    // 2.2
    // For any string that may still contain an alias, replace the
    // alias reference with its value
    gTokenValues.forEach((value, _token) => {
      if (isString(value)) {
        value.value = value.value.replace(/{[a-zA-Z0-9\._-]+}/g, (match) => {
          const alias = match.slice(1, -1);
          if (gTokenValues.has(alias)) {
            return gTokenValues.get(alias).css();
          }

          error(
            terminal.error('Unresolved alias. ') +
              `Cannot find token "${match}"` +
              getSuggestion(alias, gTokenValues)
          );
          return match;
        });
      }
    });

    // 2.3 Calculate missing values for each theme
    gTokenDefinitions.forEach((def, token) => {
      gThemes.forEach((theme) => {
        if (theme !== '_' && typeof def.value[theme] === 'undefined') {
          const qualifiedToken = token + '.' + theme;
          const value =
            evaluateTokenExpression(qualifiedToken, def.value['_'], theme) ??
            new StringValue(def.value['_']);
          gTokenValues.set(qualifiedToken, value);
        }
      });
    });

    // 2.4 Eliminate any themed values that are the same as base
    // Steps 2.3 and 2.4 are necessary to handle this case:
    /* ``` 
    hue:
        value:
            _: "0deg"
            dark: "10deg"
    primary: "hsl({hue}, 50%, 50%)"
*/
    // Since the expression to calculate value depends on a token that does
    // have a theme variant, primary also needs to have a theme variant
    gTokenDefinitions.forEach((_def, token) => {
      gThemes.forEach((theme) => {
        if (theme !== '_') {
          const qualifiedToken = token + '.' + theme;
          if (
            gTokenValues.get(token)?.equals(gTokenValues.get(qualifiedToken))
          ) {
            gTokenValues.delete(qualifiedToken);
          }
        }
      });
    });

    // 2.5 Validate that all the types for a given definition are consistent
    gTokenDefinitions.forEach((def, token) => {
      const types = Object.keys(def.value).reduce(
        (acc: string[], x: string): string[] => {
          const qualifiedToken = x === '_' ? token : token + '.' + x;
          if (!acc.includes(gTokenValues.get(qualifiedToken)?.type()))
            acc.push(gTokenValues.get(qualifiedToken)?.type());
          return acc;
        },
        []
      );
      // If there's more than one type for the values of this definition,
      // throw
      throwErrorIf(types.length > 1, ErrorCode.InconsistentTokenType, token);
    });

    //
    // 3. Format and output
    //
    // 3.1 Determine the output format

    const format = getFormat(gConfig.outputFormat);

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
              themesMessage = `for theme "${gThemes[0]}"`;
            } else {
              themesMessage =
                'for themes ' + gThemes.map((x) => '"' + x + '"').join(', ');
            }
          }
          log(
            `    Writing ${terminal.string(
              gConfig.outputFormat
            )} format ${themesMessage}`
          );
        }
        Object.keys(content).forEach((file) => {
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
      gConfig.themes = options.themes.split(',').map((x: string) => x.trim());
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
        (x) =>
          gConfig.formats[x].ext === fileExt ||
          gConfig.formats[gConfig.formats[x]?.extends]?.ext
      );
      if (matchingExtensions.length === 1) {
        gConfig.outputFormat = matchingExtensions[0];
      } else {
        // Multiple (or no) format can output to this extension.
        // If there is one whose name is exactly the extension, use it.
        if (gConfig.formats[fileExt.slice(1)]) {
          gConfig.outputFormat = fileExt.slice(1);
        } else if (matchingExtensions.length > 1) {
          error([
            terminal.error('Ambiguous format. ') +
              `Use ${terminal.keyword(
                '--format'
              )} to indicate which output format to use.`,
            `Did you mean \`${matchingExtensions.join(', ')}\`?`,
          ]);
        }
      }
    }

    if (gConfig.outputFormat) {
      if (gConfig.verbose) {
        log(
          terminal.warning() +
            `Setting the format to "gConfig.outputFormat" based on the output file extension. ` +
            'Use `--format` to indicate which output format to use.'
        );
      }
    } else {
      gConfig.outputFormat = 'yaml';
      log(
        terminal.warning('Format not specified.') +
          ` Using "${terminal.keyword('yaml')}". ` +
          `Use ${terminal.keyword(
            '--format'
          )} to indicate which output format to use.`
      );
    }
  }

  // Merge any custom handlebars helpers
  mergeObject(gConfig.handlebarsHelpers, options?.handlebarsHelpers);

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
