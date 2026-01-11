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
    rules: {},
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
