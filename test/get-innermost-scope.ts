import assert from "assert"
import eslint from "eslint"
import type * as ESTree from "estree"
import { getInnermostScope } from "../src/index"

describe("The 'getInnermostScope' function", () => {
    type TestCase = {
        code: "let a = 0"
        parserOptions: eslint.Linter.ParserOptions
        selectNode: (node: ESTree.Program) => ESTree.Node
        selectScope: (scope: eslint.Scope.Scope) => eslint.Scope.Scope
    }
    let i = 0
    for (const { code, parserOptions, selectNode, selectScope } of [
        {
            code: "let a = 0",
            parserOptions: {},
            selectNode: (node) => node,
            selectScope: (scope) => scope,
        },
        {
            code: "let a = 0",
            parserOptions: { ecmaFeatures: { globalReturn: true } },
            selectNode: (node) => node,
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "let a = 0",
            parserOptions: { sourceType: "module" },
            selectNode: (node) => node,
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "a; { b; { c; } d; } e;",
            parserOptions: {},
            selectNode: (node) => node.body[0],
            selectScope: (scope) => scope,
        },
        {
            code: "a; { b; { c; } d; } e;",
            parserOptions: {},
            selectNode: (node) => node.body[2],
            selectScope: (scope) => scope,
        },
        {
            code: "a; { b; { c; } d; } e;",
            parserOptions: {},
            selectNode: (node) =>
                (node.body[1] as ESTree.BlockStatement).body[0],
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "a; { b; { c; } d; } e;",
            parserOptions: {},
            selectNode: (node) =>
                (node.body[1] as ESTree.BlockStatement).body[2],
            selectScope: (scope) => scope.childScopes[0],
        },
        {
            code: "a; { b; { c; } d; } e;",
            parserOptions: {},
            selectNode: (node) =>
                (
                    (node.body[1] as ESTree.BlockStatement)
                        .body[1] as ESTree.BlockStatement
                ).body[0],
            selectScope: (scope) => scope.childScopes[0].childScopes[0],
        },
    ] as TestCase[]) {
        it(`should return the innermost scope (${++i})`, () => {
            const linter = new eslint.Linter()

            let actualScope = null
            let expectedScope = null
            linter.defineRule("test", {
                create: (context) => ({
                    Program(node) {
                        const scope = context.getScope()
                        actualScope = getInnermostScope(scope, selectNode(node))
                        expectedScope = selectScope(scope)
                    },
                }),
            })
            linter.verify(code, {
                parserOptions: { ecmaVersion: 2020, ...parserOptions },
                rules: { test: "error" },
            })

            assert.notStrictEqual(expectedScope, null)

            // assert.strictEqual makes tooooo large diff.
            assert(actualScope === expectedScope)
        })
    }
})
