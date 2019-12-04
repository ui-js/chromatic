## Functions

### **`calc`**`(any)`

Return the argument. This function is here for compatibility with CSS which
requires it when evaluating expressions. However, expressions are evaluated
automatically in Chromatic.

### **`rgb`**`(red, gree, blue, alpha?)` <br> **`rgba`**(red, gree, blue, alpha?)<br> **`hsl`**(hue, saturation, lightness, alpha?) <br> **`hsla`**(hue, saturation, lightness, alpha?)<br>**`hsv`**(hue, saturation, value, alpha?)<br> **`hwb`**(hue, whitness, blackness, alpha?) <br> **`lab`**(l, a, b, alpha?)

Create a color with the specified color model. The arguments are:

-   `red`, `green`, `blue`: 0..255
-   `alpha`: a percentage (e.g. `80%`) or a number 0..1 (e.g. `0.80`). Optional.
-   `hue`: an angle (e.g. `230deg`)
-   `saturation`, `lightness`, `value`, `whiteness`, blackness
-   `l`, `a`, `b`:

###

| gray() | 'number | percentage, number | percentage | none' | |
| min() | 'any, any' | |
| max() | 'any, any' | |
| clamp() | 'any, any, any' | |
| mix() | 'color, color, number | percentage | none, string | none' | |
| saturate() | 'color, number | percentage | none' | |
| desaturate() | 'color, number | percentage | none' | |
| lighten() | 'color, number | percentage | none' | |
| darken() | 'color, number | percentage | none' | |
| rotateHue() | 'color, angle | number | none' | |
| complement() | 'color' | |
| contrast() | 'color, color | none, color | none' | |
| tint() | 'color, number | percentage | none' | |
| shade() | 'color, number | percentage | none' | |
