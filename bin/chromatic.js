var e;
Object.defineProperty(exports, '__esModule', { value: !0 }),
    (function (e) {
        (e[(e.NoError = 0)] = 'NoError'),
            (e[(e.SyntaxError = 1)] = 'SyntaxError'),
            (e[(e.UnexpectedOpenBracket = 2)] = 'UnexpectedOpenBracket'),
            (e[(e.ExpectedCloseBracket = 3)] = 'ExpectedCloseBracket'),
            (e[(e.ExpectedCloseCurlyBracket = 4)] =
                'ExpectedCloseCurlyBracket'),
            (e[(e.ExpectedOpenParen = 5)] = 'ExpectedOpenParen'),
            (e[(e.ExpectedCloseParen = 6)] = 'ExpectedCloseParen'),
            (e[(e.ExpectedQuote = 7)] = 'ExpectedQuote'),
            (e[(e.UnknownToken = 8)] = 'UnknownToken'),
            (e[(e.UnknownUnit = 9)] = 'UnknownUnit'),
            (e[(e.UnknownFunction = 10)] = 'UnknownFunction'),
            (e[(e.MissingArgument = 11)] = 'MissingArgument'),
            (e[(e.ExpectedArgument = 12)] = 'ExpectedArgument'),
            (e[(e.TooManyArguments = 13)] = 'TooManyArguments'),
            (e[(e.InvalidArgument = 14)] = 'InvalidArgument'),
            (e[(e.ExpectedOperand = 15)] = 'ExpectedOperand'),
            (e[(e.InvalidOperand = 16)] = 'InvalidOperand'),
            (e[(e.InvalidUnaryOperand = 17)] = 'InvalidUnaryOperand'),
            (e[(e.ExpectedIntegerIndex = 18)] = 'ExpectedIntegerIndex'),
            (e[(e.CircularDefinition = 19)] = 'CircularDefinition'),
            (e[(e.UnexpectedTokensArray = 20)] = 'UnexpectedTokensArray'),
            (e[(e.UnexpectedTokensType = 21)] = 'UnexpectedTokensType'),
            (e[(e.InvalidTokenName = 22)] = 'InvalidTokenName'),
            (e[(e.InvalidTokenValue = 23)] = 'InvalidTokenValue'),
            (e[(e.InconsistentTokenType = 24)] = 'InconsistentTokenType'),
            (e[(e.UnknownFormat = 25)] = 'UnknownFormat'),
            (e[(e.UnknownValueFormatter = 26)] = 'UnknownValueFormatter'),
            (e[(e.UnknownNameFormatter = 27)] = 'UnknownNameFormatter');
    })(e || (e = {}));
const t = {
    [e.SyntaxError]: 'Syntax error',
    [e.UnexpectedOpenBracket]: 'Unexpected `[`',
    [e.ExpectedCloseBracket]: 'Expected `]`',
    [e.ExpectedCloseCurlyBracket]: 'Expected `}`',
    [e.ExpectedOpenParen]: 'Expected `(`',
    [e.ExpectedCloseParen]: 'Expected `)`',
    [e.ExpectedQuote]: 'Expected `"`',
    [e.UnknownToken]: 'Unknown token `%1`%2',
    [e.UnknownUnit]: 'Unknown unit `%1`',
    [e.UnknownFunction]: 'Unknown function `%1`%2',
    [e.MissingArgument]: 'Missing argument %1 of `%2` of type `%3`',
    [e.ExpectedArgument]: 'Expected argument %1 of `%2` to be of type `%3`',
    [e.TooManyArguments]: 'Too many arguments for function `%1(%2)`',
    [e.InvalidArgument]: 'Invalid argument `%2` for function `%1`%3',
    [e.ExpectedOperand]: 'Expected operand',
    [e.InvalidOperand]: 'Invalid operand',
    [e.InvalidUnaryOperand]: 'Invalid operand',
    [e.CircularDefinition]: 'Circular definition of the "%1" token',
    [e.UnexpectedTokensArray]:
        'The "tokens" property is an array. It should be a key/value map of tokens.\n%1',
    [e.UnexpectedTokensType]:
        'The "tokens" property should be a key/value map of tokens.',
    [e.InvalidTokenName]:
        'Invalid token name "%1": it must only contain digits, letters, "_" and "-"',
    [e.InvalidTokenValue]:
        'The "%1" token is invalid. If using a YAML file, make sure RGB hex values are within quotes',
    [e.InconsistentTokenType]: 'Inconsistent token type in valus of token "%1"',
    [e.UnknownFormat]: 'Unknown format "%1"%2',
    [e.UnknownValueFormatter]: 'Unknown value formatter "%1"%2',
    [e.UnknownNameFormatter]: 'Unknown name formatter "%1"%2',
    [e.ExpectedIntegerIndex]: 'Expected array index to be a number',
};
class n extends Error {
    constructor(e, ...n) {
        super(t[e]), (this.code = e), (this.args = n);
    }
}
function r(e, t, ...n) {
    e && s(void 0, t, ...n);
}
function a(e, ...t) {
    s(void 0, e, ...t);
}
function s(n, r, ...a) {
    var s;
    let o = '';
    throw (
        (process.env.TEST
            ? (o = '[ERR] ' + (null !== (s = e[r]) && void 0 !== s ? s : r))
            : (n && (o = n.join('\n') + '\n'),
              (o += t[r]),
              a.forEach((e, t) => {
                  o = o.replace(new RegExp(`%${t + 1}`, 'g'), e);
              })),
        new Error(o))
    );
}
const o = require('string-similarity');
function i(e, t) {
    const n = (function (e, t) {
        if (!e || !t) return '';
        let n;
        if (
            ((n =
                t instanceof Map
                    ? Array.from(t.keys())
                    : Array.isArray(t)
                    ? t
                    : Object.keys(t)),
            0 === n.length)
        )
            return '';
        const r = o.findBestMatch(e, n);
        return r.bestMatch.rating > 0.1 ? r.bestMatch.target : '';
    })(e, t);
    return n ? `. Did you mean "${n}"?` : '';
}
const l = {
        nameFormatters: {
            camelcase: (e, t) =>
                (e + !t ? '' : '.' + t)
                    .toLowerCase()
                    .replace(/(?:^\w|[A-Z]|\b\w)/g, (e, t) =>
                        0 === t ? e.toLowerCase() : e.toUpperCase()
                    )
                    .replace(/\s+/g, ''),
            kebabcase: (e, t) =>
                (e + !t ? '' : '.' + t)
                    .match(
                        /[A-Z]{2,}(?=[A-Z][a-z0-9]*|\b)|[A-Z]?[a-z0-9]*|[A-Z]|[0-9]+/g
                    )
                    .filter(Boolean)
                    .map((e) => e.toLowerCase())
                    .join('-'),
            uppercase: (e, t) => (e + !t ? '' : '.' + t).toUpperCase(),
            lowercase: (e, t) => (e + !t ? '' : '.' + t).toLowerCase(),
        },
        handlebarsHelpers: {
            uppercase: (e) => e.toUpperCase(),
            sanitizeCssPropertyName: (e) => e.replace(/[^a-zA-Z0-9_-]/g, '-'),
            cssValue: (e) => {
                var t;
                return null !== (t = null == e ? void 0 : e.css()) &&
                    void 0 !== t
                    ? t
                    : '[MISSING VALUE]';
            },
            'remove-last-comma': function (e) {
                const t = e.fn(this).split('\n'),
                    n = t.reduce((e, t, n) => (/,$/.test(t) ? n : e), -1);
                return t
                    .map((e, t) => (t !== n ? e : e.slice(0, -1)))
                    .join('\n');
            },
            comment: function (e, t = '/* */') {
                var n, r;
                if ('string' != typeof e) return this.comment;
                if (!e) return '';
                'string' != typeof t && (t = '/* */');
                const a =
                        null !==
                            (r =
                                null === (n = t.match(/(\s*)/)) || void 0 === n
                                    ? void 0
                                    : n[1]) && void 0 !== r
                            ? r
                            : '',
                    s = t.slice(a.length);
                let [o, i] = s.split(' ');
                return '/*' === o && '*/' === i
                    ? a +
                          '/* ' +
                          e.split('\n').join('\n' + a + ' * ') +
                          '\n' +
                          a +
                          ' */'
                    : (i || ((o = t.slice(a.length)), (i = '')),
                      a +
                          o +
                          e
                              .split('\n')
                              .join((null != i ? i : '') + '\n' + a + o));
            },
        },
    },
    u = `\nThis file was automatically generated by Chromatic.\nDo not edit.\nGenerated ${new Date().toISOString()}\n`,
    c = require('color-name');
function h(e) {
    return e < 0 ? 0 : e > 255 ? 255 : Math.round(e);
}
class p {
    constructor() {
        this.source = '';
    }
    css() {
        return '';
    }
    type() {}
    canonicalScalar() {
        return 0;
    }
    getSource() {
        return this.source;
    }
    setSource(e) {
        this.source = e;
    }
    equals(e) {
        return (
            this.type() === e.type() &&
            this.canonicalScalar() == e.canonicalScalar()
        );
    }
}
function m(e, t) {
    return Math.round(e * Math.pow(10, t) + 1e-14) / Math.pow(10, t);
}
class d extends p {
    constructor(e) {
        super(), (this.value = e);
    }
    css() {
        return m(this.value, 2) + '%';
    }
    type() {
        return 'percentage';
    }
    canonicalScalar() {
        return this.value / 100;
    }
    equals(e) {
        if (j(e)) {
            const t = R(this),
                n = R(e);
            return [...Object.keys(t.value), ...Object.keys(n.value)].every(
                (e) => t.value[e] === n.value[e]
            );
        }
        return !1;
    }
}
class f extends p {
    constructor(e, t) {
        super(), (this.value = e), (this.unit = t);
    }
    css() {
        return m(this.value, 2) + this.unit;
    }
    type() {
        return 'angle';
    }
    canonicalScalar() {
        return V(this);
    }
}
class v extends p {
    constructor(e, t) {
        if ((super(), 'number' == typeof e))
            (this.value = e), (this.unit = 0 === e ? 'px' : t);
        else if (void 0 === t) {
            const t = Object.keys(e).filter(
                (t) => 'number' == typeof e[t] && 0 !== e[t]
            );
            0 === t.length
                ? ((this.value = 0), (this.unit = 'px'))
                : 1 === t.length
                ? ((this.value = e[t[0]]), (this.unit = t[0]))
                : ((this.value = e), (this.unit = 'multi'));
        } else
            (this.value = e),
                (this.unit = 'multi'),
                console.assert('multi' === t);
    }
    css() {
        if ('number' == typeof this.value)
            return 0 === this.value || isNaN(this.value)
                ? Number(this.value).toString()
                : m(this.value, 2) + this.unit;
        const e = {};
        let t = Object.keys(this.value);
        if (t.length > 1) {
            let n = 0;
            t.forEach((t) => {
                const r = D(this.value[t], t);
                isNaN(r) ? 'px' !== t && (e[t] = this.value[t]) : (n += r);
            }),
                0 !== n && (e.px = n);
        } else e[t[0]] = this.value[t[0]];
        return (
            (t = Object.keys(e)),
            1 === t.length
                ? 'px' === t[0] && 0 === e.px
                    ? '0'
                    : m(e[t[0]], 2) + t[0]
                : 'calc(' +
                  t.map((t) => Number(e[t]).toString() + t).join(' + ') +
                  ')'
        );
    }
    type() {
        return 'length';
    }
    canonicalScalar() {
        return 'multi' === this.unit ? NaN : D(this.value, this.unit);
    }
}
class g extends p {
    constructor(e, t) {
        super(), (this.value = e), (this.unit = t);
    }
    css() {
        return m(this.value, 2) + this.unit;
    }
    type() {
        return 'time';
    }
    canonicalScalar() {
        return 'ms' === this.unit ? this.value / 1e3 : this.value;
    }
}
class w extends p {
    constructor(e, t) {
        super(), (this.value = e), (this.unit = t);
    }
    css() {
        return m(this.value, 2) + this.unit;
    }
    type() {
        return 'frequency';
    }
    canonicalScalar() {
        return 'khz' === this.unit ? 1e3 * this.value : this.value;
    }
}
class y extends p {
    constructor(e) {
        super(), (this.value = e);
    }
    css() {
        return Number(this.value).toString();
    }
    type() {
        return 'number';
    }
    canonicalScalar() {
        return this.value;
    }
}
class b extends p {
    constructor(e) {
        super(), (this.value = e);
    }
    css(e = '') {
        return e + this.value + e;
    }
    type() {
        return 'string';
    }
    canonicalScalar() {
        return parseFloat(this.value);
    }
    equals(e) {
        return C(e) && this.value === e.value;
    }
}
class x extends p {
    constructor(e) {
        super(), (this.value = e.map(O));
    }
    get(e) {
        return this.value[e];
    }
    type() {
        return 'array';
    }
    css() {
        return '[' + this.value.map((e) => e.css()).join(', ') + ']';
    }
    equals(e) {
        return (
            $(e) &&
            this.value.length === e.value.length &&
            this.value.every((t, n) => t === e.value[n])
        );
    }
}
function k(e, t, n) {
    return (
        n < 0 && (n += 6),
        n >= 6 && (n -= 6),
        n < 1 ? (t - e) * n + e : n < 3 ? t : n < 4 ? (t - e) * (4 - n) + e : e
    );
}
function E(e, t, n) {
    (e = ((e + 360) % 360) / 60),
        (n = Math.max(0, Math.min(n, 1))),
        (t = Math.max(0, Math.min(t, 1)));
    const r = n <= 0.5 ? n * (t + 1) : n + t - n * t,
        a = 2 * n - r;
    return {
        r: Math.round(255 * k(a, r, e + 2)),
        g: Math.round(255 * k(a, r, e)),
        b: Math.round(255 * k(a, r, e - 2)),
    };
}
function M(e, t, n) {
    (e /= 255), (t /= 255), (n /= 255);
    const r = Math.min(e, t, n),
        a = Math.max(e, t, n),
        s = a - r;
    let o, i;
    a === r
        ? (o = 0)
        : e === a
        ? (o = (t - n) / s)
        : t === a
        ? (o = 2 + (n - e) / s)
        : n === a && (o = 4 + (e - t) / s),
        (o = Math.min(60 * o, 360)),
        o < 0 && (o += 360);
    const l = (r + a) / 2;
    return (
        (i = a === r ? 0 : l <= 0.5 ? s / (a + r) : s / (2 - a - r)),
        { h: o, s: i, l: l }
    );
}
class I extends p {
    constructor(e) {
        if ((super(), 'string' == typeof e))
            if ('transparent' === e.toLowerCase())
                ([this.r, this.g, this.b, this.a] = [0, 0, 0, 0]),
                    ([this.h, this.s, this.l] = [0, 0, 0]);
            else {
                const t =
                    (function (e) {
                        if (!e) return;
                        if ('#' !== e[0]) return;
                        let t;
                        return (
                            (e = e.slice(1)).length <= 4
                                ? ((t = {
                                      r: parseInt(e[0] + e[0], 16),
                                      g: parseInt(e[1] + e[1], 16),
                                      b: parseInt(e[2] + e[2], 16),
                                  }),
                                  4 === e.length &&
                                      (t.a = parseInt(e[3] + e[3], 16) / 255))
                                : ((t = {
                                      r: parseInt(e[0] + e[1], 16),
                                      g: parseInt(e[2] + e[3], 16),
                                      b: parseInt(e[4] + e[5], 16),
                                  }),
                                  8 === e.length &&
                                      (t.a = parseInt(e[6] + e[7], 16) / 255)),
                            t && void 0 === t.a && (t.a = 1),
                            t
                        );
                    })(e) ||
                    (function (e) {
                        const t = c[e.toLowerCase()];
                        if (t) return { r: t[0], g: t[1], b: t[2], a: 1 };
                    })(e);
                if (!t) throw new Error();
                Object.assign(this, t),
                    Object.assign(this, M(this.r, this.g, this.b));
            }
        else
            Object.assign(this, e),
                'number' == typeof this.r
                    ? Object.assign(this, M(this.r, this.g, this.b))
                    : (console.assert('number' == typeof this.h),
                      (this.h = (this.h + 360) % 360),
                      (this.s = Math.max(0, Math.min(1, this.s))),
                      (this.l = Math.max(0, Math.min(1, this.l))),
                      Object.assign(this, E(this.h, this.s, this.l)));
        'number' != typeof this.a && (this.a = 1);
    }
    type() {
        return 'color';
    }
    opaque() {
        return new I({ r: this.r, g: this.g, b: this.b });
    }
    luma() {
        let e = this.r / 255,
            t = this.g / 255,
            n = this.b / 255;
        return (
            (e = e <= 0.03928 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4)),
            (t = t <= 0.03928 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4)),
            (n = n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)),
            0.2126 * e + 0.7152 * t + 0.0722 * n
        );
    }
    hex() {
        let e = ((1 << 24) + (h(this.r) << 16) + (h(this.g) << 8) + h(this.b))
            .toString(16)
            .slice(1);
        return (
            this.a < 1 &&
                (e += ('00' + Math.round(255 * this.a).toString(16)).slice(-2)),
            e[0] === e[1] &&
                e[2] === e[3] &&
                e[4] === e[5] &&
                e[6] === e[7] &&
                (e = e[0] + e[2] + e[4] + (this.a < 1 ? e[6] : '')),
            '#' + e
        );
    }
    rgb() {
        return `rgb(${m(this.r, 2)}, ${m(this.g, 2)}, ${m(this.b, 2)}${
            this.a < 1 ? ', ' + m(100 * this.a, 2) + '%' : ''
        })`;
    }
    hsl() {
        return `hsl(${this.h}deg, ${this.s}%, ${this.l}%, ${
            this.a < 1 ? ', ' + m(100 * this.a, 2) + '%' : ''
        })`;
    }
    css() {
        return 0 === this.r && 0 === this.g && 0 === this.b && 0 === this.a
            ? 'transparent'
            : this.a < 1
            ? this.rgb()
            : this.hex();
    }
    canonicalScalar() {
        return this.luma();
    }
    equals(e) {
        return (
            T(e) &&
            this.r === e.r &&
            this.g === e.g &&
            this.b === e.b &&
            this.a === e.a
        );
    }
}
function O(e) {
    switch (e.type()) {
        case 'color':
            return new I(e);
        case 'frequency':
            return new w(e.value, e.unit);
        case 'time':
            return new g(e.value, e.unit);
        case 'angle':
            return new f(e.value, e.unit);
        case 'string':
            return new b(e.value);
        case 'length':
            return new v(e.value, e.unit);
        case 'percentage':
            return new d(e.value);
        case 'number':
            return new y(e.value);
        case 'array':
            return new x(e.value.map(O));
        default:
            console.error('Unknown value type');
    }
}
function T(e) {
    return e instanceof I;
}
function S(e) {
    if (!e) return;
    let t;
    try {
        t = new I(e);
    } catch (e) {
        t = void 0;
    }
    return t;
}
function U(e) {
    return e instanceof y;
}
function F(e) {
    console.assert(e instanceof y);
}
function A(e) {
    return e instanceof d;
}
function j(e) {
    return e instanceof v;
}
function C(e) {
    return e instanceof b;
}
function N(e) {
    return e instanceof f;
}
function _(e) {
    return e instanceof g;
}
function q(e) {
    return e instanceof w;
}
function $(e) {
    return e instanceof x;
}
function L(e) {
    return e instanceof y && 0 === e.value;
}
function z(e, t) {
    return U(e) ? Math.round(e.value) : (void 0 === t && F(e), t);
}
function P(e, t) {
    return A(e)
        ? e.value / 100
        : U(e)
        ? e.value
        : (void 0 === t &&
              ((n = e), console.assert(n instanceof y || n instanceof d)),
          t);
    var n;
}
function V(t) {
    return N(t)
        ? 'deg' === t.unit
            ? t.value
            : 'rad' === t.unit
            ? (180 * t.value) / Math.PI
            : 'grad' === t.unit
            ? (180 * t.value) / 200
            : 'turn' === t.unit
            ? 360 * t.value
            : void a(e.UnknownUnit, t.unit)
        : (F(t), t.value);
}
function D(e, t, n) {
    var r, a, s, o, i, l;
    if ('number' != typeof e) {
        console.assert('multi' === t);
        let a = null !== (r = e.px) && void 0 !== r ? r : 0;
        return (
            Object.keys(e).forEach((e) => {
                const t = D(this.value[e], e, n);
                if (isNaN(t)) return NaN;
                a += a;
            }),
            a
        );
    }
    if ('px' === t) return e;
    if ('cm' === t) return (96 * e) / 2.54;
    if ('mm' === t) return (96 * e) / 25.4;
    if ('Q' === t) return (96 * e) / 2.54 / 40;
    if ('in' === t) return 96 * e;
    if ('pc' === t) return 16 * e;
    if ('pt' === t) return (96 * e) / 72;
    let u;
    return (
        (u =
            'vmin' === t
                ? Math.min(
                      null !== (a = null == n ? void 0 : n.vh) && void 0 !== a
                          ? a
                          : NaN,
                      null !== (s = null == n ? void 0 : n.vw) && void 0 !== s
                          ? s
                          : NaN
                  )
                : 'vmax' === t
                ? Math.max(
                      null !== (o = null == n ? void 0 : n.vh) && void 0 !== o
                          ? o
                          : NaN,
                      null !== (i = null == n ? void 0 : n.vw) && void 0 !== i
                          ? i
                          : NaN
                  )
                : null !== (l = null == n ? void 0 : n[t]) && void 0 !== l
                ? l
                : NaN),
        u * e
    );
}
function H(e) {
    return A(e) ? e.value / 100 : (F(e), e.value);
}
function B(e, t) {
    return C(e) ? e.value : t;
}
function Z(e, t) {
    return t.canonicalScalar() - e.canonicalScalar();
}
function R(e) {
    if (U(e)) return new v({ px: e.value }, 'multi');
    if ('multi' === e.unit) return e;
    const t = {};
    return (t[e.unit] = e.value), new v(t, 'multi');
}
function W(t, r) {
    if ('multi' === t.unit) throw new n(e.InvalidOperand);
    const a = B(r, 'pentatonic').toLowerCase();
    let s = {
        tritonic: [2, 3],
        tetratonic: [2, 4],
        pentatonic: [2, 5],
        golden: [1.618, 1],
        'golden ditonic': [1.618, 2],
    }[a];
    if (void 0 === s) {
        if (
            ((s = a.split(':').map((e) => parseFloat(e))),
            isNaN(s[0]) || isNaN(s[1]))
        )
            throw new n(e.InvalidOperand);
        s = [s[1] / s[0], 1];
    }
    const [o, i] = s,
        l =
            t.value * (Math.pow(o, 7 / i) - Math.pow(o, -2 / i)) < 10 ||
            t.value * Math.pow(o, -2 / i) < 1
                ? 2
                : 0,
        u = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(
            (e) => new v(m(t.value * Math.pow(o, e / i), l), t.unit)
        );
    return new x(u);
}
var Q;
const G = require('chalk'),
    Y = require('ci-info');
let J = null !== (Q = process.stdout.isTTY) && void 0 !== Q && Q && !Y.isCI;
const K = {
        useColor: (e) => {
            J = e;
        },
        autoFormat: (e) =>
            e
                .replace(/("(.*)")/g, (e) => K.string(e.slice(1, -1)))
                .replace(/(`(.*)`)/g, (e) => K.keyword(e)),
        success: (e = '') => (
            G.green('✔︎   ' + e), J ? G.bold.green('✔︎   ' + e) : '✔︎   ' + e
        ),
        error: (e = '') =>
            J ? G.hex('#fa2040')(G.bold('✘   ' + e)) : '✘   ' + e,
        warning: (e = '') =>
            J ? G.hex('#ffcc00')(G.bold('⚠️   ' + e)) : '⚠   ' + e,
        path: (e = '') => (J ? G.hex('#6ab3ff').italic(e) : e),
        keyword: (e = '') => (J ? G.hex('#ffcc00')(e) : e),
        string: (e = '') =>
            J ? G.hex('#ffcc00')('"' + G.italic(e) + '"') : '"' + e + '"',
        dim: (e = '') => (J ? G.hex('#999')(e) : e),
        time: (e = new Date()) =>
            J ? G.hex('#d1d7ff')(`[${e.toLocaleTimeString()}]`) : '[' + e + ']',
        link: (e) =>
            J
                ? '\n▷   ' +
                  G.hex('#d1d7ff')(
                      'https://github.com/arnog/chromatic/docs/errors/' +
                          e +
                          '.md'
                  )
                : '\n▷   https://github.com/arnog/chromatic/docs/errors/' +
                  e +
                  '.md',
    },
    X = require('chroma-js');
function ee(e) {
    return e < 0 ? 0 : e > 1 ? 1 : e;
}
function te(e) {
    return A(e)
        ? Math.round((255 * e.value) / 100)
        : (F(e), Math.round(e.value));
}
function ne(e, t, n) {
    let r = ((e = Math.max(0, Math.min(100, e))) + 16) / 116,
        a = (t = Math.max(-128, Math.min(128, t))) / 500 + r,
        s = r - (n = Math.max(-128, Math.min(128, n))) / 200;
    (a = 0.95047 * (a * a * a > 0.008856 ? a * a * a : (a - 16 / 116) / 7.787)),
        (r = 1 * (r * r * r > 0.008856 ? r * r * r : (r - 16 / 116) / 7.787)),
        (s =
            1.08883 *
            (s * s * s > 0.008856 ? s * s * s : (s - 16 / 116) / 7.787));
    let o = 3.2406 * a + -1.5372 * r + -0.4986 * s,
        i = -0.9689 * a + 1.8758 * r + 0.0415 * s,
        l = 0.0557 * a + -0.204 * r + 1.057 * s;
    return (
        (o = o > 0.0031308 ? 1.055 * Math.pow(o, 1 / 2.4) - 0.055 : 12.92 * o),
        (i = i > 0.0031308 ? 1.055 * Math.pow(i, 1 / 2.4) - 0.055 : 12.92 * i),
        (l = l > 0.0031308 ? 1.055 * Math.pow(l, 1 / 2.4) - 0.055 : 12.92 * l),
        { r: h(255 * o), g: h(255 * i), b: h(255 * l) }
    );
}
function re(e, t, n) {
    (e = h(e) / 255), (t = h(t) / 255), (n = h(n) / 255);
    let r =
            (0.4124 *
                (e =
                    e > 0.04045
                        ? Math.pow((e + 0.055) / 1.055, 2.4)
                        : e / 12.92) +
                0.3576 *
                    (t =
                        t > 0.04045
                            ? Math.pow((t + 0.055) / 1.055, 2.4)
                            : t / 12.92) +
                0.1805 *
                    (n =
                        n > 0.04045
                            ? Math.pow((n + 0.055) / 1.055, 2.4)
                            : n / 12.92)) /
            0.95047,
        a = (0.2126 * e + 0.7152 * t + 0.0722 * n) / 1,
        s = (0.0193 * e + 0.1192 * t + 0.9505 * n) / 1.08883;
    return (
        (r = r > 0.008856 ? Math.pow(r, 1 / 3) : 7.787 * r + 16 / 116),
        (a = a > 0.008856 ? Math.pow(a, 1 / 3) : 7.787 * a + 16 / 116),
        (s = s > 0.008856 ? Math.pow(s, 1 / 3) : 7.787 * s + 16 / 116),
        { L: 116 * a - 16, a: 500 * (r - a), b: 200 * (a - s) }
    );
}
function ae(e, t, n) {
    return {
        r: 3.063218 * e - 1.393325 * t - 0.475802 * n,
        g: -0.969243 * e + 1.875966 * t + 0.041555 * n,
        b: 0.067871 * e - 0.228834 * t + 1.069251 * n,
    };
}
const se = {
    protanopia: { cpu: 0.735, cpv: 0.265, am: 1.273463, ayi: -0.073894 },
    deuteranopia: { cpu: 1.14, cpv: -0.14, am: 0.968437, ayi: 0.003331 },
    tritanopia: { cpu: 0.171, cpv: -0.003, am: 0.062921, ayi: 0.292119 },
};
function oe(e, t, n) {
    const r = E(e, 1, 0.5),
        a = [];
    (a[0] = r.r / 255), (a[1] = r.g / 255), (a[2] = r.b / 255);
    const s = t + n;
    s > 1 &&
        ((t = Number((t / s).toFixed(2))), (n = Number((n / s).toFixed(2))));
    for (let e = 0; e < 3; e++)
        (a[e] *= 1 - t - n), (a[e] += t), (a[e] = Number(255 * a[e]));
    return { r: a[0], g: a[1], b: a[2] };
}
const ie = new I('#fff'),
    le = new I('#000');
function ue(e, t, n, r) {
    const a = B(r, 'hsl').toLowerCase(),
        s = S(e);
    if (!s) return;
    const o = S(t);
    if (!o) return s;
    const i = P(n, 0.5);
    let l = 'number' == typeof o.a ? o.a : 1;
    return (
        (l += (('number' == typeof s.a ? o.a : 1) - l) * i),
        'rgb' === a
            ? new I({
                  r: s.r + (o.r - s.r) * i,
                  g: s.g + (o.g - s.g) * i,
                  b: s.b + (o.b - s.b) * i,
                  a: l,
              })
            : 'hsl' === a
            ? new I({
                  h: s.h + (o.h - s.h) * i,
                  s: s.s + (o.s - s.s) * i,
                  l: s.l + (o.l - s.l) * i,
                  a: l,
              })
            : void 0
    );
}
function ce(e, t) {
    if (0 === e && 0 === t) return 0;
    const n = (180 * Math.atan2(e, t)) / Math.PI;
    return n >= 0 ? n : n + 360;
}
function he(e, t) {
    const n = re(e.r, e.g, e.b),
        r = re(t.r, t.g, t.b),
        a = r.L - n.L,
        s = (n.L + r.L) / 2,
        o = Math.sqrt(n.a * n.a + n.b * n.b),
        i = Math.sqrt(r.a * r.a + r.b * r.b),
        l = (o + i) / 2,
        u = 1 - Math.sqrt(Math.pow(l, 7) / (Math.pow(l, 7) + Math.pow(25, 7))),
        c = n.a + (n.a / 2) * u,
        h = r.a + (r.a / 2) * u,
        p = Math.sqrt(c * c + n.b * n.b),
        m = Math.sqrt(h * h + r.b * r.b),
        d = (p + m) / 2,
        f = m - p,
        v = Math.pow(s - 50, 2),
        g = 1 + (0.015 * v) / Math.sqrt(20 + v),
        w = 1 + 0.045 * d,
        y = ce(n.b, c),
        b = ce(r.b, h),
        x =
            0 === o || 0 === i
                ? 0
                : Math.abs(y - b) <= 180
                ? b - y
                : b <= y
                ? b - y + 360
                : b - y - 360,
        k = 2 * Math.sqrt(p * m) * Math.sin((x * Math.PI) / 180 / 2),
        E = Math.abs(y - b) > 180 ? (y + b + 360) / 2 : (y + b) / 2,
        M =
            1 +
            0.015 *
                d *
                (1 -
                    0.17 * Math.cos((Math.PI / 180) * (E - 30)) +
                    0.24 * Math.cos((Math.PI / 180) * (2 * E)) +
                    0.32 * Math.cos((Math.PI / 180) * (3 * E + 6)) -
                    0.2 * Math.cos((Math.PI / 180) * (4 * E - 63))),
        I =
            -2 *
            Math.sqrt(Math.pow(d, 7) / (Math.pow(d, 7) + Math.pow(25, 7))) *
            Math.sin(
                (Math.PI / 180) * (60 * Math.exp(-Math.pow((E - 275) / 25, 2)))
            ),
        O = a / (1 * g),
        T = f / (1 * w),
        S = k / (1 * M);
    return Math.sqrt(O * O + T * T + S * S + I * T * S);
}
function pe(e, t) {
    switch (t) {
        case 'none':
            return e;
        case 'grayscale':
            const s = re(e.r, e.g, e.b);
            return new I({ a: e.a, ...ne(s.L, 0, 0) });
        case 'protanopia':
        case 'deuteranopia':
        case 'tritanopia': {
            const s = 2.2,
                { x: o, y: i, z: l } = {
                    x:
                        0.430574 * (n = Math.pow(e.r / 255, s)) +
                        0.34155 * (r = Math.pow(e.g / 255, s)) +
                        0.178325 * (a = Math.pow(e.b / 255, s)),
                    y: 0.222015 * n + 0.706655 * r + 0.07133 * a,
                    z: 0.020183 * n + 0.129553 * r + 0.93918 * a,
                },
                u = o + i + l != 0 ? o / (o + i + l) : 0,
                c = o + i + l != 0 ? i / (o + i + l) : 0,
                h = (0.312713 * i) / 0.329016,
                p = (0.358271 * i) / 0.329016;
            let m;
            m =
                u < se[t].cpu
                    ? (se[t].cpv - c) / (se[t].cpu - u)
                    : (c - se[t].cpv) / (u - se[t].cpu);
            const d = c - u * m,
                f = (se[t].ayi - d) / (m - se[t].am),
                v = m * f + d,
                g = (f * i) / v,
                w = ((1 - (f + v)) * i) / v,
                y = h - g,
                b = p - w,
                { r: x, g: k, b: E } = ae(y, 0, b);
            let { r: M, g: O, b: T } = ae(g, i, w);
            const S = M ? ((M < 0 ? 0 : 1) - M) / x : 0,
                U = O ? ((O < 0 ? 0 : 1) - O) / k : 0,
                F = T ? ((T < 0 ? 0 : 1) - T) / E : 0,
                A = Math.max(
                    S > 1 || S < 0 ? 0 : S,
                    U > 1 || U < 0 ? 0 : U,
                    F > 1 || F < 0 ? 0 : F
                );
            return (
                (M += A * x),
                (O += A * k),
                (T += A * E),
                new I({
                    r: 255 * Math.pow(ee(M), 1 / s),
                    g: 255 * Math.pow(ee(O), 1 / s),
                    b: 255 * Math.pow(ee(T), 1 / s),
                })
            );
        }
    }
    var n, r, a;
}
function me(e, t, n) {
    const r = [],
        a = pe(e, n);
    return (
        t.forEach((t) => {
            if (!e.equals(t.color)) {
                const s = n ? he(a, pe(t.color, n)) / 3 : he(e, t.color);
                s < 2 && r.push({ name: t.name, color: t.color, deltaE: s });
            }
        }),
        0 === r.length ? null : r.sort((e, t) => e.deltaE - t.deltaE)
    );
}
function de(e, t, n, r) {
    let a,
        s = new I('#fff'),
        o = new I('#000'),
        i = 10;
    if ('color' === (null == n ? void 0 : n.type()))
        (s = S(e)), (a = S(t)), (o = S(n)), (i = z(r, 10));
    else if ('color' === (null == t ? void 0 : t.type()))
        (s = S(e)), (a = S(t)), (o = S(t)), (i = z(n, 10));
    else if ('color' === e.type()) {
        (a = S(e)),
            (o = new I({
                h: a.h - 20 * Math.sin(4 * Math.PI * (a.h / 360)),
                s: a.s + 0.2 * Math.sin(2 * Math.PI * (a.h / 360)),
                l:
                    a.h >= 180
                        ? a.l - 0.35
                        : a.l - 0.2 + 0.1 * Math.sin(4 * Math.PI * (a.h / 360)),
            })),
            (i = z(t, 10));
        const n = new b('rgb');
        return new x([
            ue(s, a, new y(0.12), n),
            ue(s, a, new y(0.3), n),
            ue(s, a, new y(0.5), n),
            ue(s, a, new y(0.7), n),
            ue(s, a, new y(0.85), n),
            a,
            ue(o, a, new y(0.85), n),
            ue(o, a, new y(0.7), n),
            ue(o, a, new y(0.5), n),
            ue(o, a, new y(0.2), n),
        ]);
    }
    if (!s || !a || !o) return;
    const l = X.scale([s.opaque().hex(), a.opaque().hex(), o.opaque().hex()])
        .mode('lab')
        .correctLightness()
        .colors(i + 1);
    return new x(l.map((e) => new I(e)));
}
const fe = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'gray', 'lab'];
let ve = {};
ve = {
    calc: (e) => e,
    min: (e, t) => (Z(e, t) < 0 ? e : t),
    max: (e, t) => (Z(e, t) < 0 ? t : e),
    clamp: (e, t, n) => (Z(t, e) < 0 ? e : Z(t, n) > 0 ? n : t),
    scale: (e, t, n, r) => (T(e) ? de(e, t, n, r) : j(e) ? W(e, t) : void 0),
    rgb: (e, t, n, r) => new I({ r: te(e), g: te(t), b: te(n), a: P(r, 1) }),
    hsl: (e, t, n, r) => new I({ h: V(e), s: H(t), l: H(n), a: P(r, 1) }),
    hsv: (e, t, n, r) => {
        let a = H(t);
        const s = H(n),
            o = ((2 - a) * s) / 2;
        return (
            0 != o &&
                (a =
                    1 == o
                        ? 0
                        : o < 0.5
                        ? (a * s) / (2 * o)
                        : (a * s) / (2 - 2 * o)),
            new I({ h: V(e), s: a, l: o, a: P(r, 1) })
        );
    },
    hwb: (e, t, n, r) => new I({ a: P(r, 1), ...oe(V(e), H(t), H(n)) }),
    lab: (e, t, n, r) => new I({ a: P(r, 1), ...ne(100 * H(e), P(t), P(n)) }),
    gray: (e, t) => new I({ a: P(t, 1), ...ne(100 * H(e), 0, 0) }),
    filter: (t, n) => {
        const r = B(n, 'none').toLowerCase(),
            s = pe(t, B(n, 'none').toLowerCase());
        return (
            s ||
                a(
                    e.InvalidArgument,
                    'filter()',
                    `"${r}"`,
                    i(r, [
                        'none',
                        'grayscale',
                        'protanopia',
                        'deuteranopia',
                        'tritanopia',
                    ])
                ),
            s
        );
    },
    mix: (t, n, r, s) => {
        const o = B(s, 'hsl').toLowerCase(),
            l = S(t);
        if (!l) return;
        const u = S(n);
        if (!u) return l;
        const c = P(r, 0.5);
        let h = 'number' == typeof u.a ? u.a : 1;
        if (((h += (('number' == typeof l.a ? u.a : 1) - h) * c), 'rgb' === o))
            return new I({
                r: l.r + (u.r - l.r) * c,
                g: l.g + (u.g - l.g) * c,
                b: l.b + (u.b - l.b) * c,
                a: h,
            });
        if ('hsl' === o)
            return new I({
                h: l.h + (u.h - l.h) * c,
                s: l.s + (u.s - l.s) * c,
                l: l.l + (u.l - l.l) * c,
                a: h,
            });
        if ('lab' === o) {
            const { L: e, a: t, b: n } = re(l.r, l.g, l.b),
                { L: r, a: a, b: s } = re(u.r, u.g, u.b);
            return new I({
                ...ne(e + (r - e) * c, t + (a - t) * c, n + (s - n) * c),
                a: h,
            });
        }
        a(e.InvalidArgument, 'mix()', `"${o}"`, i(o, ['hsl', 'lab', 'rgb']));
    },
    saturate: (e, t) => {
        const n = S(e);
        if (n)
            return new I({
                h: n.h,
                s: n.s + (1 - n.s) * P(t, 0.1),
                l: n.l,
                a: n.a,
            });
    },
    desaturate: (e, t) => {
        const n = S(e);
        if (n)
            return new I({ h: n.h, s: n.s - n.s * P(t, 0.1), l: n.l, a: n.a });
    },
    lighten: (e, t) => {
        const n = S(e);
        if (n)
            return new I({
                h: n.h,
                s: n.s,
                l: n.l + (1 - n.l) * P(t, 0.1),
                a: n.a,
            });
    },
    darken: (e, t) => {
        const n = S(e);
        if (n)
            return new I({ h: n.h, s: n.s, l: n.l - n.l * P(t, 0.1), a: n.a });
    },
    rotateHue: (e, t) => {
        const n = S(e);
        if (n)
            return t && (N(t) || U(t))
                ? new I({ h: (n.h + V(t) + 360) % 360, s: n.s, l: n.l, a: n.a })
                : n;
    },
    complement: (e) => {
        const t = S(e);
        if (t) return new I({ h: (t.h + 180) % 360, s: t.s, l: t.l, a: t.a });
    },
    contrast: (e, t, n) => {
        const r = S(e),
            a = S(t) || le,
            s = S(n) || ie;
        let o, i;
        const l = r.luma(),
            u = a.luma(),
            c = s.luma();
        return (
            (o = l > u ? (l + 0.05) / (u + 0.05) : (u + 0.05) / (l + 0.05)),
            (i = l > c ? (l + 0.05) / (c + 0.05) : (c + 0.05) / (l + 0.05)),
            o > i ? a : s
        );
    },
    rgba: (e, t, n, r) => new I({ r: te(e), g: te(t), b: te(n), a: P(r, 1) }),
    hsla: (e, t, n, r) => new I({ h: V(e), s: H(t), l: H(n), a: P(r, 1) }),
    tint: (e, t) => ue(ie, e, null != t ? t : new y(0.1)),
    shade: (e, t) => ue(le, e, null != t ? t : new y(0.1)),
};
const ge = {
    calc: 'any',
    min: 'any, any',
    max: 'any, any',
    clamp: 'any, any, any',
    rgb:
        'number|percentage, number|percentage, number|percentage,number|percentage|none',
    rgba:
        'number|percentage, number|percentage, number|percentage,number|percentage|none',
    hsl:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    hsla:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    hsv:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    hwb:
        'number|angle, number|percentage, number|percentage, number|percentage|none',
    lab: 'number|percentage, number, number, number|percentage|none',
    gray: 'number|percentage, number|percentage|none',
    mix: 'color, color, number|percentage|none, string|none',
    saturate: 'color, number|percentage|none',
    desaturate: 'color, number|percentage|none',
    lighten: 'color, number|percentage|none',
    darken: 'color, number|percentage|none',
    rotateHue: 'color, angle|number|none',
    complement: 'color',
    contrast: 'color, color|none, color|none',
    filter: 'color, string',
    tint: 'color, number|percentage|none',
    shade: 'color, number|percentage|none',
};
class we {
    constructor(e, t = {}) {
        (this.s = ''),
            (this.index = 0),
            (this.options = {}),
            (this.s = e),
            (this.index = 0),
            (this.options = t);
    }
    isEOF() {
        return this.index >= this.s.length;
    }
    lookAhead(e) {
        return this.s.slice(this.index, this.index + e);
    }
    skipWhiteSpace() {
        this.match(/^\s*/);
    }
    match(e) {
        if ('string' == typeof e) {
            if (this.lookAhead(e.length) === e)
                return (this.index += e.length), e;
        } else {
            const t = this.s.slice(this.index).match(e);
            if (t && t[0]) return (this.index += t[0].length), t[1] || !0;
        }
    }
    error(e, ...t) {
        var n, r, a, o;
        const i =
                null !==
                    (r =
                        null ===
                            (n = this.s.slice(0, this.index).match(/^(.*)/)) ||
                        void 0 === n
                            ? void 0
                            : n[1]) && void 0 !== r
                    ? r
                    : '',
            l =
                null !==
                    (o =
                        null ===
                            (a = this.s.slice(this.index).match(/(.*)$/)) ||
                        void 0 === a
                            ? void 0
                            : a[1]) && void 0 !== o
                    ? o
                    : '';
        s([i + K.dim(l), ' '.repeat(i.length) + '⇧'], e, ...t);
    }
    applyOpToLength(t, n, r) {
        U(n) && '/' === t && this.error(e.InvalidOperand),
            U(n) || U(r) || '*' !== t || this.error(e.InvalidOperand);
        const a = {
            '+': (e, t) => e + t,
            '-': (e, t) => e - t,
            '*': (e, t) => e * t,
            '/': (e, t) => e / t,
        }[t];
        if (U(n)) {
            if (((s = r), console.assert(s instanceof v), 'multi' === r.unit)) {
                const e = {};
                return (
                    Object.keys(r.value).forEach((t) => {
                        e[t] = a(n.value, r.value[t]);
                    }),
                    new v(e)
                );
            }
            return new v(a(n.value, r.value), r.unit);
        }
        var s;
        if (U(r)) {
            if ('number' == typeof n.value)
                return new v(a(n.value, r.value), n.unit);
            const e = {};
            return (
                Object.keys(n.value).forEach((t) => {
                    e[t] = a(n.value[t], r.value);
                }),
                new v(e)
            );
        }
        if ('/' === t)
            return (
                ('multi' !== n.unit && 'multi' !== r.unit) ||
                    this.error(e.InvalidOperand),
                n.unit === r.unit
                    ? new y(n.value / r.value)
                    : new y(n.canonicalScalar() / r.canonicalScalar())
            );
        const o = R(n),
            i = R(r),
            l = {};
        return (
            [...Object.keys(o.value), ...Object.keys(i.value)].forEach((e) => {
                void 0 === i.value[e]
                    ? (l[e] = o.value[e])
                    : void 0 === o.value[e]
                    ? (l[e] = i.value[e])
                    : (l[e] = a(o.value[e], i.value[e]));
            }),
            new v(l)
        );
    }
    parseUnit(t) {
        if (this.match('%')) return new d(t);
        let n = this.match(
            /^(em|ex|ch|rem|vw|vh|vmin|vmax|px|cm|mm|in|pt|pc|Q)/
        );
        return n
            ? new v(t, n)
            : ((n = this.match(/^(deg|°|rad|grad|turn)/)),
              n
                  ? new f(t, '°' === n ? 'deg' : n)
                  : ((n = this.match(/^(ms|s)/)),
                    n
                        ? new g(t, n)
                        : ((n = this.match(/^(khz|hz|kHz|Hz)/)),
                          n
                              ? new w(t, n.toLowerCase())
                              : ((n = this.match(/^([a-zA-Z]+)/)),
                                n && this.error(e.UnknownUnit, n),
                                new y(t)))));
    }
    parseIndex(t) {
        let n = t;
        if (this.match('['))
            if ('array' !== t.type()) this.error(e.UnexpectedOpenBracket);
            else {
                const r = z(this.parseExpression(), NaN);
                isNaN(r) && this.error(e.ExpectedIntegerIndex),
                    (n = t.get(r)),
                    this.skipWhiteSpace(),
                    this.match(']') || this.error(e.ExpectedCloseBracket);
            }
        return n;
    }
    parseLiteral() {
        var t, n, r, a;
        let s;
        const o = this.index,
            i = this.match(/^\s*([+\-])\s*/);
        if (i) {
            const t = this.parseLiteral();
            if ('-' === i) {
                if (A(t)) return new d(-100 * H(t));
                if (U(t)) return new y(-t.value);
                if (N(t)) return new f(-t.value, t.unit);
                if (j(t)) return this.applyOpToLength('-', new v(0, 'px'), t);
                this.error(e.InvalidUnaryOperand);
            }
            return t;
        }
        const l = this.match(/^([0-9]*\.[0-9]+|\.?[0-9]+)/);
        if ((l && (s = this.parseUnit(parseFloat(l))), !s && this.match('['))) {
            const t = [];
            for (; ']' !== this.lookAhead(1) && !this.isEOF(); ) {
                const n = this.parseExpression();
                n || this.error(e.SyntaxError),
                    t.push(n),
                    this.match(/^(\s*,?|\s+)/);
            }
            return (
                this.isEOF() && this.error(e.ExpectedCloseBracket),
                this.match(']'),
                new x(t)
            );
        }
        if (!s && this.match('"')) {
            let t = '';
            for (; '"' !== this.lookAhead(1) && !this.isEOF(); )
                '\\' === this.lookAhead(1)
                    ? ((t += this.s[this.index + 1]), (this.index += 2))
                    : ((t += this.s[this.index]), (this.index += 1));
            return (
                this.isEOF() && this.error(e.ExpectedQuote),
                this.match('"'),
                new b(t)
            );
        }
        if (!s && this.match('{')) {
            const o = this.match(/^([a-zA-Z_-][a-zA-Z0-9\._-]*)/);
            if (o) {
                let i =
                    null === (t = this.options) || void 0 === t
                        ? void 0
                        : t.aliasResolver(o);
                if ('string' == typeof i) {
                    const t = o.match(/^(.+)-([0-9]{2,3})$/);
                    if (t) {
                        const s =
                            null === (n = this.options) || void 0 === n
                                ? void 0
                                : n.aliasResolver(t[1]);
                        if ('string' != typeof s) {
                            if ($(s)) {
                                const e = Math.round(parseInt(t[2]) / 100);
                                i = s.get(e);
                            } else if (T(s)) {
                                const e = Math.round(parseInt(t[2]) / 100);
                                i =
                                    null === (r = de(s)) || void 0 === r
                                        ? void 0
                                        : r.get(e);
                            } else if (j(s)) {
                                const e =
                                    '50' === t[2]
                                        ? 0
                                        : Math.round(parseInt(t[2]) / 100);
                                i =
                                    null === (a = W(s)) || void 0 === a
                                        ? void 0
                                        : a.get(e);
                            }
                        } else
                            'string' == typeof s
                                ? this.error(e.UnknownToken, t[1], s)
                                : this.error(e.InvalidOperand);
                    }
                }
                'string' == typeof i && this.error(e.UnknownToken, o, i),
                    (s = i),
                    s && ((s = O(s)), s.setSource('{' + o + '}'));
            }
            this.match('}') || this.error(e.ExpectedCloseCurlyBracket);
        }
        return (
            s || (s = S(this.match(/^\s*(#[0-9a-fA-F]{3,8})/))),
            s || ((this.index = o), (s = S(this.match(/^\s*([a-zA-Z]+)/)))),
            s || (this.index = o),
            s
        );
    }
    parseColorArguments() {
        const e = [];
        if ((this.skipWhiteSpace(), !this.match('('))) return;
        let t = this.parseExpression();
        if (t) {
            if ((e.push(t), !this.match(/^(\s*,?|\s+)/)))
                return this.match(')'), e;
            if (((t = this.parseExpression()), t)) {
                if ((e.push(t), !this.match(/^(\s*,?|\s+)/)))
                    return this.match(')'), e;
                if (((t = this.parseExpression()), t)) {
                    if ((e.push(t), !this.match(/^(\s*,?|\s+|\s*\/)/)))
                        return this.match(')'), e;
                    (t = this.parseExpression()), t && e.push(t);
                }
            }
        }
        return this.match(')'), e;
    }
    parseArguments() {
        if ((this.skipWhiteSpace(), !this.match('('))) return;
        const t = [];
        for (; ')' !== this.lookAhead(1) && !this.isEOF(); ) {
            const n = this.parseExpression();
            n || this.error(e.SyntaxError),
                t.push(n),
                this.match(/^(\s*,?|\s+)/);
        }
        return (
            this.isEOF() && this.error(e.ExpectedCloseParen), this.match(')'), t
        );
    }
    parseCall() {
        const t = this.index,
            r = this.match(/^([a-zA-Z\-]+)/);
        if (r)
            if (ve[r]) {
                const t = fe.includes(r)
                    ? this.parseColorArguments()
                    : this.parseArguments();
                if (t) {
                    try {
                        !(function (t, r) {
                            var a;
                            const s =
                                null === (a = ge[t]) || void 0 === a
                                    ? void 0
                                    : a.split(',').map((e) => e.trim());
                            if (
                                s &&
                                (s.forEach((a, s) => {
                                    var o;
                                    const i = a.split('|').map((e) => e.trim());
                                    if (!i.includes('none') && !r[s])
                                        throw new n(
                                            e.MissingArgument,
                                            String(s + 1),
                                            t,
                                            i.join(', ')
                                        );
                                    if (
                                        r[s] &&
                                        !i.includes('any') &&
                                        !i.includes(
                                            null === (o = r[s]) || void 0 === o
                                                ? void 0
                                                : o.type()
                                        )
                                    )
                                        throw new n(
                                            e.ExpectedArgument,
                                            String(s + 1),
                                            t,
                                            i.join(', ')
                                        );
                                }),
                                r.length > s.length)
                            )
                                throw new n(
                                    e.TooManyArguments,
                                    t,
                                    s.join(', ')
                                );
                        })(r, t);
                    } catch (e) {
                        e.code
                            ? this.error(e.code, ...e.args)
                            : this.error(e.message);
                    }
                    return ve[r](...t);
                }
                this.error(e.SyntaxError);
            } else
                '(' === this.lookAhead(1) &&
                    this.error(e.UnknownFunction, r, i(r, ve));
        this.index = t;
    }
    parseTerminal() {
        const e = this.parseCall() || this.parseGroup() || this.parseLiteral();
        return e ? this.parseIndex(e) : e;
    }
    parseFactor() {
        let t = this.parseTerminal(),
            n = this.match(/^\s*([*|/])\s*/);
        for (; n; ) {
            const r = { '*': (e, t) => e * t, '/': (e, t) => e / t }[n],
                a = this.parseTerminal();
            if ((a || this.error(e.ExpectedOperand), U(a)))
                U(t)
                    ? (t = new y(r(t.value, a.value)))
                    : A(t)
                    ? (t = new d(r(t.value, a.value)))
                    : j(t)
                    ? (t = this.applyOpToLength(n, t, a))
                    : N(t)
                    ? (t = new f(r(t.value, a.value), t.unit))
                    : q(t)
                    ? (t = new w(r(t.value, a.value), t.unit))
                    : _(t) && (t = new g(r(t.value, a.value), t.unit));
            else {
                if ((U(t) || j(t)) && j(a))
                    return this.applyOpToLength(n, t, a);
                U(t)
                    ? A(a)
                        ? (t = new d(r(t.value, a.value)))
                        : j(a)
                        ? (t = this.applyOpToLength(n, t, a))
                        : N(a)
                        ? (t = new f(r(t.value, a.value), a.unit))
                        : q(a)
                        ? (t = new w(r(t.value, a.value), a.unit))
                        : _(a) && (t = new g(r(t.value, a.value), a.unit))
                    : '/' === n && t.type() === a.type()
                    ? (t = new y(t.canonicalScalar() / a.canonicalScalar()))
                    : this.error(e.InvalidOperand);
            }
            n = this.match(/^\s*([*|/])\s*/);
        }
        return t;
    }
    parseTerm() {
        let t = this.parseFactor(),
            n = this.match(/^\s*([+\-])\s*/);
        for (; n; ) {
            const r = { '+': (e, t) => e + t, '-': (e, t) => e - t }[n],
                a = this.parseFactor();
            a || this.error(e.ExpectedOperand),
                C(t) || C(a)
                    ? ('-' === n && this.error(e.InvalidOperand),
                      (t = new b(r(t.css(), a.css()))))
                    : U(t) && U(a)
                    ? (t = new y(r(t.value, a.value)))
                    : (L(t) || A(t)) && (L(a) || A(a))
                    ? (t = new d(100 * r(H(t), H(a))))
                    : L(t) && _(a)
                    ? (t = new g(r(0, a.value), a.unit))
                    : _(t) && L(a)
                    ? (t = new g(t.value, t.unit))
                    : _(t) && _(a)
                    ? (t =
                          t.unit === a.unit
                              ? new g(r(t.value, a.value), t.unit)
                              : new g(
                                    r(t.canonicalScalar(), a.canonicalScalar()),
                                    's'
                                ))
                    : L(t) && q(a)
                    ? (t = new w(r(0, a.value), a.unit))
                    : q(t) && L(a)
                    ? (t = new w(t.value, t.unit))
                    : q(t) && q(a)
                    ? (t =
                          t.unit === a.unit
                              ? new w(r(t.value, a.value), t.unit)
                              : new w(
                                    r(t.canonicalScalar(), a.canonicalScalar()),
                                    'hz'
                                ))
                    : L(t) && N(a)
                    ? (t = new f(r(0, a.value), a.unit))
                    : N(t) && L(a)
                    ? (t = new f(t.value, t.unit))
                    : N(t) && N(a)
                    ? (t =
                          t.unit === a.unit
                              ? new f(r(t.value, a.value), t.unit)
                              : new f(r(V(t), V(a)), 'deg'))
                    : (L(t) || j(t)) && (L(a) || j(a))
                    ? (t = this.applyOpToLength(n, t, a))
                    : this.error(e.InvalidOperand),
                (n = this.match(/^\s*([+\-])\s*/));
        }
        return t;
    }
    parseGroup() {
        let t;
        return (
            this.match('(') &&
                ((t = this.parseExpression()),
                this.skipWhiteSpace(),
                this.match(')') || this.error(e.ExpectedCloseParen)),
            t && U(t) && (t = this.parseUnit(t.value)),
            t
        );
    }
    parseExpression() {
        return this.skipWhiteSpace(), this.parseTerm();
    }
}
const ye = require('fs'),
    be = {
        formats: {
            yaml: {
                ext: '.yaml',
                render: (e) =>
                    e.renderTemplate(
                        ye.readFileSync(
                            __dirname + '/templates/yaml.hbs',
                            'utf-8'
                        ),
                        e
                    ),
            },
            json: {
                ext: '.json',
                render: (e) =>
                    e.renderTemplate(
                        ye.readFileSync(
                            __dirname + '/templates/json.hbs',
                            'utf-8'
                        ),
                        e
                    ),
                handlebarsHelpers: {},
            },
            'data-dump': {
                ext: '.yaml',
                render: (e) =>
                    e.renderTemplate(
                        ye.readFileSync(
                            __dirname + '/templates/data-dump.hbs',
                            'utf-8'
                        ),
                        e
                    ),
            },
        },
    },
    xe = require('fs'),
    ke = {
        formats: {
            sass: {
                ext: '.scss',
                render: (e) =>
                    e.renderTemplate(
                        xe.readFileSync(
                            __dirname + '/templates/sass.hbs',
                            'utf-8'
                        ),
                        e
                    ),
            },
            css: {
                ext: '.css',
                render: (e) =>
                    e.renderTemplate(
                        xe.readFileSync(
                            __dirname + '/templates/css.hbs',
                            'utf-8'
                        ),
                        e
                    ),
            },
        },
    },
    Ee = require('marked'),
    Me = require('highlight.js'),
    Ie = require('handlebars'),
    Oe = require('fs');
function Te(e) {
    let t = '';
    const n = { colors: [], colorRamps: [], group: '' },
        r = [];
    return (
        e.themes.forEach((e) => {
            e.tokens.forEach((t) => {
                T(t.tokenValue) &&
                    r.push({
                        name:
                            t.tokenId +
                            ('_' === e.theme || '' === e.theme
                                ? ''
                                : '.' + e.theme),
                        color: t.tokenValue,
                    });
            });
        }),
        e.themes.forEach((a) => {
            (n.group =
                1 === e.themes.length
                    ? ''
                    : '_' === a.theme
                    ? 'Base'
                    : a.theme),
                (n.colors = []),
                a.tokens.forEach((e) => {
                    var t, a, s;
                    if (T(e.tokenValue)) {
                        const s = e.tokenValue;
                        let o,
                            i = s.luma() >= 1 ? 'frame ' : '';
                        s.luma() > 0.42 && (i += 'light'),
                            s.a < 1 && ((o = new I(s)), (o.a = 1));
                        const l = me(s, r),
                            u = me(s, r, 'protanopia'),
                            c =
                                null === (t = me(s, r, 'deuteranopia')) ||
                                void 0 === t
                                    ? void 0
                                    : t.filter(
                                          (e) =>
                                              !(null == l
                                                  ? void 0
                                                  : l.includes(e))
                                      ),
                            h = me(s, r, 'tritanopia'),
                            p = [];
                        [
                            ...(null != c ? c : []),
                            ...(null != h ? h : []),
                            ...(null != u ? u : []),
                        ].forEach((e) => {
                            p.findIndex((t) => t.name === e.name) < 0 &&
                                (!l ||
                                    l.findIndex((t) => t.name === e.name) <
                                        0) &&
                                p.push(e);
                        }),
                            n.colors.push({
                                name: e.tokenId,
                                value: e.tokenValue,
                                source: s.getSource(),
                                css: s.css(),
                                protanopiaCss: pe(s, 'protanopia').css(),
                                deuteranopiaCss: pe(s, 'deuteranopia').css(),
                                tritanopiaCss: pe(s, 'tritanopia').css(),
                                comment:
                                    null !== (a = e.tokenDefinition.comment) &&
                                    void 0 !== a
                                        ? a
                                        : '',
                                cls: i,
                                opaqueColor: null == o ? void 0 : o.css(),
                                similarColors: {
                                    normal: l
                                        ? l.map((e) => ({
                                              name: e.name,
                                              css: e.color.css(),
                                              deltaE: m(e.deltaE, 2),
                                          }))
                                        : null,
                                    colorDeficient: p
                                        ? p.map((e) => ({
                                              name: e.name,
                                              css: e.color.css(),
                                              deltaE: m(e.deltaE, 2),
                                          }))
                                        : null,
                                    protanopia: u
                                        ? u.map((e) => ({
                                              name: e.name,
                                              css: e.color.css(),
                                              deltaE: m(e.deltaE, 2),
                                          }))
                                        : null,
                                    deuteranopia: c
                                        ? c.map((e) => ({
                                              name: e.name,
                                              css: e.color.css(),
                                              deltaE: m(e.deltaE, 2),
                                          }))
                                        : null,
                                    tritanopia: h
                                        ? h.map((e) => ({
                                              name: e.name,
                                              css: e.color.css(),
                                              deltaE: m(e.deltaE, 2),
                                          }))
                                        : null,
                                },
                            });
                    } else if (
                        (s = e.tokenValue) instanceof x &&
                        s.value.every((e) => T(e))
                    ) {
                        let t;
                        n.colorRamps.push({
                            name: e.tokenId,
                            source: e.tokenValue.getSource(),
                            values: e.tokenValue.value.map((e, n) => {
                                const r = e;
                                let a,
                                    s = r.luma() >= 1 ? 'frame ' : '';
                                r.luma() > 0.42 && (s += 'light'),
                                    r.a < 1 && ((a = new I(r)), (a.a = 1));
                                const o = t && he(r, t);
                                return (
                                    (t = r),
                                    {
                                        name: 0 === n ? '50' : 100 * n,
                                        cls: s,
                                        value: r,
                                        css: r.css(),
                                        opaqueColor:
                                            null == a ? void 0 : a.css(),
                                        deltaE: o < 2 ? m(o, 2) : void 0,
                                    }
                                );
                            }),
                        });
                    }
                }),
                (t += Ie.compile(
                    Oe.readFileSync(
                        __dirname + '/templates/html-colors.hbs',
                        'utf-8'
                    )
                )(n));
        }),
        t
    );
}
const Se = {
    formats: {
        'html/colors': { ext: '.html', render: Te },
        html: {
            ext: '.html',
            render: (e) =>
                e.renderTemplate(
                    Oe.readFileSync(
                        __dirname + '/templates/html-file.hbs',
                        'utf-8'
                    ),
                    { ...e, 'color-section': Te(e) }
                ),
        },
    },
};
Ee.setOptions({
    renderer: new Ee.Renderer(),
    highlight: (e) => Me.highlightAuto(e).value,
    pedantic: !1,
    gfm: !0,
    breaks: !1,
    sanitize: !1,
    smartLists: !0,
    smartypants: !1,
    xhtml: !1,
});
const { cosmiconfigSync: Ue } = require('cosmiconfig'),
    Fe = Ue('chromatic'),
    Ae = require('glob'),
    je = require('fs-extra'),
    Ce = require('path'),
    Ne = require('yaml'),
    _e = require('json5'),
    qe = require('resolve-from'),
    $e = require('handlebars'),
    Le = {};
let ze,
    Pe,
    Ve,
    De,
    He,
    Be,
    Ze,
    Re = !1,
    We = !1;
function Qe(e) {
    var t;
    'string' == typeof e && (e = [e]);
    const n = '\n' + [].concat(...e.map((e) => e.split('\n'))).join('\n    ');
    null === (t = Le.console) || void 0 === t || t.error(K.autoFormat(n)),
        Re || We || process.exit(1);
}
function Ge(e) {
    var t;
    null === (t = Le.console) || void 0 === t || t.log(e);
}
function Ye(e, t) {
    e !== t &&
        t &&
        Object.keys(t).forEach((n) => {
            Array.isArray(t[n])
                ? (e[n] || (e[n] = []), (e[n] = [...e[n], ...t[n]]))
                : 'object' == typeof t[n]
                ? (e[n] || (e[n] = {}), Ye(e[n], t[n]))
                : void 0 !== t[n] && (e[n] = t[n]);
        });
}
function Je(t, n, a) {
    if (n && !Be.includes(t))
        try {
            r(He.includes(t), e.CircularDefinition, t), He.push(t);
            const s = (function (e, t = {}) {
                const n = new we(e, t),
                    r = n.parseExpression();
                if ((n.skipWhiteSpace(), n.isEOF()))
                    return r && r.setSource(e), r;
            })(n, {
                ...Le,
                aliasResolver: (e) => {
                    var n, r, s, o, l;
                    let u;
                    if (a) {
                        if (De.has(e + '.' + a)) return De.get(e + '.' + a);
                        if (
                            (Ve.has(e) &&
                                (u = Je(
                                    e + '.' + a,
                                    null !==
                                        (r =
                                            null === (n = Ve.get(e)) ||
                                            void 0 === n
                                                ? void 0
                                                : n.value[a]) && void 0 !== r
                                        ? r
                                        : null === (s = Ve.get(t)) ||
                                          void 0 === s
                                        ? void 0
                                        : s.value._,
                                    a
                                )),
                            u)
                        )
                            return u;
                    }
                    return De.has(e)
                        ? De.get(e)
                        : (Ve.has(e) &&
                              (a &&
                                  (u = Je(
                                      e + '.' + a,
                                      null === (o = Ve.get(e)) || void 0 === o
                                          ? void 0
                                          : o.value[a],
                                      a
                                  )),
                              u ||
                                  (u = Je(
                                      e,
                                      null === (l = Ve.get(t)) || void 0 === l
                                          ? void 0
                                          : l.value._,
                                      a
                                  ))),
                          null != u ? u : i(e, Ve));
                },
            });
            return He.pop(), s;
        } catch (e) {
            Be.includes(t) ||
                (Be.push(t),
                Qe([
                    K.error('Syntax error') + ` in "${t + ": '" + n}'"`,
                    e.message,
                ]));
        }
}
function Ke(t, n, a) {
    r(Array.isArray(a), e.UnexpectedTokensArray, K.link('tokens-as-array')),
        Pe.has(n) || Pe.set(n, {}),
        Object.keys(a).forEach((s) => {
            var o;
            const i = (n ? n + '.' : '') + s;
            r(!/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(s), e.InvalidTokenName, i),
                r(!a[s], e.InvalidTokenValue, s);
            try {
                const e = (function (e, t) {
                    if (
                        'string' != typeof t &&
                        ('object' != typeof t || !t.value)
                    )
                        return;
                    let n = { value: {} };
                    return (
                        'string' == typeof t ? (n.value._ = t) : (n = { ...t }),
                        'string' == typeof n.value &&
                            (n.value = { _: n.value }),
                        e &&
                            n.value._ &&
                            ((n.value[e] = n.value._), (n.value._ = void 0)),
                        Object.keys(n.value).forEach((e) => {
                            ze.includes(e) || ze.push(e);
                        }),
                        n
                    );
                })(
                    null !== (o = t.theme) && void 0 !== o
                        ? o
                        : Le.defaultTheme,
                    a[s]
                );
                if (e)
                    if (Ve.has(i)) {
                        const t = Ve.get(i);
                        Ye(t, e), Ve.set(i, t);
                    } else Ve.set(i, e);
                else Ke(t, i, a[s]);
            } catch (e) {
                throw new Error(`${i}: "${a[s]}"\n${e.message}`);
            }
        });
}
function Xe(t) {
    const n = [];
    if (((t = Ce.resolve(Ce.normalize(t))), Ze.includes(t))) return;
    if ((Ze.push(t), je.lstatSync(t).isDirectory()))
        return void Ae.sync(t + '/**/*' + Le.tokenFileExt).forEach(Xe);
    let a;
    try {
        const e = je.readFileSync(t, 'utf8');
        a = /^\.json/.test(Ce.extname(t)) ? _e.parse(e) : Ne.parse(e);
    } catch (e) {
        n.push((e.name ? e.name + ': ' : '') + e.message);
    }
    if (
        ((null == a ? void 0 : a.import) &&
            ('string' == typeof a.import && (a.import = [a.import]),
            Array.isArray(a.import)
                ? a.import.forEach((e) => {
                      let r = t;
                      try {
                          (r = qe(Ce.parse(t).dir, e)), Xe(r);
                      } catch (t) {
                          n.push(`option "import: ${e}"`),
                              'MODULE_NOT_FOUND' === t.code
                                  ? n.push(
                                        'Module not found.' +
                                            ('./' === e.slice(0, 2)
                                                ? ''
                                                : `\nTo import as a file, use a relative path: "./${e}"`)
                                    )
                                  : 'ENOENT' === t.code
                                  ? n.push(
                                        '→ ' + K.path(r) + '\nFile not found.'
                                    )
                                  : n.push(t.message);
                      }
                  })
                : n.push(
                      'Option "import" should be a path or an array of paths'
                  )),
        a &&
            Le.verbose &&
            (a.imports || a.extends || a.include || a.includes) &&
            !a.import &&
            Ge(
                K.warning() +
                    K.path(Ce.relative('', t)) +
                    `\n${K.warning(
                        'Warning:'
                    )} use the \`"import"\` property to import other token files`
            ),
        (null == a ? void 0 : a.groups) &&
            Object.keys(a.groups).forEach((e) => {
                var t;
                if (Pe.has(e)) {
                    const n = Pe.get(e);
                    (n.name =
                        null !== (t = a.groups[e].name) && void 0 !== t
                            ? t
                            : n.name),
                        (n.comment =
                            (n.comment ? n.comment + '\n' : '') +
                            a.groups[e].comment),
                        (n.remarks =
                            (n.remarks ? n.remarks + '\n' : '') +
                            a.groups[e].remarks),
                        Pe.set(e, n);
                } else Pe.set(e, a.groups[e]);
            }),
        null == a ? void 0 : a.tokens)
    ) {
        r('object' != typeof a.tokens, e.UnexpectedTokensType);
        try {
            Ke(a, '', a.tokens);
        } catch (e) {
            n.push(e.message);
        }
    }
    Le.verbose &&
        0 === n.length &&
        Ge(
            K.success() +
                '← ' +
                K.path(process.env.TEST ? Ce.basename(t) : Ce.relative('', t))
        ),
        n.length > 0 &&
            Qe([
                K.error() +
                    '← ' +
                    K.path(
                        process.env.TEST ? Ce.basename(t) : Ce.relative('', t)
                    ),
                ...n,
            ]);
}
function et(e, t, n) {
    Ve.forEach((e, n) => {
        Object.keys(e.value).forEach((e) => {
            t.includes(e);
        });
    });
    const r = [];
    Pe.forEach((e, n) => {
        const a = [...Ve].filter(([e, t]) =>
            n ? e.startsWith(n + '.') : !/\./.test(e)
        );
        r.push({
            groupId: n,
            groupInfo: e,
            tokens: a.map(([e, n]) => ({
                tokenId: e,
                tokenDefinition: n,
                themes: t
                    .map((t) => {
                        const n = e + ('_' === t ? '' : '.' + t);
                        return {
                            theme: t,
                            tokenName: n,
                            tokenValue: De.get(n),
                        };
                    })
                    .filter((e) => e.tokenValue),
            })),
        });
    });
    const a = {};
    return (
        Ve.forEach((e, t) => {
            if (Object.keys(e.value).length > 1)
                Object.keys(e.value).forEach((n) => {
                    a[n] || (a[n] = []);
                    const r = t + ('_' === n ? '' : '.' + n);
                    a[n].push({
                        tokenId: t,
                        tokenName: r,
                        tokenDefinition: e,
                        tokenValue: De.get(r),
                    });
                });
            else {
                const n = Object.keys(e.value)[0],
                    r = t + ('_' === n ? '' : '.' + n);
                a[''] || (a[''] = []),
                    a[''].push({
                        tokenId: t,
                        tokenName: r,
                        tokenDefinition: e,
                        tokenValue: De.get(r),
                    });
            }
        }),
        e.render({
            filepath: n,
            fileHeader: e.fileHeader,
            themes: Object.keys(a).map((e) => ({
                theme: e,
                isDefaultTheme: '_' === e,
                tokens: a[e],
            })),
            groups: r,
            renderTemplate: (e, t) => $e.compile(e.replace(/\r\n/g, '\n'))(t),
        })
    );
}
function tt(t, n) {
    var a, s;
    (Re = null !== (a = null == n ? void 0 : n.watching) && void 0 !== a && a),
        (ze = []),
        (Ve = new Map()),
        (Pe = new Map()),
        (De = new Map()),
        (He = []),
        (Ze = []),
        (Be = []),
        t.forEach((e) => {
            const t = Ae.sync(e);
            0 !== t.length
                ? t.forEach(Xe)
                : Qe(K.error('File not found: ') + K.path(e));
        });
    try {
        Ve.forEach((e, t) => {
            Object.keys(e.value).forEach((n) => {
                var r;
                const a = t + ('_' === n ? '' : '.' + n),
                    s =
                        null !== (r = Je(a, e.value[n], Le.defaultTheme)) &&
                        void 0 !== r
                            ? r
                            : new b(e.value[n]);
                De.set(a, s),
                    e.type &&
                        s.type() != e.type &&
                        Ge(
                            K.warning('Warning:') +
                                ` Type mismatch. Expected \`${
                                    e.type
                                }\` but got \`${s.type()}\` for "${a}" token`
                        );
            });
        }),
            De.forEach((e, t) => {
                C(e) &&
                    (e.value = e.value.replace(/{[a-zA-Z0-9\._-]+}/g, (e) => {
                        const t = e.slice(1, -1);
                        return De.has(t)
                            ? De.get(t).css()
                            : (Qe(
                                  K.error('Unresolved alias. ') +
                                      `Cannot find token "${e}"` +
                                      i(t, De)
                              ),
                              e);
                    }));
            }),
            Ve.forEach((e, t) => {
                ze.forEach((n) => {
                    var r;
                    if ('_' !== n && void 0 === e.value[n]) {
                        const a = t + '.' + n,
                            s =
                                null !== (r = Je(a, e.value._, n)) &&
                                void 0 !== r
                                    ? r
                                    : new b(e.value._);
                        De.set(a, s);
                    }
                });
            }),
            Ve.forEach((e, t) => {
                ze.forEach((e) => {
                    var n;
                    if ('_' !== e) {
                        const r = t + '.' + e;
                        (null === (n = De.get(t)) || void 0 === n
                            ? void 0
                            : n.equals(De.get(r))) && De.delete(r);
                    }
                });
            }),
            Ve.forEach((t, n) => {
                r(
                    Object.keys(t.value).reduce((e, t) => {
                        var r, a;
                        const s = '_' === t ? n : n + '.' + t;
                        return (
                            e.includes(
                                null === (r = De.get(s)) || void 0 === r
                                    ? void 0
                                    : r.type()
                            ) ||
                                e.push(
                                    null === (a = De.get(s)) || void 0 === a
                                        ? void 0
                                        : a.type()
                                ),
                            e
                        );
                    }, []).length > 1,
                    e.InconsistentTokenType,
                    n
                );
            });
        const t = (function (t) {
            const n = {
                fileHeader: u,
                formatFilename: function ({ theme: e, basename: t }) {
                    return t + (e ? '-' + e : '');
                },
                handlebarsHelpers: { ...Le.handlebarsHelpers },
                render: (e) =>
                    'Expected a render() function in the Format definition.',
            };
            r(!Le.formats[t], e.UnknownFormat, t, i(t, Le.formats));
            const a = Le.formats[t].extends;
            return (
                a &&
                    (r(!Le.formats[a], e.UnknownFormat, a, i(a, Le.formats)),
                    Ye(n, Le.formats[a])),
                Ye(n, Le.formats[t]),
                Object.keys(n.handlebarsHelpers).forEach((e) => {
                    $e.registerHelper(e, n.handlebarsHelpers[e]);
                }),
                n
            );
        })(Le.outputFormat);
        t.fileHeader =
            null !== (s = n.header) && void 0 !== s ? s : t.fileHeader;
        const a = (null == n ? void 0 : n.output) && Ce.resolve(n.output),
            o = (function (e, t) {
                var n;
                const r = {};
                let a = '';
                if (
                    !(function () {
                        var e;
                        return (
                            (null === (e = Le.themes) || void 0 === e
                                ? void 0
                                : e.length) > 0 &&
                                (ze = ze.filter((e) => Le.themes.includes(e))),
                            ze.forEach((e) => {
                                let t = 0;
                                Ve.forEach((n, r) => {
                                    void 0 !== n.value[e] && (t += 1);
                                }),
                                    0 === t && ze.splice(ze.indexOf(e), 1);
                            }),
                            (0 !== ze.length && 0 !== Ve.size) ||
                                (Qe([
                                    K.error('No tokens found.'),
                                    'Token files should have a "tokens" property',
                                    K.link('../guide'),
                                ]),
                                !1)
                        );
                    })()
                )
                    return;
                const s =
                    null !== (n = e && Ce.parse(e)) && void 0 !== n
                        ? n
                        : { name: 'tokens' };
                return (
                    Le.splitOutput
                        ? ze.forEach((e) => {
                              (a = Ce.format({
                                  dir: s.dir,
                                  name: t.formatFilename({
                                      theme: e,
                                      basename: s.name,
                                  }),
                                  ext: t.ext,
                              })),
                                  (r[a] = et(t, [e], a));
                          })
                        : ((a = Ce.format({
                              dir: s.dir,
                              name: t.formatFilename({
                                  theme: '',
                                  basename: s.name,
                              }),
                              ext: t.ext,
                          })),
                          (r[a] = et(t, ze, a))),
                    r
                );
            })(a, t);
        if (o && !(null == n ? void 0 : n.dryRun)) {
            if (!a) return o;
            if (Le.verbose) {
                let e = '';
                (1 === ze.length && '_' === ze[0]) ||
                    (e =
                        1 === ze.length
                            ? `for theme "${ze[0]}"`
                            : 'for themes ' +
                              ze.map((e) => '"' + e + '"').join(', ')),
                    Ge(`    Writing ${K.string(Le.outputFormat)} format ${e}`);
            }
            Object.keys(o).forEach((e) => {
                !(function (e, t) {
                    const n = Ce.dirname(t);
                    je.existsSync(n) || je.mkdirsSync(n),
                        je.writeFileSync(t, e),
                        (Le.verbose || Re) &&
                            Ge(
                                K.success() +
                                    (Re ? K.time() + ' ' : '') +
                                    '→ ' +
                                    K.path(Ce.relative('', t))
                            );
                })(o[e], e);
            });
        }
    } catch (e) {
        Qe(K.error(e.message));
    }
    return {};
}
function nt(e, t) {
    var n, r, a, s, o, i, l, u, c, h;
    'string' == typeof e && (e = [e]);
    let p = Fe.search();
    null === (n = null == p ? void 0 : p.isEmpty) ||
        void 0 === n ||
        n ||
        Ye(Le, p.config),
        (null == t ? void 0 : t.config) &&
            ((p = Fe.load(t.config)),
            null === (r = null == p ? void 0 : p.isEmpty) ||
                void 0 === r ||
                r ||
                Ye(Le, p.config)),
        (null == t ? void 0 : t.themes) &&
            ('string' == typeof t.themes
                ? (Le.themes = t.themes.split(',').map((e) => e.trim()))
                : Array.isArray(t.themes) && (Le.themes = [...t.themes])),
        (We =
            null !== (a = null == t ? void 0 : t.ignoreErrors) &&
            void 0 !== a &&
            a);
    const m = [];
    if (
        ('string' == typeof (null == t ? void 0 : t.console)
            ? 'log' === (null == t ? void 0 : t.console) &&
              (K.useColor(!1),
              (Le.console = {
                  log: (e) => {
                      m.push(e);
                  },
                  error: (e) => {
                      m.push(e);
                  },
              }))
            : (Le.console =
                  null !== (s = null == t ? void 0 : t.console) && void 0 !== s
                      ? s
                      : {
                            log: (e) => console.error(e),
                            error: (e) => console.error(e),
                        }),
        Le.themes || (Le.themes = []),
        (Le.tokenFileExt =
            null !==
                (i =
                    null !== (o = null == t ? void 0 : t.tokenFileExt) &&
                    void 0 !== o
                        ? o
                        : null == Le
                        ? void 0
                        : Le.tokenFileExt) && void 0 !== i
                ? i
                : 'yaml'),
        (Le.verbose =
            null !==
                (u =
                    null !== (l = null == t ? void 0 : t.verbose) &&
                    void 0 !== l
                        ? l
                        : null == Le
                        ? void 0
                        : Le.verbose) &&
            void 0 !== u &&
            u),
        (Le.splitOutput = t.splitOutput),
        (Le.outputFormat =
            null !==
                (h =
                    null !== (c = null == t ? void 0 : t.format) && void 0 !== c
                        ? c
                        : null == Le
                        ? void 0
                        : Le.outputFormat) && void 0 !== h
                ? h
                : ''),
        !Le.outputFormat)
    ) {
        const e =
            (null == t ? void 0 : t.output) &&
            Ce.extname(null == t ? void 0 : t.output);
        if (e) {
            const t = Object.keys(Le.formats).filter((t) => {
                var n, r;
                return (
                    Le.formats[t].ext === e ||
                    (null ===
                        (r =
                            Le.formats[
                                null === (n = Le.formats[t]) || void 0 === n
                                    ? void 0
                                    : n.extends
                            ]) || void 0 === r
                        ? void 0
                        : r.ext)
                );
            });
            1 === t.length
                ? (Le.outputFormat = t[0])
                : Le.formats[e.slice(1)]
                ? (Le.outputFormat = e.slice(1))
                : t.length > 1 &&
                  Qe([
                      K.error('Ambiguous format. ') +
                          `Use ${K.keyword(
                              '--format'
                          )} to indicate which output format to use.`,
                      `Did you mean \`${t.join(', ')}\`?`,
                  ]);
        }
        Le.outputFormat
            ? Le.verbose &&
              Ge(
                  K.warning() +
                      'Setting the format to "gConfig.outputFormat" based on the output file extension. Use `--format` to indicate which output format to use.'
              )
            : ((Le.outputFormat = 'yaml'),
              Ge(
                  K.warning('Format not specified.') +
                      ` Using "${K.keyword('yaml')}". ` +
                      `Use ${K.keyword(
                          '--format'
                      )} to indicate which output format to use.`
              ));
    }
    Ye(Le.handlebarsHelpers, null == t ? void 0 : t.handlebarsHelpers);
    const d = tt(e, t);
    return m.length > 0 && (d.stderr = m.join('\n')), d;
}
Ye(Le, l),
    Ye(Le, ke),
    Ye(Le, be),
    Ye(Le, Se),
    (module.exports = nt),
    (exports.chromatic = nt);
