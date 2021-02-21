/*
- json/asset
- json/nested
- json/flat
- sketch/palette
- sketch/palette/v2
*/
const fs = require('fs');

import { Format, RenderContext } from './formats';

export const GenericFormats: { formats: { [key: string]: Format } } = {
  formats: {
    'yaml': {
      ext: '.yaml',

      render: (context: RenderContext): string =>
        context.renderTemplate(
          fs.readFileSync(__dirname + '/templates/yaml.hbs', 'utf-8'),
          context
        ),
    },

    'json': {
      ext: '.json',

      render: (context: RenderContext): string =>
        context.renderTemplate(
          fs.readFileSync(__dirname + '/templates/json.hbs', 'utf-8'),
          context
        ),

      handlebarsHelpers: {},
    },
    'data-dump': {
      ext: '.yaml',

      render: (context: RenderContext): string =>
        context.renderTemplate(
          fs.readFileSync(__dirname + '/templates/data-dump.hbs', 'utf-8'),
          context
        ),
    },
  },
};
