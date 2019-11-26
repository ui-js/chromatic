// @todo more formats (https://github.com/amzn/style-dictionary/blob/3d0d1c0356d42fc83f905a7e7e4b1c662c77de0b/lib/common/formats.js)

// xCode .colorset: https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html#//apple_ref/doc/uid/TP40015170-CH59-SW1

/*
- json/asset
- json/nested
- json/flat
- sketch/palette
- sketch/palette/v2
*/

import {
    RenderFileContext,
    RenderPropertyContext,
    RenderGroupContext,
} from './formats';

function sanitizePropertyNameForCSS(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function renderSassProperty(context: RenderPropertyContext): string {
    return `${
        !context.definition.comment
            ? ''
            : '// ' + context.definition.comment + '\n'
    }\$${sanitizePropertyNameForCSS(context.propertyName)}: ${
        context.propertyValue
    } !default;`;
}

function renderCssCustomProperty(context: RenderPropertyContext): string {
    return `--${sanitizePropertyNameForCSS(context.propertyName)}: ${
        context.propertyValue
    };`;
}

function renderSassGroup(context: RenderGroupContext): string {
    let result = '';

    // Render CSS variables
    // (i.e. tokens with more than one theme defined)
    const themedTokens: { [theme: string]: string[] } = {};
    const nonThemedTokens: string[] = [];
    context.definitions.forEach((def, token) => {
        if (Object.keys(def.value).length > 1) {
            Object.keys(def.value).forEach(theme => {
                if (!themedTokens[theme]) themedTokens[theme] = [];
                themedTokens[theme].push(token);
            });
        } else {
            nonThemedTokens.push(token);
        }
    });

    Object.keys(themedTokens).forEach(theme => {
        const customProperties = themedTokens[theme]
            .map(token =>
                renderCssCustomProperty({
                    ...context,
                    theme: theme,
                    category: '',
                    token: token,
                    definition: context.definitions.get(token),
                    propertyName: token,
                    propertyValue: context.values.get(
                        token + (theme === '_' ? '' : '.' + theme)
                    ),
                })
            )
            .join('\n\t');
        // if (theme === 'dark' || theme === 'light') {
        //     result += `@media (prefers-color-scheme: ${theme}) {\n\t${customProperties}\n}\n`;
        // }
        if (theme === '_') {
            result += `:root {\n\t${customProperties}\n}\n`;
        } else {
            result += `body[data-theme="${theme}"] {\n\t${customProperties}\n}\n`;
        }
    });

    // Render non-CSS variables
    // (i.e. tokens that have a single theme defined)
    result += nonThemedTokens
        .map(token =>
            renderSassProperty({
                ...context,
                category: '',
                theme: '',
                token: token,
                definition: context.definitions.get(token),
                propertyName: token,
                propertyValue: context.values.get(token),
            })
        )
        .join('\n');

    return result;
}

export const WebFormats = {
    formats: {
        sass: {
            ext: '.scss',
            renderFile: (context: RenderFileContext): string =>
                (!context.header
                    ? ''
                    : '/* ' +
                      context.header.split('\n').join('\n * ') +
                      '\n */\n\n') + context.content,

            renderProperty: renderSassProperty,

            renderGroup: renderSassGroup,
        },

        plist: {
            ext: '.plist',
            renderFile: (context: RenderFileContext): string =>
                `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n\n` +
                (context.header
                    ? '<!-- \n' + context.header + '\n-->\n\n'
                    : '') +
                context.content,
            renderGroup: (context: RenderGroupContext): string =>
                `<plist version="1.0"><dict>\n\t${context.properties.join(
                    '\n\t'
                )}\n</dict></plist>`,
            renderProperty: (context: RenderPropertyContext): string =>
                `${
                    context.definition.comment
                        ? '<!-- ' + context.definition.comment + ' -->\n\t'
                        : ''
                }<key>${context.propertyName}</key>\n\t<string>${
                    context.propertyValue
                }</string> `,
            valueFormatters: ['color/plist'],
        },

        // 'css/custom-properties': {
        //     extends: 'css',
        //     filenameTemplate: (basename, _theme) => basename + '-' + _theme,
        //     groupTemplate: options =>
        //         `:root{\n\t--${options.properties.join('\n\t--')}\n}\n\n`,
        // },
        // css: {
        //     ext: '.css',
        //     fileHeader: 'Auto-generated. Do not edit.',
        //     nameFormatters: ['kebabcase', 'append-theme'],
        //     propertyTemplate: (name, value, token) =>
        //         `${name}: ${value}; ${
        //             token.comment ? '/* ' + token.comment + ' */' : ''
        //         }`,
        //     filenameTemplate: (basename, theme) => basename + '-' + theme,
        //     groupTemplate: options =>
        //         `:root{\t\n\n${options.properties.join('\n\t,  ')}\n}`,
        //     fileTemplate: options =>
        //         (options.header ? '/* ' + options.header + '*/\n\n' : '') +
        //         options.content,
        // },
        // js: {},
    },
};
