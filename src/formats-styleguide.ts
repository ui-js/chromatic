const marked = require('marked');
const highlight = require('highlight.js');
const handlebars = require('handlebars');
const fs = require('fs');
import { Color } from './value-parser';

import {
    RenderFileContext,
    RenderPropertyContext,
    RenderGroupContext,
    Format,
} from './formats';

function renderFragment(context: RenderFileContext): string {
    let result = '';
    const handlebarsContext = { colors: [], group: '' };
    context.themes.forEach(theme => {
        handlebarsContext.group =
            context.themes.length === 1 ? '' : theme === '_' ? 'Base' : theme;
        handlebarsContext.colors = [];
        context.definitions.forEach((def, token) => {
            if (def.value[theme]) {
                const qualifiedToken =
                    token + (theme === '_' ? '' : '.' + theme);
                const value = context.rawValues.get(qualifiedToken);
                if (value.type() === 'color') {
                    const color = value as Color;
                    let cls = color.luma() >= 1.0 ? 'frame ' : '';
                    if (color.luma() > 0.42) cls += 'light';
                    let opaqueColor;
                    if (color.a < 1.0) {
                        opaqueColor = new Color(color);
                        opaqueColor.a = 1.0;
                    }

                    handlebarsContext.colors.push({
                        name: token,
                        def: def.value,
                        value: color.css(),
                        comment: def.comment ?? '',
                        cls: cls,
                        opaqueColor: opaqueColor?.css(),
                    });
                }
            }
        });
        result += handlebars.compile(
            fs.readFileSync(__dirname + '/templates/html-colors.hbs', 'utf-8')
        )(handlebarsContext);
    });

    if (result) {
        result = '<h2>Colors</h2>' + result;
    }
    return result;
}

function renderFile(context: RenderFileContext): string {
    return handlebars.compile(
        fs.readFileSync(__dirname + '/templates/html-file.hbs', 'utf-8')
    )(context);
}

function renderGroup(context: RenderGroupContext): string {
    return renderFragment(context);
}

function renderProperty(context: RenderPropertyContext): string {
    let result = '';
    result += `<b>${context.propertyName}</b>: ${context.propertyValue}`;
    if (context.definition.comment) {
        result += `<p>${context.definition.comment}</p>`;
    }
    if (context.definition.remarks) {
        result += marked(context.definition.remarks);
    }

    return result;
}

export const StyleGuideFormat: { formats: { [key: string]: Format } } = {
    formats: {
        'html/fragment': {
            ext: '.html',

            renderFile: renderFragment,

            renderGroup: renderGroup,

            renderProperty: renderProperty,
        },
        html: {
            extends: 'html/fragment',

            renderFile: renderFile,
        },
    },
};

marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function(code: string): string {
        return highlight.highlightAuto(code).value;
    },
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false,
});
