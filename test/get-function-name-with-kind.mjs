import assert from "assert"
import eslint from "eslint"
import semver from "semver"
import {
    getFunctionNameWithKind,
    getFunctionNameWithKindParts,
} from "../src/index.mjs"
import { newCompatLinter } from "./test-lib/eslint-compat.mjs"

describe("The 'getFunctionNameWithKind' function", () => {
    const expectedResults = {
        "function foo() {}": "function 'foo'",
        "(function foo() {})": "function 'foo'",
        "(function() {})": "function",
        "function* foo() {}": "generator function 'foo'",
        "(function* foo() {})": "generator function 'foo'",
        "(function*() {})": "generator function",
        "() => {}": "arrow function",
        "async () => {}": "async arrow function",
        "const foo = () => {}": "arrow function 'foo'",
        "const foo = async () => {}": "async arrow function 'foo'",
        "foo = () => {}": "arrow function 'foo'",
        "foo = async () => {}": "async arrow function 'foo'",
        "foo.bar = () => {}": "arrow function",
        "foo.bar = async () => {}": "async arrow function",
        "const foo = function() {}": "function 'foo'",
        "const foo = function* () {}": "generator function 'foo'",
        "const foo = async function() {}": "async function 'foo'",
        "foo = function() {}": "function 'foo'",
        "foo = function* () {}": "generator function 'foo'",
        "foo = async function() {}": "async function 'foo'",
        "const foo = function bar() {}": "function 'bar'",
        "foo = function bar() {}": "function 'bar'",
        "foo.bar = function() {}": "function",
        "foo.bar = function* () {}": "generator function",
        "foo.bar = async function() {}": "async function",
        "({ foo: function foo() {} })": "method 'foo'",
        "({ foo: function() {} })": "method 'foo'",
        "({ ['foo']: function() {} })": "method 'foo'",
        "({ '': function() {} })": "method ''",
        "({ ['']: function() {} })": "method ''",
        "({ '': () => {} })": "method ''",
        "({ [foo]: function() {} })": "method [foo]",
        "({ foo() {} })": "method 'foo'",
        "({ foo: function* foo() {} })": "generator method 'foo'",
        "({ foo: function*() {} })": "generator method 'foo'",
        "({ ['foo']: function*() {} })": "generator method 'foo'",
        "({ [foo]: function*() {} })": "generator method [foo]",
        "({ *foo() {} })": "generator method 'foo'",
        "({ foo: async function foo() {} })": "async method 'foo'",
        "({ foo: async function() {} })": "async method 'foo'",
        "({ ['foo']: async function() {} })": "async method 'foo'",
        "({ [foo]: async function() {} })": "async method [foo]",
        "({ async foo() {} })": "async method 'foo'",
        "({ get foo() {} })": "getter 'foo'",
        "({ set foo(a) {} })": "setter 'foo'",
        "class A { constructor() {} }": "constructor",
        "class A { foo() {} }": "method 'foo'",
        "class A { *foo() {} }": "generator method 'foo'",
        "class A { async foo() {} }": "async method 'foo'",
        "class A { ['foo']() {} }": "method 'foo'",
        "class A { ''() {} }": "method ''",
        "class A { ['']() {} }": "method ''",
        "class A { *['foo']() {} }": "generator method 'foo'",
        "class A { async ['foo']() {} }": "async method 'foo'",
        "class A { [foo]() {} }": "method [foo]",
        "class A { *[foo]() {} }": "generator method [foo]",
        "class A { async [foo]() {} }": "async method [foo]",
        "class A { get foo() {} }": "getter 'foo'",
        "class A { set foo(a) {} }": "setter 'foo'",
        "class A { static foo() {} }": "static method 'foo'",
        "class A { static *foo() {} }": "static generator method 'foo'",
        "class A { static async foo() {} }": "static async method 'foo'",
        "class A { static get foo() {} }": "static getter 'foo'",
        "class A { static set foo(a) {} }": "static setter 'foo'",
        "export default async function* foo() {}":
            "async generator function 'foo'",
        "export default async function* () {}":
            "async generator function 'default'",
        "export default async () => {}": "async arrow function 'default'",

        ...(semver.gte(eslint.Linter.version, "8.0.0")
            ? {
                  "class A { #foo() {} }": "private method #foo",
                  "class A { '#foo'() {} }": "method '#foo'",
                  "class A { *#foo() {} }": "private generator method #foo",
                  "class A { async #foo() {} }": "private async method #foo",
                  "class A { get #foo() {} }": "private getter #foo",
                  "class A { set #foo(a) {} }": "private setter #foo",
                  "class A { static #foo() {} }": "static private method #foo",
                  "class A { static *#foo() {} }":
                      "static private generator method #foo",
                  "class A { static async #foo() {} }":
                      "static private async method #foo",
                  "class A { static get #foo() {} }":
                      "static private getter #foo",
                  "class A { static set #foo(a) {} }":
                      "static private setter #foo",
                  "class A { foo = function() {} }": "method 'foo'",
                  "class A { foo = () => {} }": "method 'foo'",
                  "class A { foo = function*() {} }": "generator method 'foo'",
                  "class A { foo = async function() {} }": "async method 'foo'",
                  "class A { ['foo'] = function() {} }": "method 'foo'",
                  "class A { ['foo'] = () => {} }": "method 'foo'",
                  "class A { '' = () => {} }": "method ''",
                  "class A { [''] = () => {} }": "method ''",
                  "class A { ['foo'] = function*() {} }":
                      "generator method 'foo'",
                  "class A { ['foo'] = async function() {} }":
                      "async method 'foo'",
                  "class A { [foo] = function() {} }": "method [foo]",
                  "class A { [foo] = () => {} }": "method [foo]",
                  "class A { [foo] = function*() {} }":
                      "generator method [foo]",
                  "class A { [foo] = async function() {} }":
                      "async method [foo]",
                  "class A { static foo = function() {} }":
                      "static method 'foo'",
                  "class A { static foo = () => {} }": "static method 'foo'",
                  "class A { static foo = function*() {} }":
                      "static generator method 'foo'",
                  "class A { static foo = async function() {} }":
                      "static async method 'foo'",
                  "class A { #foo = function() {} }": "private method #foo",
                  "class A { #foo = () => {} }": "private method #foo",
                  "class A { #foo = function*() {} }":
                      "private generator method #foo",
                  "class A { #foo = async function() {} }":
                      "private async method #foo",
                  "class A { static #foo = function() {} }":
                      "static private method #foo",
                  "class A { static #foo = () => {} }":
                      "static private method #foo",
                  "class A { static #foo = function*() {} }":
                      "static private generator method #foo",
                  "class A { static #foo = async function() {} }":
                      "static private async method #foo",
              }
            : {}),
    }

    for (const key of Object.keys(expectedResults)) {
        const expectedResult1 = expectedResults[key].replace(/\s+\[.+?\]/gu, "")
        const expectedResult2 = expectedResults[key]

        it(`should return "${expectedResult1}" for "${key}".`, () => {
            const linter = newCompatLinter()

            let actualResult = null
            const messages = linter.verify(key, {
                rules: { "test/test": "error" },
                languageOptions: {
                    ecmaVersion: semver.gte(eslint.Linter.version, "8.0.0")
                        ? 2022
                        : 2020,
                    sourceType: "module",
                },
                plugins: {
                    test: {
                        rules: {
                            test: {
                                create() {
                                    return {
                                        ":function"(node) {
                                            actualResult =
                                                getFunctionNameWithKind(node)
                                        },
                                    }
                                },
                            },
                        },
                    },
                },
            })

            assert.strictEqual(
                messages.length,
                0,
                messages[0] && messages[0].message,
            )
            assert.strictEqual(actualResult, expectedResult1)
        })

        it(`should return "${expectedResult2}" for "${key}" if sourceCode is present.`, () => {
            const linter = newCompatLinter()

            let actualResult = null
            const messages = linter.verify(key, {
                rules: { "test/test": "error" },
                languageOptions: {
                    ecmaVersion: semver.gte(eslint.Linter.version, "8.0.0")
                        ? 2022
                        : 2020,
                    sourceType: "module",
                },
                plugins: {
                    test: {
                        rules: {
                            test: {
                                create(context) {
                                    return {
                                        ":function"(node) {
                                            actualResult =
                                                getFunctionNameWithKind(
                                                    node,
                                                    context.getSourceCode(),
                                                )
                                        },
                                    }
                                },
                            },
                        },
                    },
                },
            })

            assert.strictEqual(
                messages.length,
                0,
                messages[0] && messages[0].message,
            )
            assert.strictEqual(actualResult, expectedResult2)
        })
    }

    it('should return "" when node has no parent.', () => {
        const detachedNode = {
            type: "FunctionExpression",
            id: null,
            params: [],
            body: { type: "BlockStatement", body: [] },
            async: false,
            generator: false,
        }
        assert.strictEqual(getFunctionNameWithKind(detachedNode), "")
    })
})

describe("The 'getFunctionNameWithKindParts' function", () => {
    const explicitCases = [
        {
            code: "function foo() {}",
            expected: {
                modifiers: [],
                kinds: ["function"],
                name: "'foo'",
            },
        },
        {
            code: "(function() {})",
            expected: {
                modifiers: [],
                kinds: ["function"],
                name: null,
            },
        },
        {
            code: "async () => {}",
            expected: {
                modifiers: ["async"],
                kinds: ["arrow", "function"],
                name: null,
            },
        },
        {
            code: "export default function () {}",
            expected: {
                modifiers: [],
                kinds: ["function"],
                name: "'default'",
            },
        },
        {
            code: "export default async function* () {}",
            expected: {
                modifiers: ["async", "generator"],
                kinds: ["function"],
                name: "'default'",
            },
        },
        {
            code: "export default () => {}",
            expected: {
                modifiers: [],
                kinds: ["arrow", "function"],
                name: "'default'",
            },
        },
        {
            code: "class A { constructor() {} }",
            expected: {
                modifiers: [],
                kinds: ["constructor"],
                name: null,
            },
        },
        {
            code: "class A { static async foo() {} }",
            expected: {
                modifiers: ["static", "async"],
                kinds: ["method"],
                name: "'foo'",
            },
        },
        {
            code: "({ '': function() {} })",
            expected: {
                modifiers: [],
                kinds: ["method"],
                name: "''",
            },
        },
        {
            code: "({ ['']: () => {} })",
            expected: {
                modifiers: [],
                kinds: ["method"],
                name: "''",
            },
        },
        {
            code: "class A { ''() {} }",
            expected: {
                modifiers: [],
                kinds: ["method"],
                name: "''",
            },
        },
        {
            code: "({ [foo]: async function*() {} })",
            expectedWithoutSourceCode: {
                modifiers: ["async", "generator"],
                kinds: ["method"],
                name: null,
            },
            expected: {
                modifiers: ["async", "generator"],
                kinds: ["method"],
                name: "[foo]",
            },
        },
        {
            code: "({ [foo +\nbar]: function() {} })",
            expected: {
                modifiers: [],
                kinds: ["method"],
                name: null,
            },
        },
        ...(semver.gte(eslint.Linter.version, "8.0.0")
            ? [
                  {
                      code: "class A { static async *#foo() {} }",
                      expected: {
                          modifiers: [
                              "static",
                              "private",
                              "async",
                              "generator",
                          ],
                          kinds: ["method"],
                          name: "#foo",
                      },
                  },
                  {
                      code: "class A { static #foo = async () => {} }",
                      expected: {
                          modifiers: ["static", "private", "async"],
                          kinds: ["method"],
                          name: "#foo",
                      },
                  },
              ]
            : []),
    ]

    for (const testCase of explicitCases) {
        it(`should return separate modifiers, kinds, and name for "${testCase.code.replace(
            /\n/gu,
            "\\n",
        )}".`, () => {
            const linter = newCompatLinter()
            let withoutSourceCode = null
            let withSourceCode = null
            let joinedFromHelper = null

            const messages = linter.verify(testCase.code, {
                rules: { "test/test": "error" },
                languageOptions: {
                    ecmaVersion: semver.gte(eslint.Linter.version, "8.0.0")
                        ? 2022
                        : 2020,
                    sourceType: "module",
                },
                plugins: {
                    test: {
                        rules: {
                            test: {
                                create(context) {
                                    return {
                                        ":function"(node) {
                                            withoutSourceCode =
                                                getFunctionNameWithKindParts(
                                                    node,
                                                )
                                            withSourceCode =
                                                getFunctionNameWithKindParts(
                                                    node,
                                                    context.getSourceCode(),
                                                )
                                            joinedFromHelper =
                                                getFunctionNameWithKind(
                                                    node,
                                                    context.getSourceCode(),
                                                )
                                        },
                                    }
                                },
                            },
                        },
                    },
                },
            })

            assert.strictEqual(
                messages.length,
                0,
                messages[0] && messages[0].message,
            )
            assert.deepStrictEqual(
                withoutSourceCode,
                testCase.expectedWithoutSourceCode || testCase.expected,
            )
            assert.deepStrictEqual(withSourceCode, testCase.expected)
            assert.strictEqual(
                [
                    ...withSourceCode.modifiers,
                    ...withSourceCode.kinds,
                    ...(withSourceCode.name ? [withSourceCode.name] : []),
                ].join(" "),
                joinedFromHelper,
            )
        })
    }

    it("should handle AssignmentPattern default parameter functions.", () => {
        const linter = newCompatLinter()
        const collected = []

        const messages = linter.verify(
            "function outer(fn = async () => {}) {}",
            {
                rules: { "test/test": "error" },
                languageOptions: {
                    ecmaVersion: 2020,
                    sourceType: "module",
                },
                plugins: {
                    test: {
                        rules: {
                            test: {
                                create() {
                                    return {
                                        ArrowFunctionExpression(node) {
                                            collected.push(
                                                getFunctionNameWithKindParts(
                                                    node,
                                                ),
                                            )
                                        },
                                    }
                                },
                            },
                        },
                    },
                },
            },
        )

        assert.strictEqual(messages.length, 0)
        assert.deepStrictEqual(collected, [
            {
                modifiers: ["async"],
                kinds: ["arrow", "function"],
                name: "'fn'",
            },
        ])
    })

    it("should return empty modifiers/kinds and null name when node has no parent.", () => {
        const detachedNode = {
            type: "FunctionExpression",
            id: null,
            params: [],
            body: { type: "BlockStatement", body: [] },
            async: true,
            generator: true,
        }
        assert.deepStrictEqual(getFunctionNameWithKindParts(detachedNode), {
            modifiers: [],
            kinds: [],
            name: null,
        })
    })
})
