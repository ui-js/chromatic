const marked = require('marked');
const highlight = require('highlight.js');
const handlebars = require('handlebars');
const fs = require('fs');

import { Color, isColor, isColorArray } from './value';
import { RenderContext, Format } from './formats';

function renderColorSection(context: RenderContext): string {
    let result = '';
    const handlebarsContext = { colors: [], colorRamps: [], group: '' };
    context.themes.forEach(theme => {
        handlebarsContext.group =
            context.themes.length === 1
                ? ''
                : theme.theme === '_'
                ? 'Base'
                : theme.theme;
        handlebarsContext.colors = [];
        theme.tokens.forEach(token => {
            if (isColor(token.tokenValue)) {
                const color = token.tokenValue as Color;
                let cls = color.luma() >= 1.0 ? 'frame ' : '';
                if (color.luma() > 0.42) cls += 'light';
                let opaqueColor: Color;
                if (color.a < 1.0) {
                    opaqueColor = new Color(color);
                    opaqueColor.a = 1.0;
                }

                handlebarsContext.colors.push({
                    name: token.tokenId,
                    value: token.tokenValue,
                    source: color.getSource(),
                    css: color.css(),
                    comment: token.tokenDefinition.comment ?? '',
                    cls,
                    opaqueColor: opaqueColor?.css(),
                });
            } else if (isColorArray(token.tokenValue)) {
                handlebarsContext.colorRamps.push({
                    name: token.tokenId,
                    source: token.tokenValue.getSource(),
                    values: token.tokenValue.value.map((x, i) => {
                        const color = x as Color;
                        let cls = color.luma() >= 1.0 ? 'frame ' : '';
                        if (color.luma() > 0.42) cls += 'light';
                        let opaqueColor: Color;
                        if (color.a < 1.0) {
                            opaqueColor = new Color(color);
                            opaqueColor.a = 1.0;
                        }
                        return {
                            name: i === 0 ? '50' : i * 100,
                            cls,
                            value: color,
                            css: color.css(),
                            opaqueColor: opaqueColor?.css(),
                        };
                    }),
                });
            }
        });
        result += handlebars.compile(
            fs.readFileSync(__dirname + '/templates/html-colors.hbs', 'utf-8')
        )(handlebarsContext);
    });

    return result;
}

export const StyleGuideFormat: { formats: { [key: string]: Format } } = {
    formats: {
        'html/colors': {
            ext: '.html',
            render: renderColorSection,
        },
        html: {
            ext: '.html',
            render: (context: RenderContext): string =>
                context.renderTemplate(
                    fs.readFileSync(
                        __dirname + '/templates/html-file.hbs',
                        'utf-8'
                    ),
                    { ...context, 'color-section': renderColorSection(context) }
                ),
        },
    },
};

marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: (code: string): string => highlight.highlightAuto(code).value,
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false,
});
