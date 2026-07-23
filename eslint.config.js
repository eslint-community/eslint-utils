"use strict"

const js = require("@eslint/js")
const globals = require("globals")
const { FlatCompat } = require("@eslint/eslintrc")

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
})

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
    ...compat.extends(
        "eslint:recommended",
        "plugin:n/recommended",
        "plugin:@eslint-community/eslint-comments/recommended",
        "plugin:prettier/recommended",
    ),
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
