# Getting Started with Chromatic

Design tokens [^1] are the building blocks of a design system.

Chromatic is a tool that facilitates communications betwen designers and
developers.

It converts a token file expressed in YAML or JSON into one or more platform
specific implementation files such as Sass for the web, JSON for iOS or XML for
Android and even documentation as HTML files. As part of this process, the
values of the tokens are formatted appropriately for the target platform, for
example using HEX and rgba() for the web, r:g:b for iOS and ARGB on Android. The
name of the tokens are also formatted appropriately, for example '--body-color'
as a CSS custom property, '\$body-color' as a SASS variable.

## Installing Chromatic

Install Chromatic using `npm`:

```shell
$ npm install --save-dev @arnog/chromatic
```

Integrate Chromatic into your build system and run it when you make a build.

```json
// package.json
{
  "scripts": {
    "build": "chromatic tokens.yaml -o ./build/tokens.scss"
  }
}
```

```shell
$ npm run build
```

## Writing a Token File

A simple token file is a list of tokens under a `tokens` key:

```yaml
# tokens.yaml
tokens:
  background: #f1f1f1
  body-color: #333
```

It can also be expressed in JSON [^2]:

```json
// tokens.json
{
  "tokens": {
    "background": "#f1f1f1",
    "body-color": "#333"
  }
}
```

Run the chromatic command line tool [^3], pointing it to the token file and
requesting an output to SCSS:

```shell
$ npx chromatic tokens.yaml -o tokens.scss
```

```scss

```

Note that you do not need to setup a configuration file in order to get started.
However, a configuration file can be used for more complex setups and to
customize the output. You can even define your own output formats. More on this
later.

In the previous example the output format was determined based on the file
extension of the output file. You can also explicitly specify the output format,
or provide a directory as the output:

```shell
$ npx chromatic tokens.yaml --format scss/variables -o ./build
```

Additional properties can be associated with a design token, such as:

- a short comment
- a category to group related tokens together, for example when producing
  documentation
- an explicit type to insure proper formatting

```yaml
# tokens.yaml
tokens:
  background:
    value: FloralWhite
    type: color
    comment: 'The background color of the top-level container'
    category: 'background-color'
  body-color:
    value: '#333'
    comment: 'Text color for most body text'
    category: 'text-color'
```

```scss

```

## Scales and Nested Tokens

```yaml
# tokens.yaml
tokens:
  font-size:
    x-small: 10px;
    small: 12px
    medium: 16px
    large: 18px;
    x-large: 24px;
    xx-large: 36px;
```

## Aliases

The value of a token can reference another token by including it in curly
brackets.

```yaml
# tokens.yaml
tokens:
  font-size:
    x-small: 10px;
    small: 12px
    medium: 16px
    large: 18px;
    x-large: 24px;
    xx-large: 36px;
    body: '{font-size.medium}'
```

## Themes and Variants

### As separate files

### Multiple token values

## Customizing the output

The output of the build process can be customized using a configuration file.

```yaml
# ./config/chromatic.yaml
```

```shell
$ npx chromatic --config ./config/chromatic.yaml tokens.yaml ./build/tokens.scss
```

```scss

```

---

[^1] The term was introduced by Jina Bolton and Jon Levine and the Salesforce
Lightning Design System. YouTube:
[Using Design Tokens wiht the Lightning Design System](https://www.youtube.com/watch?v=wDBEc3dJJV8)

[^2] Chromatic supports JSON5 files which can include comments.

[^3] We use `npx`, a standard npm command line tool, to run the `chromatic`
command inside the `node_modules/` directory.
