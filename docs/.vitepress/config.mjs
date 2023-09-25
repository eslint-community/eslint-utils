import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitepress"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
    title: "eslint-utils",
    base: "/eslint-utils/",
    description: "Utilities for ESLint plugins and custom rules.",
    head: [["link", { rel: "icon", href: "/favicon.png" }]],

    outDir: path.resolve(__dirname, "./dist/eslint-utils"),

    lastUpdated: true,
    themeConfig: {
        search: {
            provider: "local",
            options: {
                detailedView: true,
            },
        },
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
