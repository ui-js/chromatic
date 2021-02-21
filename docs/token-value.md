# Token Value

A token value can contain:

- A simple value such as `12px` or`#9370db`
- An alias, a reference to another token: `{brand.color}`
- An expression, a set of literals, operators and function calls that evaluate
  to a single value.

For example:

```yaml
tokens:
  primary-background: 'darken(lab(54.975%, 36.8, -50.097))'
```

## Aliases

Aliases reference the value of another token. They are enclosed in curly
brackets and include a dot-separated 'path' to the token they reference.

```yaml
tokens:
  brand:
    primary: 'LightGoldenRodYellow'
    secondary: 'DarkTurquoise'
  background: '{brand.primary}'
```

## Literals

The following types of literals can be used:

| Type        |               |                                                    |
| ----------- | ------------- | -------------------------------------------------- | ---- | --- | ----- | --- | --- | ---- | ----- |
| **number**  | `3.54`        | A floating point, unitless, number                 |
| **angle**   | `12deg`       | Units: `deg                                        | grad | rad | turn` |
| **percent** | `25%`         | A number followed by a `%`                         |
| **color**   | `#fc374a`     | A set of 3, 4, 6 or 8 hex digits preceded by a `#` |
| **length**  | `3em`         | Relative units: `em                                | ex   | ch  | rem   | vw  | vh  | vmin | vmax` |
|             | `3px`         | Absolute units: `cm                                | mm   | Q   | in    | pc  | pt  | px`  |
| **string**  | `"Helvetica"` | Enclosed in double-quotes                          |

Some arithmetic operations can be performed between literals, if their types are
compatibl. For example, you can't divide a color by a length, but you can
multiply a number by a length.

Relative units cannot be evaluated (since their value is not known until
rendering time). However, although `rem` is a relative unit, its value can be
'fixed' by defining the `base-font-size` property in the configuration file, in
pixels.

```yaml
tokens:
  length: '36pt + 5px'
  angle: '.5turn - 10deg'
  percent: '(100 / 3)%'
  string: '"The answer is " + (84 / 2)'
```

## Functions

| Name           | Arguments                      |                                                                                                                                                                                                                                                                                      |
| -------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **rgb**        | `(red, green, blue [, alpha])` | Each color channel should be in the [0...255] range. The alpha value is either a number in the [0...1] range, or a percentage                                                                                                                                                        |
| **hsl**        | `(h, s, l, [, alpha])`         | The hue is an angle (or a number in the [0...360] range), the saturation and lightness are numbers in the [0...1] range or percentages                                                                                                                                               |
| **hsv**        | `(h, s, b, [, alpha]`          | The hue is an angle (or a number in the [0...360] range), the saturation and brightness are numbers in the [0...1] range or percentages. Note that the **hsv\* color model is also called **hsb\*\*                                                                                  |
| **hwb**        | `(h, w, b, [, alpha])`         | The hue is an angle (or a number in the [0...360] range), the whiteness and blackness are numbers in the [0...1] range or percentages.                                                                                                                                               |
| **lab**        | `(l, a, b, [, alpha])`         | The lightness is a number in the [0...1] range or a percentage. The a and b arguments are numbers, theoretically unbounded but in practice in the [-160...160] range                                                                                                                 |
| **gray**       | `(g, [, alpha])`               | The g argument is a number in the [0..1] range or a percentage. It is defined such that `gray(50%)` is a visual mid-gray, perceptrually equidistant between black and white. It is equivalent to `lab(g, 0, 0)`                                                                      |
| **min**        | `(a, b)`                       | The smallest of the two arguments                                                                                                                                                                                                                                                    |
| **max**        | `(a, b)`                       | The largest of the two arguments                                                                                                                                                                                                                                                     |
| **clamp**      | `(low, x, high)`               | If `x` is less than `low`, return `low`. If x is greater than `high`, return `high`                                                                                                                                                                                                  |
| **mix**        | `(c1, c2, [weight [, model]])` | Combine the two colors c1 and c2, according to the weight specified (a number in the [0...1] range or a percentage. If no weight is provided, the colors are mixed equally. The model is 'rgb' by default, but 'hsl' can be used as well                                             |
| **tint**       | `(c[, w])`                     | Mix the color c with white. If w is not provided, defaults to 10%                                                                                                                                                                                                                    |
| **shade**      | `(c[, w])`                     | Mix the color c with black. If w is not provided, defaults to 10%                                                                                                                                                                                                                    |
| **saturate**   | `(c, v)`                       | Increase the saturation of the color c. The second argument is a number in the range [0...1] or a percentage. The increase is relative, not absolute. So if a color has a 50% saturation, increasing the saturation by 10% will yield a new color with a saturation of 55% (not 60%) |
| **desaturate** | `(c, v)`                       | The opposite of **saturate**.                                                                                                                                                                                                                                                        |
| **lighten**    | `(c, v)`                       | Increase the ligthness of a color. Like **saturate**, the increase is relative.                                                                                                                                                                                                      |
| **darken**     | `(c, v)`                       | The opposite of **lighten**.                                                                                                                                                                                                                                                         |
| **rotateHue**  | `(c, v)`                       | Change the hue by adding (or substracting) the value v, which must be a number in the [-180, +180] range.                                                                                                                                                                            |
| **complement** | `(c)`                          | Provide the complementary color to c. Equivalent to `rotateHue(c, 180)`                                                                                                                                                                                                              |
| **contrast**   | `(base, [dark, light])`        | Return either the dark or the light color, whichever has the highest contrast on the base color. If dark and light are not provided, they default to black and white.                                                                                                                |

The `alpha` value is a number in the [0...1] range or a percentage.
