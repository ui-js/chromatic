# Error Message

```shell
The "tokens" property is an array. It should be a key/value map of tokens.
```

While parsing a token file, a `"tokens"` property was encountered which was encoded as an array, denoted
by a "-" in front of the element names in YAML.

```yaml
# ❌
tokens:
    - red: '#f00'
    - green: '#0f0'
```

Instead, each token should be a key/value pair:

```yaml
# ✔︎
tokens:
    red: '#f00'
    green: '#0f0'
```

This error can also occur if a children of a token includes an array instead
of key/value pair:

```yaml
# ❌
tokens:
    red:
        - dark: '#c00'
        - light: '#d00'
```

Instead:

```yaml
# ✔︎
tokens:
    red:
        dark: '#c00'
        light: '#d00'
```
