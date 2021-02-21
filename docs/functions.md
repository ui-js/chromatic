## Functions

### **`calc`**`(any)`

Return the argument. This function is here for compatibility with CSS which
requires it when evaluating expressions. However, expressions are evaluated
automatically in Chromatic.

### **`rgb`**`(red, green, blue, alpha?)` <br> **`rgba`**(red, green, blue, alpha?)<br> **`hsl`**(hue, saturation, lightness, alpha?) <br> **`hsla`**(hue, saturation, lightness, alpha?)<br>**`hsv`**(hue, saturation, value, alpha?)<br> **`hwb`**(hue, whitness, blackness, alpha?) <br> **`lab`**(l, a, b, alpha?)

Create a color with the specified color model. The arguments are:

- `red`, `green`, `blue`: 0..255
- `alpha`: a percentage (e.g. `80%`) or a number 0..1 (e.g. `0.80`). Optional.
- `hue`: an angle (e.g. `230deg`)
- `saturation`, `lightness`, `value`, `whiteness`, blackness
- `l`, `a`, `b`: L: 0..1, a,b: -128..128

### **`filter`**`(color, filter)`

Apply a simple filter to a color. The filter can be one of:

- `"none"`: return the inpuyt color, unchanged
- `"grayscale"`: return a grayscale version of the input color
- `"deuteranopia"`: green color deficiency (6% of male population)
- `"protanopia"`: red color deficiency (2% of male population)
- `"tritanopia"`: blue color deficiency

###

|              |                                                              |     |
| ------------ | ------------------------------------------------------------ | --- |
| gray()       | 'number \| percentage, number \| percentage \| none'         |     |
| min()        | 'any, any'                                                   |     |
| max()        | 'any, any'                                                   |     |
| clamp()      | 'any, any, any'                                              |     |
| mix()        | 'color, color, number \| percentage \| none, string \| none' |     |
| saturate()   | 'color, number \| percentage \| none'                        |     |
| desaturate() | 'color, number \| percentage \| none'                        |     |
| lighten()    | 'color, number \| percentage \| none'                        |     |
| darken()     | 'color, number \| percentage \| none'                        |     |
| rotateHue()  | 'color, angle \| number \| none'                             |     |
| complement() | 'color'                                                      |     |
| contrast()   | 'color, color \| none, color \| none'                        |     |
| tint()       | 'color, number \| percentage \| none'                        |     |
| shade()      | 'color, number \| percentage \| none'                        |     |
| filter()     | 'color, string'                                              |     |
