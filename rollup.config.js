/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
import fs from "fs"
import path from "path"
import dts from "rollup-plugin-dts"
import sourcemaps from "rollup-plugin-sourcemaps"
import packageInfo from "./package.json"

/**
 * Define the output configuration.
 * @param {string} ext The extension for generated files.
 * @returns {object[]} The output configuration
 */
function config(ext) {
    return [
        {
            input: "src/index.mjs",
            output: {
                exports: ext === ".mjs" ? undefined : "named",
                file: `index${ext}`,
                format: ext === ".mjs" ? "es" : "cjs",
                sourcemap: true,
            },
            plugins: [sourcemaps()],
            external: Object.keys(packageInfo.dependencies),
        },
        {
            input: "./dist/index.d.ts",
            output: {
                exports: "named",
                file: `index.d${ext.replace(/js$/u, "ts")}`,
                format: "es",
            },
            plugins: [dts()],
        },
    ]
}

// Replace extension `.mts` to `.ts` in the `dist/*.d.mts` file name.
// This is needed because rollup-plugin-dts<=v4 doesn't support `.mts` extension.
for (const file of fs.readdirSync(path.resolve("dist"))) {
    if (file.endsWith(".d.mts")) {
        const content = fs.readFileSync(path.resolve("dist", file), "utf8")
        const newContent = content.replace(/\.mjs(['"])/gu, ".js$1")
        const newName = file.replace(/\.d\.mts$/u, ".d.ts")
        fs.writeFileSync(path.resolve("dist", newName), newContent, "utf8")
        fs.unlinkSync(path.resolve("dist", file))
    }
}

export default [...config(".js"), ...config(".mjs")]
