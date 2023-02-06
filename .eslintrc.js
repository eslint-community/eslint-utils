"use strict"

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: ["plugin:@eslint-community/mysticatea/es2020"],
    parserOptions: {
        project: "./tsconfig.json",
    },
    rules: {
        "@eslint-community/mysticatea/prettier": "off",
        "@eslint-community/mysticatea/ts/naming-convention": "off",
        "@eslint-community/mysticatea/ts/prefer-readonly-parameter-types":
            "off",
        "@eslint-community/mysticatea/node/no-missing-import": [
            "error",
            {
                allowModules: ["estree", "unbuild"],
            },
        ],
    },
    settings: {
        node: {
            tryExtensions: [".js", ".json", ".mjs", ".node", ".ts", ".tsx"],
        },
    },
    overrides: [
        {
            files: ["src/**/*.ts", "test/**/*.ts"],
            extends: ["plugin:@eslint-community/mysticatea/+modules"],
            rules: {
                "init-declarations": "off",
                "no-duplicate-imports": "off",
                "no-shadow": "off",
            },
        },
    ],
}
