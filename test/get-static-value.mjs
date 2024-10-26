import assert from "assert"
import eslint from "eslint"
import semver from "semver"
import { getStaticValue } from "../src/index.mjs"
import { getScope } from "./test-lib/eslint-compat.mjs"

describe("The 'getStaticValue' function", () => {
    for (const { code, expected, noScope = false } of [
        { code: "[]", expected: { value: [] } },
        { code: "[1, 2, 3]", expected: { value: [1, 2, 3] } },
        { code: "[,, 3]", expected: { value: [, , 3] } }, //eslint-disable-line no-sparse-arrays
        { code: "[1, ...[2, 3]]", expected: { value: [1, 2, 3] } },
        { code: "[1, ...[2, 3]].length", expected: { value: 3 } },
        { code: "[1, ...[2, 3]]['1']", expected: { value: 2 } },
        { code: "[0, a]", expected: null },
        { code: "[0, ...a]", expected: null },
        { code: "a = 1 + 2", expected: { value: 3 } },
        { code: "a += 1 + 2", expected: null },
        { code: "a in obj", expected: null },
        { code: "obj instanceof Object", expected: null },
        { code: "1 == '1'", expected: { value: true } },
        { code: "1 != '1'", expected: { value: false } },
        { code: "1 === '1'", expected: { value: false } },
        { code: "1 !== '1'", expected: { value: true } },
        { code: "1 < '1'", expected: { value: false } },
        { code: "1 <= '1'", expected: { value: true } },
        { code: "1 > '1'", expected: { value: false } },
        { code: "1 >= '1'", expected: { value: true } },
        { code: "1 << '1'", expected: { value: 2 } },
        { code: "1 >> '1'", expected: { value: 0 } },
        { code: "1 >>> '1'", expected: { value: 0 } },
        { code: "1 + '1'", expected: { value: "11" } },
        { code: "1 + 2", expected: { value: 3 } },
        { code: "1 - 2", expected: { value: -1 } },
        { code: "1 * 2", expected: { value: 2 } },
        { code: "1 / 2", expected: { value: 0.5 } },
        { code: "1 % 2", expected: { value: 1 } },
        { code: "2 ** 2", expected: { value: 4 } },
        { code: "1 | 2", expected: { value: 3 } },
        { code: "1 ^ 15", expected: { value: 14 } },
        { code: "3 & 2", expected: { value: 2 } },
        { code: "a + 1", expected: null },
        {
            code: "(123.456).toExponential()",
            expected: { value: "1.23456e+2" },
        },
        { code: "(123.456).toExponential(3)", expected: { value: "1.235e+2" } },
        { code: "(123.456).toFixed()", expected: { value: "123" } },
        { code: "(123.456).toFixed(1)", expected: { value: "123.5" } },
        { code: "(123.456).toPrecision()", expected: { value: "123.456" } },
        { code: "(123.456).toPrecision(2)", expected: { value: "1.2e+2" } },
        { code: "(123.456).toString()", expected: { value: "123.456" } },
        { code: "(123).toString(16)", expected: { value: "7b" } },
        { code: "String(7)", expected: { value: "7" } },
        { code: "Math.round(0.7)", expected: { value: 1 } },
        { code: "Math['round'](0.4)", expected: { value: 0 } },
        { code: "foo(7)", expected: null },
        { code: "obj.foo(7)", expected: null },
        { code: "Math.round(a)", expected: null },
        { code: "Math.random()", expected: null },
        { code: "Math['random']()", expected: null },
        { code: "true ? 1 : c", expected: { value: 1 } },
        { code: "false ? b : 2", expected: { value: 2 } },
        { code: "a ? 1 : 2", expected: null },
        { code: "true ? b : 2", expected: null },
        { code: "false ? 1 : c", expected: null },
        { code: "undefined", expected: { value: undefined } },
        { code: "var undefined; undefined", expected: null },
        { code: "const undefined = 1; undefined", expected: { value: 1 } },
        { code: "const a = 2; a", expected: { value: 2 } },
        { code: "let a = 2; a", expected: { value: 2 } },
        { code: "var a = 2; a", expected: { value: 2 } },
        { code: "let a = 2; a = 1; a", expected: null },
        { code: "let a = 2; a++; a", expected: null },
        { code: "let a; a = 1; a", expected: null },
        { code: "const a = 2; a", expected: null, noScope: true },
        { code: "const a = { b: 7 }; a.b", expected: { value: 7 } },
        { code: "null", expected: { value: null } },
        { code: "true", expected: { value: true } },
        { code: "false", expected: { value: false } },
        { code: "1", expected: { value: 1 } },
        { code: "'hello'", expected: { value: "hello" } },
        { code: "/foo/gu", expected: { value: /foo/gu } },
        { code: "RegExp(/foo/gu)", expected: { value: /foo/gu } },
        { code: "RegExp(/foo/, 'gu')", expected: { value: /foo/gu } },
        { code: "RegExp('foo', 'gu')", expected: { value: /foo/gu } },
        { code: "new RegExp('foo', 'gu')", expected: { value: /foo/gu } },
        { code: "/foo/gu.source", expected: { value: "foo" } },
        { code: "/foo/gu.flags", expected: { value: "gu" } },
        { code: "/foo/gu.unicode", expected: { value: true } },
        { code: "/foo/gu.ignoreCase", expected: { value: false } },
        { code: "true && 1", expected: { value: 1 } },
        { code: "false && a", expected: { value: false } },
        { code: "true || a", expected: { value: true } },
        { code: "false || 2", expected: { value: 2 } },
        { code: "true && a", expected: null },
        { code: "false || a", expected: null },
        { code: "a && 1", expected: null },
        { code: "Symbol.iterator", expected: { value: Symbol.iterator } },
        {
            code: "Symbol['iter' + 'ator']",
            expected: { value: Symbol.iterator },
        },
        { code: "Symbol[iterator]", expected: null },
        {
            code: "const symbol = Symbol(); (symbol === symbol)",
            expected: null,
        },
        { code: "Object.freeze", expected: { value: Object.freeze } },
        { code: "Object.xxx", expected: { value: undefined } },
        { code: "new Array(2)", expected: null },
        { code: "new Array(len)", expected: null },
        { code: "Array.of()", expected: { value: [] } },
        { code: "Array.of(1)", expected: { value: [1] } },
        { code: "Array.of(1, 2)", expected: { value: [1, 2] } },
        {
            code: "[0,1,2].at(-1)",
            expected: Array.prototype.at ? { value: 2 } : null,
        },
        {
            code: "[0,1,2].concat([3,4], [5])",
            expected: { value: [0, 1, 2, 3, 4, 5] },
        },
        { code: "[0,1,2].every(Boolean)", expected: { value: false } },
        { code: "[0,1,2].filter(Boolean)", expected: { value: [1, 2] } },
        { code: "[0,1,2].find((i) => i === 2)", expected: null },
        { code: "[0,1,2].findIndex((i) => i === 2)", expected: null },
        {
            code: "[-1, [0,1,2], [[4]]].flat()",
            expected: { value: [-1, 0, 1, 2, [4]] },
        },
        { code: "[0,1,2].includes(4)", expected: { value: false } },
        { code: "[0,1,2].indexOf(4)", expected: { value: -1 } },
        { code: "[0,1,2].join()", expected: { value: "0,1,2" } },
        { code: "[0,1,2].join('|')", expected: { value: "0|1|2" } },
        { code: "[1,1,1].lastIndexOf(1)", expected: { value: 2 } },
        { code: "[0,1,2].slice(1)", expected: { value: [1, 2] } },
        { code: "[0,1,2].some(Boolean)", expected: { value: true } },
        { code: "[0,1,2].toString()", expected: { value: "0,1,2" } },
        { code: "String([0,1,2])", expected: { value: "0,1,2" } },
        { code: "[...[0,1,,2].keys()]", expected: { value: [0, 1, 2, 3] } },
        {
            code: "[...[0,1,,2].values()]",
            expected: { value: [0, 1, undefined, 2] },
        },
        {
            code: "[...[0,1,,2].entries()]",
            expected: {
                value: [
                    [0, 0],
                    [1, 1],
                    [2, undefined],
                    [3, 2],
                ],
            },
        },
        { code: "({})", expected: { value: {} } },
        {
            code: "({a: 1, b: 2, c: 3})",
            expected: { value: { a: 1, b: 2, c: 3 } },
        },
        {
            code: "const obj = {b: 2}; ({a: 1, ...obj})",
            expected: { value: { a: 1, b: 2 } },
        },
        {
            code: "var obj = {b: 2}; ({a: 1, ...obj})",
            expected: { value: { a: 1, b: 2 } },
        },
        {
            code: "var obj = {b: 2}; obj = {}; ({a: 1, ...obj})",
            expected: null,
        },
        { code: "({ get a() {} })", expected: null },
        { code: "({ a })", expected: null },
        { code: "({ a: b })", expected: null },
        { code: "({ [a]: 1 })", expected: null },
        { code: "(a, b, 3)", expected: { value: 3 } },
        { code: "(1, b)", expected: null },
        { code: "`hello`", expected: { value: "hello" } },
        { code: "const ll = 'll'; `he${ll}o`", expected: { value: "hello" } }, //eslint-disable-line no-template-curly-in-string
        { code: "String.raw`\\unicode`", expected: { value: "\\unicode" } },
        { code: "`he${a}o`", expected: null }, //eslint-disable-line no-template-curly-in-string
        { code: "x`hello`", expected: null },
        { code: "'abc'.length", expected: { value: 3 } },
        { code: "'abc'[1]", expected: { value: "b" } },
        { code: "'  foo  '.trim()", expected: { value: "foo" } },
        { code: "'  foo  '.trim().toUpperCase()", expected: { value: "FOO" } },
        { code: "'  foo  '.indexOf('f')", expected: { value: 2 } },
        { code: "'  foo  '.charAt(4)", expected: { value: "o" } },
        { code: "'  foo  '.charCodeAt(400)", expected: { value: NaN } },
        { code: "'  foo  '.repeat(1e12)", expected: null },
        { code: "-1", expected: { value: -1 } },
        { code: "+'1'", expected: { value: 1 } },
        { code: "!0", expected: { value: true } },
        { code: "~-1", expected: { value: 0 } },
        { code: "typeof 0", expected: { value: "number" } },
        { code: "void a.b", expected: { value: undefined } },
        { code: "+a", expected: null },
        { code: "delete a.b", expected: null },
        { code: "!function(){ return true }", expected: null },
        { code: "'' + Symbol()", expected: null },
        {
            code: `const eventName = "click"
const aMap = Object.freeze({
    click: 777
})
;\`on\${eventName} : \${aMap[eventName]}\``,
            expected: { value: "onclick : 777" },
        },
        {
            code: 'Function("return process.env.npm_name")()',
            expected: null,
        },
        {
            code: 'new Function("return process.env.npm_name")()',
            expected: null,
        },
        {
            code: '({}.constructor.constructor("return process.env.npm_name")())',
            expected: null,
        },
        {
            code: 'JSON.stringify({a:1}, new {}.constructor.constructor("console.log(\\"code injected\\"); process.exit(1)"), 2)',
            expected: null,
        },
        {
            code: 'Object.create(null, {a:{get:new {}.constructor.constructor("console.log(\\"code injected\\"); process.exit(1)")}}).a',
            expected: null,
        },
        {
            code: "RegExp.$1",
            expected: null,
        },
        {
            code: "const a = null, b = 42; a ?? b",
            expected: { value: 42 },
        },
        {
            code: "const a = undefined, b = 42; a ?? b",
            expected: { value: 42 },
        },
        {
            code: "const a = false, b = 42; a ?? b",
            expected: { value: false },
        },
        {
            code: "const a = 42, b = null; a ?? b",
            expected: { value: 42 },
        },
        {
            code: "const a = 42, b = undefined; a ?? b",
            expected: { value: 42 },
        },
        {
            code: "const a = { b: { c: 42 } }; a?.b?.c",
            expected: { value: 42 },
        },
        {
            code: "const a = { b: { c: 42 } }; a?.b?.['c']",
            expected: { value: 42 },
        },
        {
            code: "const a = { b: null }; a?.b?.c",
            expected: { value: undefined },
        },
        {
            code: "const a = { b: undefined }; a?.b?.c",
            expected: { value: undefined },
        },
        {
            code: "const a = { b: null }; a?.b?.['c']",
            expected: { value: undefined },
        },
        {
            code: "const a = null; a?.b?.c",
            expected: { value: undefined },
        },
        {
            code: "const a = null; a?.b.c",
            expected: { value: undefined },
        },
        {
            code: "const a = void 0; a?.b.c",
            expected: { value: undefined },
        },
        {
            code: "const a = { b: { c: 42 } }; (a?.b).c",
            expected: { value: 42 },
        },
        {
            code: "const a = null; (a?.b).c",
            expected: null,
        },
        {
            code: "const a = { b: null }; (a?.b).c",
            expected: null,
        },
        {
            code: "const a = { b: { c: String } }; a?.b?.c?.(42)",
            expected: { value: "42" },
        },
        {
            code: "const a = null; a?.b?.c?.(42)",
            expected: { value: undefined },
        },
        {
            code: "const a = { b: { c: String } }; a?.b.c(42)",
            expected: { value: "42" },
        },
        {
            code: "const a = null; a?.b.c(42)",
            expected: { value: undefined },
        },
        {
            code: "null?.()",
            expected: { value: undefined },
        },
        {
            code: "const a = null; a?.()",
            expected: { value: undefined },
        },
        {
            code: "a?.()",
            expected: null,
        },
        {
            code: "({'a': 1, 1e+1: 2, 2n: 3})",
            expected: { value: { a: 1, 10: 2, 2: 3 } },
        },
        {
            code: "new Set([1,2])",
            expected: { value: new Set([1, 2]) },
        },
        {
            code: "new Set([1,2]).has(2)",
            expected: { value: true },
        },
        { code: "new Set([1,2]).size", expected: { value: 2 } },
        {
            code: "new Map([[1,2], [4,6]])",
            expected: {
                value: new Map([
                    [1, 2],
                    [4, 6],
                ]),
            },
        },
        {
            code: "const m = new Map([[1,2], [4,6]]); m.get(1)",
            expected: { value: 2 },
        },
        {
            code: "const m = new Map([[1,2], [4,6]]); m.has(2)",
            expected: { value: false },
        },
        { code: "new Map([[1,2], [4,6]]).size", expected: { value: 2 } },
        ...(semver.gte(eslint.Linter.version, "8.0.0")
            ? [
                  {
                      code: `class A {
                          #x = 0;
                          fn () {
                              const foo = {x:42}
                              foo.#x // not 42
                          }
                      }`,
                      expected: null,
                  },
                  {
                      code: `class A {
                          #x = 0;
                          fn () {
                              const foo = {x:42}
                              foo.x // 42
                          }
                      }`,
                      expected: { value: 42 },
                  },
                  {
                      code: `class A {
                          #parseInt;
                          fn () {
                              Number.#parseInt('42') // not 42
                          }
                      }`,
                      expected: null,
                  },
                  {
                      code: `class A {
                          #parseInt;
                          fn () {
                              Number.parseInt('42') // 42
                          }
                      }`,
                      expected: { value: 42 },
                  },
              ]
            : []),
    ]) {
        it(`should return ${JSON.stringify(expected)} from ${code}`, () => {
            const linter = new eslint.Linter()

            let actual = null
            linter.defineRule("test", (context) => ({
                ExpressionStatement(node) {
                    actual = getStaticValue(
                        node,
                        noScope ? null : getScope(context, node),
                    )
                },
            }))
            const messages = linter.verify(code, {
                env: { es6: true },
                parserOptions: {
                    ecmaVersion: semver.gte(eslint.Linter.version, "8.0.0")
                        ? 2022
                        : 2020,
                },
                rules: { test: "error" },
            })

            assert.strictEqual(
                messages.length,
                0,
                messages[0] && messages[0].message,
            )
            if (actual == null) {
                assert.strictEqual(actual, expected)
            } else {
                assert.deepStrictEqual(actual, expected)
            }
        })
    }
})
