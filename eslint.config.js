"use strict"

const js = require("@eslint/js")
const globals = require("globals")
const pluginN = require("eslint-plugin-n")
const pluginComments = require("@eslint-community/eslint-plugin-eslint-comments")
const pluginPrettier = require("eslint-plugin-prettier")
const configPrettier = require("eslint-config-prettier")

module.exports = [
    {
        ignores: [
            ".nyc_output/",
            "coverage/",
            "index.*",
            "test.*",
            "dist/",
            "docs/.vitepress/dist/",
            "docs/.vitepress/cache/",
        ],
    },
    js.configs.recommended,
    {
        plugins: {
            n: pluginN,
            "@eslint-community/eslint-comments": pluginComments,
            prettier: pluginPrettier,
        },
        rules: {
            ...pluginN.configs.recommended.rules,
            ...pluginComments.configs.recommended.rules,
            ...pluginPrettier.configs.recommended.rules,
            ...configPrettier.rules,
        },
    },
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            },
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
    },
    {
        files: ["**/*.mjs", "rollup.config.js"],
        languageOptions: {
            sourceType: "module",
        },
    },
    {
        files: ["src/**/*.mjs", "test/**/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
    },
]
