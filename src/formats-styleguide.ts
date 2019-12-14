const marked = require('marked');
const highlight = require('highlight.js');
const handlebars = require('handlebars');
const fs = require('fs');

import { Color, isColor, isColorArray, roundTo } from './value';
import { getSimilarColors, getDeltaE, filterColor } from './color-functions';
import { RenderContext, Format } from './formats';

function renderColorSection(context: RenderContext): string {
    let result = '';
    const handlebarsContext = { colors: [], colorRamps: [], group: '' };
    const allColors: { name: string; color: Color }[] = [];
    context.themes.forEach(theme => {
        theme.tokens.forEach(token => {
            if (isColor(token.tokenValue))
                allColors.push({
                    name:
                        token.tokenId +
                        (theme.theme === '_' || theme.theme === ''
                            ? ''
                            : '.' + theme.theme),
                    color: token.tokenValue,
                });
        });
    });

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
                const similarColors = getSimilarColors(color, allColors);
                const similarProtanopiaColors = getSimilarColors(
                    color,
                    allColors,
                    'protanopia'
                );
                const similarDeuteranopiaColors = getSimilarColors(
                    color,
                    allColors,
                    'deuteranopia'
                )?.filter(x => !similarColors?.includes(x));
                const similarTritanopiaColors = getSimilarColors(
                    color,
                    allColors,
                    'tritanopia'
                );
                const similarColorsColorDeficient = [];
                [
                    ...(similarDeuteranopiaColors ?? []),
                    ...(similarTritanopiaColors ?? []),
                    ...(similarProtanopiaColors ?? []),
                ].forEach(x => {
                    // Add to the list if it's not:
                    // 1/ already in the list and
                    // 2/ not in the "normal" similar colors
                    // We want this list to only include colors that are similar
                    // for people with color deficiency
                    if (
                        similarColorsColorDeficient.findIndex(
                            y => y.name === x.name
                        ) < 0
                    ) {
                        if (
                            !similarColors ||
                            similarColors.findIndex(y => y.name === x.name) < 0
                        ) {
                            similarColorsColorDeficient.push(x);
                        }
                    }
                });
                handlebarsContext.colors.push({
                    name: token.tokenId,
                    value: token.tokenValue,
                    source: color.getSource(),
                    css: color.css(),
                    protanopiaCss: filterColor(color, 'protanopia').css(),
                    deuteranopiaCss: filterColor(color, 'deuteranopia').css(),
                    tritanopiaCss: filterColor(color, 'tritanopia').css(),
                    comment: token.tokenDefinition.comment ?? '',
                    cls,
                    opaqueColor: opaqueColor?.css(),
                    similarColors: {
                        normal: similarColors
                            ? similarColors.map(x => {
                                  return {
                                      name: x.name,
                                      css: x.color.css(),
                                      deltaE: roundTo(x.deltaE, 2),
                                  };
                              })
                            : null,
                        colorDeficient: similarColorsColorDeficient
                            ? similarColorsColorDeficient.map(x => {
                                  return {
                                      name: x.name,
                                      css: x.color.css(),
                                      deltaE: roundTo(x.deltaE, 2),
                                  };
                              })
                            : null,
                        protanopia: similarProtanopiaColors
                            ? similarProtanopiaColors.map(x => {
                                  return {
                                      name: x.name,
                                      css: x.color.css(),
                                      deltaE: roundTo(x.deltaE, 2),
                                  };
                              })
                            : null,
                        deuteranopia: similarDeuteranopiaColors
                            ? similarDeuteranopiaColors.map(x => {
                                  return {
                                      name: x.name,
                                      css: x.color.css(),
                                      deltaE: roundTo(x.deltaE, 2),
                                  };
                              })
                            : null,
                        tritanopia: similarTritanopiaColors
                            ? similarTritanopiaColors.map(x => {
                                  return {
                                      name: x.name,
                                      css: x.color.css(),
                                      deltaE: roundTo(x.deltaE, 2),
                                  };
                              })
                            : null,
                    },
                });
            } else if (isColorArray(token.tokenValue)) {
                let previousColor;
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
                        const deltaEWithPrevious =
                            previousColor && getDeltaE(color, previousColor);
                        previousColor = color;
                        return {
                            name: i === 0 ? '50' : i * 100,
                            cls,
                            value: color,
                            css: color.css(),
                            opaqueColor: opaqueColor?.css(),
                            deltaE:
                                deltaEWithPrevious < 2
                                    ? roundTo(deltaEWithPrevious, 2)
                                    : undefined,
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
