Introducing Chromatic: a build tool for design systems

Scaling a design across all form factors and platforms has become the new challenge in the software industry. From watch to phone to tablet to desktop, teams must also consider iOS, Android, Win8 and HTML5 implementations. Opinions on native vs. HTML5 aside, most companies use a mix of both to balance the best user experience with time to market and reusability cross-platform.
So, how the heck do you apply the same design principles to a heterogeneous environment like this? And even more importantly, how can you keep changing the design in the future without causing major work for the development teams?

## Design Tokens

In a design system, people often use special entities called “design tokens” to store their “design decisions”.

These central and tiny pieces of UI information will be used across several platform during the conception of a digital product. They’re called: design tokens.

Design Tokens are design decisions propagated through a system -- Nathan Curtis, Eightshapes

With design tokens, you can capture low-level values and then use them to create the styles for your product or app. You can maintain a scalable and consistent visual system for UI development.

hese entities are in the shape of key/value pairs, saved in specific file formats (usually JSON or YAML). These files are later used as input files, processed and transformed to generate different output files, with different formats, to be included and consumed by other projects and codebases. (If you want to know more about design tokens, I suggest to read here, here and here).

Hundreds of tokens can become readable, intentional, and traceable decisions woven into a portfolio’s or enterprise’s products.

[Design Decisions] -> [Token Data (YAML)]\*
-> Token as Variables (SASS)
-> Token as CSS
-> Token Data (XML/Android)
-> Token Data (JSON/iOS)
-> Style Guide (HTML)

While it is possible to make some color transformations using Sass and Bourbon, those are CSS specific and do not carry over to other platforms. They also do not address theming.

## What

To translate this raw JSON data into a platform specific format we have developed Theo. Theo is built on top of Node.js and the code is open sourced on GitHub. It is published as an NPM module so it can be easily used in a Grunt or Gulp script or executed via command line.

Theo generates different output formats like variables for the common CSS preprocessors like Sass, Stylus and Less. But it also generates an XML version for Android or a JSON version for iOS. Within this process it’s transforming the raw data into a format which is compatible with any platform. Colors, for instance, might be hex values for CSS preprocessors but are RGBA for iOS and 8-digit hex values for Android (#AARRGGBB). Units for spacing and font sizes, as another example, are converted to px, em or rem for web; iOS gets pt (points) and Android gets sp (scale-independent pixels) or dip (density-independent pixels).

-   Conversion of color (CSS: hex, rgba; iOS: rgba; Android: hex-8), units (CSS: px, em, rem; iOS: pt; Android: sp, dp, dip)

-   aliases can be used before they are declared. And they don't need to be declared separately. As long as the definitions are not circular, it will get resolved.

-   hierarchical or categorical grouping

## Importing Token files

## Aliases

## Expressions

## Style Guide

Theo generates different output formats like variables for the common CSS preprocessors like Sass, Stylus and Less. But it also generates an XML version for Android or a JSON version for iOS. Within this process it’s transforming the raw data into a format which is compatible with any platform. Colors, for instance, might be hex values for CSS preprocessors but are RGBA for iOS and 8-digit hex values for Android (#AARRGGBB). Units for spacing and font sizes, as another example, are converted to px, em or rem for web; iOS gets pt (points) and Android gets sp (scale-independent pixels) or dip (density-independent pixels).

## Why

## Compared to other tools

-   theming
-   multi-platform (benefits of SASS but beyond the web)
-   more abstract. Fewer tokens to tweak/change.

#https://www.lightningdesignsystem.com/design-tokens/

https://medium.com/eightshapes-llc/tokens-in-design-systems-25dd82d58421

https://medium.com/salesforce-ux/living-design-system-3ab1f2280ef7

https://github.com/salesforce-ux/theo
