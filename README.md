# Chromatic

A tool to help manage design systems by generating platform-specific files from a source file describing design tokens.

### Expressive Design Tokens

Tokens can contain rich expressions in a natural syntax, including arithmetic operations, units (`12px`), function (`rgb()`, `mix()`, `saturate()`...) and references to other tokens.

```yaml
tokens:
    primary-hue: '210deg'
    primary: 'hsl({primary-hue}, 100%, 40%)'
    primary-dark: 'darken({primary}, 20%)'

    line-height: '18pt + 5px'
```

### Themes

Each token can have a theme variant, such as dark/light, or compact/cozy layouts. The necessary output artifacts are generated automatically.

```yaml
tokens:
    cta-button-background:
        value:
            dark: '#004082'
            light: '#0066ce'
```

### Zero-conf

Get going quickly. A simple **token file** written YAML or JSON file is all you need.

But Chromatic is also customizable when you need to. You can write or modify the format of the output files to suit your needs.

Chromatic is also available as an API that can be invoked from a build system.

### Multi-platform

From a single token file, generate platform specific artifacts:

-   for the web (Sass, CSS)
-   for iOS (JSON, plist)
-   for Android (XML)

Chromatic can also generate a style guide as a HTML file.

## Getting started with Chromatic

```shell
$ npm install -g @arnog/chromatic
```

```yaml
# tokens.yaml
tokens:
    background: '#f1f1f1'
    body-color: '#333'
```

```shell
$ chromatic tokens.yaml -o tokens.scss
```

```scss
$background: #f1f1f1 !default;
$body-color: #333 !default;
```

Now, let's create a dark theme:

```yaml
# tokens-dark.yaml
theme: dark
tokens:
    background: '#222'
    body-color: '#a0a0a0'
```

```yaml
# tokens.yaml
import: ./tokens-dark.yaml
tokens:
    background: '#f1f1f1'
    body-color: '#333'
```

```shell
$ chromatic tokens.yaml -o tokens.scss
```

```scss
:root {
    --background: #f1f1f1;
    --body-color: #333;
}
body[data-theme='dark'] {
    --background: #222;
    --body-color: #a0a0a0;
}
```
