"use strict"

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: ["plugin:@eslint-community/mysticatea/es2020"],
    rules: {
        "@eslint-community/mysticatea/prettier": "off",
    },
    overrides: [
        {
            files: ["src/**/*.js", "test/**/*.js"],
            extends: ["plugin:@eslint-community/mysticatea/+modules"],
            rules: {
                "init-declarations": "off",

                "@eslint-community/mysticatea/node/no-unsupported-features/es-syntax":
                    ["error", { ignores: ["modules"] }],
            },
        },
    ],
}
