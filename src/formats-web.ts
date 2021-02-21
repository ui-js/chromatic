// @todo more formats (https://github.com/amzn/style-dictionary/blob/3d0d1c0356d42fc83f905a7e7e4b1c662c77de0b/lib/common/formats.js)

// xCode .colorset: https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html#//apple_ref/doc/uid/TP40015170-CH59-SW1

/*
- sketch/palette
- sketch/palette/v2
*/

const fs = require('fs');
import { Format, RenderContext } from './formats';

export const WebFormats: { formats: { [key: string]: Format } } = {
  formats: {
    sass: {
      ext: '.scss',
      render: (context: RenderContext): string =>
        context.renderTemplate(
          fs.readFileSync(__dirname + '/templates/sass.hbs', 'utf-8'),
          context
        ),
    },
    css: {
      ext: '.css',
      render: (context: RenderContext): string =>
        context.renderTemplate(
          fs.readFileSync(__dirname + '/templates/css.hbs', 'utf-8'),
          context
        ),
    },
  },
};
