export const DefaultFormatters = {
    valueFormatters: {
        //         'color/hex': (value: Value, type: string): string =>
        //             type === 'color' ? value.hex() : value,
        //         'color/hsl': (value: Value, type: string): string =>
        //             type !== 'color' ? value : Color(value).hsl(),
        //         'color/plist': (value: Value, type: string): string => {
        //             if (type !== 'color') return value;
        //             const color = value.object();
        //             return `
        // <dict>
        //     <key>r</key><real>${color.r / 255}</real>
        //     <key>g</key><real>${color.g / 255}</real>
        //     <key>b</key><real>${color.b / 255}</real>
        // </dict>
        // `;
        //         },
    },

    nameFormatters: {
        camelcase: (name: string, theme: string): string =>
            (name + !theme ? '' : '.' + theme)
                .toLowerCase()
                .replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) =>
                    idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()
                )
                .replace(/\s+/g, ''),
        kebabcase: (name: string, theme: string): string =>
            (name + !theme ? '' : '.' + theme)
                .match(
                    /[A-Z]{2,}(?=[A-Z][a-z0-9]*|\b)|[A-Z]?[a-z0-9]*|[A-Z]|[0-9]+/g
                )
                .filter(Boolean)
                .map(x => x.toLowerCase())
                .join('-'),
        uppercase: (name: string, theme: string): string =>
            (name + !theme ? '' : '.' + theme).toUpperCase(),
        lowercase: (name: string, theme: string): string =>
            (name + !theme ? '' : '.' + theme).toLowerCase(),
    },
};
