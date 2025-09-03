import tsParser from "@typescript-eslint/parser"
import assert from "assert"
import { getProperty } from "dot-prop"
import { isParenthesized } from "../src/index.mjs"
import { newCompatLinter } from "./test-lib/eslint-compat.mjs"

describe("The 'isParenthesized' function", () => {
    for (const { code, expected, parser } of [
        {
            code: "777",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
            },
        },
        {
            code: "(777)",
            expected: {
                "body[0]": false,
                "body[0].expression": true,
            },
        },
        {
            code: "(777 + 223)",
            expected: {
                "body[0]": false,
                "body[0].expression": true,
                "body[0].expression.left": false,
                "body[0].expression.right": false,
            },
        },
        {
            code: "(777) + 223",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.left": true,
                "body[0].expression.right": false,
            },
        },
        {
            code: "((777) + 223)",
            expected: {
                "body[0]": false,
                "body[0].expression": true,
                "body[0].expression.left": true,
                "body[0].expression.right": false,
            },
        },
        {
            code: "f()",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
            },
        },
        {
            code: "(f())",
            expected: {
                "body[0]": false,
                "body[0].expression": true,
                "body[0].expression.arguments[0]": false,
            },
        },
        {
            code: "f(a)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
            },
        },
        {
            code: "f((a))",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": true,
            },
        },
        {
            code: "f(a,b)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
                "body[0].expression.arguments[1]": false,
            },
        },
        {
            code: "f((a),b)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": true,
                "body[0].expression.arguments[1]": false,
            },
        },
        {
            code: "f(a,(b))",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
                "body[0].expression.arguments[1]": true,
            },
        },
        {
            code: "new f(a)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
            },
        },
        {
            code: "new f((a))",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": true,
            },
        },
        {
            code: "do f(); while (a)",
            expected: {
                "body[0]": false,
                "body[0].test": false,
                "body[0].body": false,
                "body[0].body.expression": false,
            },
        },
        {
            code: "do (f()); while ((a))",
            expected: {
                "body[0]": false,
                "body[0].test": true,
                "body[0].body": false,
                "body[0].body.expression": true,
            },
        },
        {
            code: "if (a) b()",
            expected: {
                "body[0]": false,
                "body[0].test": false,
                "body[0].consequent": false,
                "body[0].consequent.expression": false,
            },
        },
        {
            code: "if ((a)) (b())",
            expected: {
                "body[0]": false,
                "body[0].test": true,
                "body[0].consequent": false,
                "body[0].consequent.expression": true,
            },
        },
        {
            code: "while (a) b()",
            expected: {
                "body[0]": false,
                "body[0].test": false,
                "body[0].body": false,
                "body[0].body.expression": false,
            },
        },
        {
            code: "while ((a)) (b())",
            expected: {
                "body[0]": false,
                "body[0].test": true,
                "body[0].body": false,
                "body[0].body.expression": true,
            },
        },
        {
            code: "switch (a) {}",
            expected: {
                "body[0]": false,
                "body[0].discriminant": false,
            },
        },
        {
            code: "switch ((a)) {}",
            expected: {
                "body[0]": false,
                "body[0].discriminant": true,
            },
        },
        {
            code: "with (a) {}",
            expected: {
                "body[0]": false,
                "body[0].object": false,
            },
        },
        {
            code: "with ((a)) {}",
            expected: {
                "body[0]": false,
                "body[0].object": true,
            },
        },
        {
            code: "try {} catch (a) {}",
            expected: {
                "body[0].handler.param": false,
            },
        },
        {
            code: "foo;",
            expected: {
                "body[0].parent": false,
            },
        },
        // TypeScript support
        {
            code: "f<import('foo')>(a)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
            },
            parser: tsParser,
        },
        {
            code: "f<import('foo')>((a))",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": true,
            },
            parser: tsParser,
        },
        {
            code: "f<import('foo')>(a,b)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
                "body[0].expression.arguments[1]": false,
            },
            parser: tsParser,
        },
        {
            code: "f<import('foo')>((a),b)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": true,
                "body[0].expression.arguments[1]": false,
            },
            parser: tsParser,
        },
        {
            code: "f<import('foo')>(a,(b))",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
                "body[0].expression.arguments[1]": true,
            },
            parser: tsParser,
        },
        {
            code: "new f<import('foo')>(a)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": false,
            },
            parser: tsParser,
        },
        {
            code: "new f<import('foo')>((a))",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
                "body[0].expression.arguments[0]": true,
            },
            parser: tsParser,
        },
    ]) {
        describe(`on the code \`${code}\``, () => {
            for (const key of Object.keys(expected)) {
                it(`should return ${expected[key]} at "${key}"`, () => {
                    const linter = newCompatLinter()

                    let actual = null
                    const messages = linter.verify(code, {
                        languageOptions: {
                            ecmaVersion: 2020,
                            sourceType: "script",
                            parser,
                        },
                        rules: { "test/test": "error" },
                        plugins: {
                            test: {
                                rules: {
                                    test: {
                                        create(context) {
                                            return {
                                                Program(node) {
                                                    actual = isParenthesized(
                                                        getProperty(node, key),
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
                    assert.strictEqual(actual, expected[key])
                })
            }
        })
    }

    for (const { code, expected } of [
        {
            code: "777",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
            },
        },
        {
            code: "(777)",
            expected: {
                "body[0]": false,
                "body[0].expression": false,
            },
        },
        {
            code: "((777))",
            expected: {
                "body[0]": false,
                "body[0].expression": true,
            },
        },
        {
            code: "if (a) ;",
            expected: {
                "body[0]": false,
                "body[0].test": false,
            },
        },
        {
            code: "if ((a)) ;",
            expected: {
                "body[0]": false,
                "body[0].test": false,
            },
        },
        {
            code: "if (((a))) ;",
            expected: {
                "body[0]": false,
                "body[0].test": true,
            },
        },
    ]) {
        describe(`on the code \`${code}\` and 2 times`, () => {
            for (const key of Object.keys(expected)) {
                it(`should return ${expected[key]} at "${key}"`, () => {
                    const linter = newCompatLinter()

                    let actual = null
                    const messages = linter.verify(code, {
                        languageOptions: { ecmaVersion: 2020 },
                        rules: { "test/test": "error" },
                        plugins: {
                            test: {
                                rules: {
                                    test: {
                                        create(context) {
                                            return {
                                                Program(node) {
                                                    actual = isParenthesized(
                                                        2,
                                                        getProperty(node, key),
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
                    assert.strictEqual(actual, expected[key])
                })
            }
        })
    }
})
