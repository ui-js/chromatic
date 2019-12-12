import { Value } from './value';

export const DefaultFormatters = {
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
    handlebarsHelpers: {
        uppercase: (s: string): string => s.toUpperCase(),

        /**
         * Replace any invalid characters with a '-'
         * "{{sanitizeCssPropertyName "foo.bar"}} -> "foo-bar"
         */

        sanitizeCssPropertyName: (s: string): string =>
            s.replace(/[^a-zA-Z0-9_-]/g, '-'),

        /**
         * Return a CSS formatted representation of the value
         */

        cssValue: (v: Value): string => v?.css() ?? '[MISSING VALUE]',

        /**
         * In a list (\n separated lines), remove the trailing ","
         * on the last line that has one.
         * This is useful for JSON lists for example.
         */

        'remove-last-comma': function(context): string {
            const lines = context.fn(this).split('\n');
            const lastCommaLine = lines.reduce(
                (acc, v, idx) => (/,$/.test(v) ? idx : acc),
                -1
            );
            return lines
                .map((line, idx) =>
                    idx !== lastCommaLine ? line : line.slice(0, -1)
                )
                .join('\n');
        },

        /** Usage:
         * {{comment property}} -> "/* value of property * /"
         * {{comment property "# "}} -> "# value of property"
         * {{comment property "    # "}}} -> "    # value of property"
         * {{comment property "//}} -> "// value of property"
         */

        comment: function(s: string, format = '/* */'): string {
            if (typeof s !== 'string') {
                return this.comment;
            }
            if (!s) return '';
            // If there's only one argument passed to the helper
            // (i.e. {{comment foo}}) the second argument passed in is a context
            // object
            if (typeof format !== 'string') format = '/* */';
            const prefix = format.match(/(\s*)/)?.[1] ?? '';
            const suffix = format.slice(prefix.length);
            let [open, close] = suffix.split(' ');
            if (open === '/*' && close === '*/') {
                return (
                    prefix +
                    '/* ' +
                    s.split('\n').join('\n' + prefix + ' * ') +
                    '\n' +
                    prefix +
                    ' */'
                );
            }
            if (!close) {
                open = format.slice(prefix.length);
                close = '';
            }
            return (
                prefix +
                open +
                s.split('\n').join((close ?? '') + '\n' + prefix + open)
            );
        },
    },
};
