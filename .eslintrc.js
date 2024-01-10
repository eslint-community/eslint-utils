"use strict"

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: ["plugin:@eslint-community/mysticatea/es2020"],
    rules: {
        "@eslint-community/mysticatea/prettier": "off",
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
            files: ["src/**/*.mjs", "test/**/*.mjs"],
            extends: ["plugin:@eslint-community/mysticatea/+modules"],
            rules: {
                "init-declarations": "off",

                "@eslint-community/mysticatea/node/no-unsupported-features/es-syntax":
                    ["error", { ignores: ["modules"] }],
            },
        },
    ],
}
