const { defineConfig } = require("vitepress")
const path = require("path")

module.exports = defineConfig({
    title: "eslint-utils",
    base: "/eslint-utils/",
    description: "Utilities for ESLint plugins and custom rules.",
    head: [["link", { rel: "icon", href: "/favicon.png" }]],

    outDir: path.resolve(__dirname, "./dist/eslint-utils"),

    lastUpdated: true,
    themeConfig: {
        editLink: {
            pattern:
                "https://github.com/eslint-community/eslint-utils/edit/main/docs/:path",
        },
        socialLinks: [
            {
                icon: "github",
                link: "https://github.com/eslint-community/eslint-utils",
            },
        ],

        sidebar: [
            {
                text: "Guide",
                items: [{ text: "Getting Started", link: "/" }],
            },
            {
                text: "API Reference",
                items: [
                    { text: "AST utilities", link: "/api/ast-utils" },
                    {
                        text: "Scope analysis utilities",
                        link: "/api/scope-utils",
                    },
                    { text: "Token utilities", link: "/api/token-utils" },
                ],
            },
        ],
    },
})
