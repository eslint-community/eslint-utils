import assert from "assert"
import { findVariable } from "../src/index.mjs"
import { getScope, newCompatLinter } from "./test-lib/eslint-compat.mjs"

describe("The 'findVariable' function", () => {
    function getVariable(code, selector, withString = null) {
        const linter = newCompatLinter()
        let variable = null

        linter.verify(code, {
            languageOptions: { ecmaVersion: 2020 },
            rules: { "test/test": "error" },
            plugins: {
                test: {
                    rules: {
                        test: {
                            create(context) {
                                return {
                                    [selector](node) {
                                        variable = findVariable(
                                            getScope(context, node),
                                            withString || node,
                                        )
                                    },
                                }
                            },
                        },
                    },
                },
            },
        })

        return variable
    }

    describe("should return the variable of a given Identifier node", () => {
        it("from the same scope.", () => {
            const variable = getVariable(
                "let a; foo(a)",
                "CallExpression Identifier[name='a']",
            )
            assert.strictEqual(variable.name, "a")
        })
        it("from nested blocks.", () => {
            const variable = getVariable(
                "let a; if (b) { foo(a) }",
                "CallExpression Identifier[name='a']",
            )
            assert.strictEqual(variable.name, "a")
        })
        it("from function blocks.", () => {
            const variable = getVariable(
                "let a; function f() { foo(a) }",
                "CallExpression Identifier[name='a']",
            )
            assert.strictEqual(variable.name, "a")
        })
    })

    describe("should return the variable of a given Identifier node", () => {
        it("from the same scope.", () => {
            const variable = getVariable(
                "let a; foo(a)",
                "CallExpression Identifier[name='a']",
                "a",
            )
            assert.strictEqual(variable.name, "a")
        })
        it("from nested blocks.", () => {
            const variable = getVariable(
                "let a; if (b) { foo(a) }",
                "CallExpression Identifier[name='a']",
                "a",
            )
            assert.strictEqual(variable.name, "a")
        })
        it("from function blocks.", () => {
            const variable = getVariable(
                "let a; function f() { foo(a) }",
                "CallExpression Identifier[name='a']",
                "a",
            )
            assert.strictEqual(variable.name, "a")
        })
    })

    it("should return global variables.", () => {
        const variable = getVariable(
            "let a; function f() { foo(a) }",
            "CallExpression Identifier[name='a']",
            "Object",
        )
        assert.strictEqual(variable.name, "Object")
    })

    it("should return null if it didn't exist.", () => {
        const variable = getVariable(
            "let a; function f() { foo(a) }",
            "CallExpression Identifier[name='a']",
            "x",
        )
        assert.strictEqual(variable, null)
    })
})
