/*
- json/asset
- json/nested
- json/flat
- sketch/palette
- sketch/palette/v2
*/

import {
    Format,
    RenderPropertyContext,
    RenderGroupContext,
    RenderFileContext,
} from './formats';

export const GenericFormats: { formats: { [key: string]: Format } } = {
    formats: {
        yaml: {
            ext: '.yaml',

            renderFile: (context: RenderFileContext): string =>
                (!context.header
                    ? ''
                    : '# ' + context.header.split('\n').join('\n# ')) +
                '\ntokens:\n' +
                context.content,

            renderGroup: (context: RenderGroupContext): string =>
                '\t' + context.properties.join('\n\t'),

            renderProperty: (context: RenderPropertyContext): string =>
                `${
                    !context.definition.comment
                        ? ''
                        : '# ' + context.definition.comment + '\n\t'
                }${context.propertyName}: "${context.propertyValue.replace(
                    /"/g,
                    '\\"'
                )}"`,
        },

        json: {
            ext: '.json',

            renderFile: (context: RenderFileContext): string => context.content,

            renderGroup: (context: RenderGroupContext): string =>
                '{\n\t' + context.properties.join(',\n\t') + '\n}',

            renderProperty: (context: RenderPropertyContext): string =>
                `"${context.propertyName}": "${context.propertyValue}"`,
        },
    },
};
