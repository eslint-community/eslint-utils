/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */

import { readFileSync } from 'node:fs'
import { URL } from 'node:url'

import { dts } from "rollup-plugin-dts"

/** @type {{ dependencies: Record<string, string> }} */
const packageInfo = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default [
    {
        input: "src/index.mjs",
        output: {
            exports: "named",
            file: `index.js`,
            format: "cjs",
            sourcemap: true,
        },
        external: Object.keys(packageInfo.dependencies),
    },
    {
        input: 'dist/index.d.mts',
        output: [{
            exports: "named",
            file: `index.d.ts`,
            format: "cjs",
        }],
        // type-coverage:ignore-next-line
        plugins: [dts()],
    },
]
