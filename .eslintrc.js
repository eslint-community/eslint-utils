"use strict"

const globals = require("globals")

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: [
        "eslint:recommended",
        "plugin:n/recommended",
        "plugin:@eslint-community/eslint-comments/recommended",
        "plugin:prettier/recommended",
    ],
    env: {
        node: true,
    },
    globals: {},
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: "script",
    },
    rules: {
        "no-restricted-properties": [
            "error",
            {
                object: "context",
                property: "getScope",
                message:
                    "If you are using it in a test case, use test/test-lib/eslint-compat.mjs#getScope instead. Other than that, the API should also be compatible with ESLint v9.",
            },
        ],
    },
    overrides: [
        {
            files: ["**/*.mjs", "rollup.config.js"],
            parserOptions: {
                sourceType: "module",
            },
        },
        {
            files: ["src/**/*.mjs", "test/**/*.mjs"],
            globals: {
                ...globals.mocha,
            },
        },
    ],
}
