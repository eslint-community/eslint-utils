import assert from "assert"
import { getInnermostScope } from "../src/index.mjs"
import { getScope, newCompatLinter } from "./test-lib/eslint-compat.mjs"

describe("The 'getInnermostScope' function", () => {
    let i = 0
    for (const { code, languageOptions, selectNode, selectScope } of [
        {
            code: "let a = 0",
            languageOptions: {},
            selectNode: (node) => node,
            selectScope: (scope) => scope,
        },
        {
            code: "let a = 0",
            languageOptions: {
                parserOptions: { ecmaFeatures: { globalReturn: true } },
            },
            selectNode: (node) => node,
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "let a = 0",
            languageOptions: { sourceType: "module" },
            selectNode: (node) => node,
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "a; { b; { c; } d; } e;",
            languageOptions: {},
            selectNode: (node) => node.body[0],
            selectScope: (scope) => scope,
        },
        {
            code: "a; { b; { c; } d; } e;",
            languageOptions: {},
            selectNode: (node) => node.body[2],
            selectScope: (scope) => scope,
        },
        {
            code: "a; { b; { c; } d; } e;",
            languageOptions: {},
            selectNode: (node) => node.body[1].body[0],
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "a; { b; { c; } d; } e;",
            languageOptions: {},
            selectNode: (node) => node.body[1].body[2],
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "a; { b; { c; } d; } e;",
            languageOptions: {},
            selectNode: (node) => node.body[1].body[1].body[0],
            selectScope: (scope) => scope.childScopes[0].childScopes[0],
        },
    ]) {
        it(`should return the innermost scope (${++i})`, () => {
            const linter = newCompatLinter()

            let actualScope = null
            let expectedScope = null
            linter.verify(code, {
                languageOptions: {
                    ecmaVersion: 2020,
                    sourceType: "script",
                    ...languageOptions,
                },
                rules: { "test/test": "error" },
                plugins: {
                    test: {
                        rules: {
                            test: {
                                create(context) {
                                    return {
                                        Program(node) {
                                            const scope = getScope(
                                                context,
                                                node,
                                            )
                                            actualScope = getInnermostScope(
                                                scope,
                                                selectNode(node),
                                            )
                                            expectedScope = selectScope(scope)
                                        },
                                    }
                                },
                            },
                        },
                    },
                },
            })

            assert.notStrictEqual(expectedScope, null)

            // assert.strictEqual makes tooooo large diff.
            assert(actualScope === expectedScope)
        })
    }
})
