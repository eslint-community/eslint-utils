"use strict"

module.exports = {
    title: "@eslint-community/eslint-utils",
    description: "Utilities for ESLint plugins and custom rules.",
    serviceWorker: true,

    themeConfig: {
        repo: "eslint-community/eslint-utils",
        docsRepo: "eslint-community/eslint-utils",
        docsDir: "docs",
        docsBranch: "main",
        editLinks: true,

        sidebar: {
            "/": [
                {
                    title: "Guide",
                    collapsable: false,
                    children: ["/"],
                },
                {
                    title: "API Reference",
                    collapsable: false,
                    children: [
                        "/api/ast-utils",
                        "/api/scope-utils",
                        "/api/token-utils",
                    ],
                },
            ],
        },
    },
}
