import eslint from "@eslint/js"
import markdown from "@eslint/markdown"
import jsdoc from "eslint-plugin-jsdoc"
import n from "eslint-plugin-n"
import packageJson from "eslint-plugin-package-json"
import * as regexp from "eslint-plugin-regexp"
import { defineConfig } from "eslint/config"

export default defineConfig(
    // Global ignores
    {
        ignores: [
            ".nyc_output",
            "coverage",
            "dist",
            "node_modules",
            "docs/.vitepress/dist",
            "docs/.vitepress/cache",
        ],
    },
    // Global settings
    { linterOptions: { reportUnusedDisableDirectives: "error" } },
    {
        extends: [
            eslint.configs.recommended,
            jsdoc.configs["flat/recommended"],
            n.configs["flat/recommended"],
            regexp.configs["flat/recommended"],
        ],
        files: ["**/*.js", "**/*.mjs"],
        rules: {
            // Stylistic concerns that don't interfere with Prettier
            "logical-assignment-operators": [
                "error",
                "always",
                { enforceForIfStatements: true },
            ],
            "no-useless-rename": "error",
            "object-shorthand": "error",
            "operator-assignment": "error",
        },
    },
    {
        extends: [packageJson.configs["recommended-publishable"]],
        files: ["package.json"],
    },
    {
        extends: [markdown.configs.recommended],
        files: ["**/*.md"],
        rules: {
            // https://github.com/eslint/markdown/issues/294
            "markdown/no-missing-label-refs": "off",
        },
    },
)
