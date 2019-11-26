## Command Line Options

`Usage: chromatic file [options]`

-   `file` is a path to single token file, a directory, or a glob expression. If it is a path to a directory, all the `.yaml` files in this directory will be processed.
-   `--tokenFileExt` = `yaml`: when processing a directory, the file extension of the token files.
-   `--out`, `-o` \[optional\]: path to a directory or file where the
    output of the build process will be saved. If omitted, the result is output to the console.
-   `--verbose` = `false`: output progress information and warnings during processing.
-   `--validate` = `false`: process the token files, but do not output them. Use with `--verbose` to show additional warnings.
-   `--theme` \[optional\]: a comma separated list of the themes to output. If none is provided, all the themes are output.
-   `--format`, `-f` = ``: output format: `css|sass|js|yaml|json`
-   `--no-color`: suppress color output in terminal

## Config options

Some config options for Chromatic can be provided either:

-   In the `package.json` file under a `chromatic` property
-   In a `.chromaticrc` file (in JSON or YAML format)
-   In a file `.chromatic.json.,`.chromatic.yaml., `.chromatic.yml., or`.chromatic.js` file
-   In a `chromatic.config.js` CommonJS module

The configuration file can be placed in the root of the project directory, or in any parent directory up to the home directory.

The configuration file can include the following options:

-   `groupByCategory`: = `true`. In the output file, group the properties by the token's category. See Category.
-   `theme`: an array of the themes to consider when generating tokens
-   `defaultTheme`: if no theme is specified, assume the token refers to this theme
-   `tokenFileExt` = `"yaml"`: When processing a directory, the file extension of the token files.
-   `valueFormatters`: a dictionary of formating functions. Each function is passed a token value and type and should return a formated string.

```javascript
{
    valueFormatters: {
        "uppercase": (value, _type) => value.toString().toUpperCase(),
    }
}
```

-   `nameFormatters`: a dictionary of property name formating functions. Each function is passed a token name, type and theme and should return a formated property name.

```javascript
{
    nameFormatters: {
        "uppercase-with-theme": (token, _type, theme) => (token + '-' + theme).toUpperCase(),
    }
}
```

-   `formats`: a dictionary of output file format. The key is the name of the format and the value is an object literal describing it. See "Output File Format"

## The Token File Format

A token file is a YAML or JSON file that contains a platform agnostic definition
of the design tokens. YAML is recommended over JSON because it is
easier to include multi-line comments in this format.

The file can include the following keys:

-   `tokens`: a map of token name to token definition. A token definition can be as simple a string, or an object literal with the following keys:
    -   `value`: the value of this token, expressed either as a string, or as a map, with each key representing the name of a theme, and the value corresponding to the value of this token for the theme.
    -   `type`
    -   `comment` A short, one-line comment
    -   `remarks` A longer, multi-line, explanation as a Markdown string.
    -   `category` A grouping used when generating documentation
    -   `contrast-backround` For type "`color`", a color (or alias to a color) that will be used as the background color for this token. This is used to calculate color contrast and issue a warning if the contrast falls below the W3C recommendations.
-   `import`: either a string or an array of strings, each a path to
    another token file that will be included before processing this one. Note that token files are only processed once. If the string is a directory, all the `.yaml` files in it will be processed. The path can be either an absolute file path, a file path relative to the token file, or a node module path (i.e. just the name of the module)
-   `theme`: any value for the tokens in this specified will be assumed to apply to the specified theme. This is useful to group in a single file all the token values for a specific theme

### Type

| Type     | Name |
| -------- | ---- |
| `color`  |      |
| `size`   |      |
| `number` |      |
| `string` |      |

-   ratio
-   icon

### Category

Each token can be associated with a "category".

```json
{
    tokens: {
        hero-color:
            value: "#333",
            category: "text-color"
    }
}
```

Standard categories:

| Category              | Name                   |
| --------------------- | ---------------------- |
| `spacing`             | Spacing                |
| `sizing`              | Sizing                 |
| `font`                | Fonts                  |
| `font-style`          | Font Styles            |
| `font-weight`         | Font Weights           |
| `font-size`           | Font Sizes             |
| `line-height`         | Line Heights           |
| `font-family`         | Font Families          |
| `border-style`        | Border Styles          |
| `border-color`        | Border Colors          |
| `radius`              | Radius                 |
| `border-radius`       | Border Radii           |
| `hr-color`            | Horizontal Rule Colors |
| `background-color`    | Background Colors      |
| `gradient`            | Gradients              |
| `background-gradient` | Background Gradients   |
| `drop-shadow`         | Drop Shadows           |
| `box-shadow`          | Box Shadows            |
| `inner-shadow`        | Inner Drop Shadows     |
| `text-color`          | Text Colors            |
| `text-shadow`         | Text Shadows           |
| `time`                | Time                   |
| `media-query`         | Media Queries          |
| `z-index`             | Z-Index                |

## Examples

### Basic token file

```yaml
tokens:
    red: '#FF0000'
    blue: '#0ff00'
    green: '#0000FF'
    white: '#fff'
```

The same tokens, expressed in JSON:

```json
{
    "tokens": {
        "red": "#FF0000",
        "blue": "#0ff00",
        "green": "#0000FF",
        "white": "#fff"
    }
}
```

### Token file with themes

```yaml
tokens:
    background:
        value:
            dark: '#333'
            light: '#CCC'
    text-color:
        value:
            dark: '#ddd'
            light: '#222'
```

## Output File Format

The `formats` property of the config object is a key/value map of format names and format description. The format name is used as an argument to the `--format` option in the command line or the `format` option in the config file.

A format description may include the following properties:

-   `extends`: The name of another format this one is based on. It will inherit all the properties from this format, and can override the necessary ones.
-   `ext`: The file extension for the output file, for example `".css"`
-   `fileHeader`: A message to include at the top of the output file. This could be a copyright notice, or a warning that the file is auto-generated and should not be modified manually.
-   `valueFormatters`: An array of strings, the name of the value formatters to apply in sequence on token values before outputing them. As a shorthand, this can be a string, or a function.
-   `nameFormatters`: An array of strings, the name of the name formatters to apply in sequence on the token name before outputing it. As a shorthand, this can be a string or a function.
-   `propertyTemplate`: A function that returns a property formated for output. Its input parameters are the formatted name of the token, the formatted value of the token and the token entry, which includes the type the token and the comment associated with it.
-   `filenameTemplate`: A function that returns the name of the file to write to, given a base filename and a theme name. If the same value is returned for various 'theme' values, the properties will be output to the same file.
-   `groupTemplate`: A function that returns as a string the content of a group of related properties, for example properties belonging to the same them or the same category. Its input parameter is an object literal with the following keys:
    -   `header`
    -   `properties`: an array of string, one for each property
    -   `filename`: the name of the output file
    -   `filepath`: the full path of the output file
    -   `theme`: if the properties are grouped by theme, the theme they share
    -   `category`: if the properties are grouped by category, the category they share
-   `fileTemplate`: A function that returns as a string the output file. Its input parameter is an object literal with the following keys:
    -   `header`
    -   `content`: a string representing the concatenated groups
    -   `filename`: the name of the output file
    -   `filepath`: the full path of the output file

### Standard Value Formatters

| Name                  | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `color/rgb`           | Convert to rgb                                                    |
| `color/hex`           | Convert to hex                                                    |
| `color/hex8rgba`      | Convert to hex8rgba                                               |
| `color/hex8argb`      | Convert to hex8argb                                               |
| `percentage/float`    | Convert a percentage to a decimal percentage                      |
| `relative/pixel`      | Convert a r/em value to a pixel value                             |
| `relative/pixelValue` | Convert a r/em value to a pixel value (excluding the `px` suffix) |
