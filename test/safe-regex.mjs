import { RegExpParser } from "@eslint-community/regexpp"
import assert from "assert"
import { isSafeRegex, maxPossiblePaths } from "../src/safe-regex.mjs"

describe("isSafeRegex", () => {
    const maxPaths = {
        [String.raw`/[]/`]: 0,
        [String.raw`/[]+/`]: 0,
        [String.raw`/[]a+/`]: 0,
        [String.raw`/(?<=cb+[])a/`]: 0,
        [String.raw`/[\w&&\q{foo|bar}]/v`]: 0,

        [String.raw`/a/`]: 1,
        [String.raw`/[a]/`]: 1,
        [String.raw`/foobar/`]: 1,
        [String.raw`/\bfoobar\b/`]: 1,
        [String.raw`/^foobar$/`]: 1,
        [String.raw`/^foobar$/u`]: 1,
        [String.raw`/^foobar$/v`]: 1,
        [String.raw`/\p{ASCII}/v`]: 1,
        [String.raw`/[abcA-Z\d\w\p{ASCII}]/`]: 1,
        [String.raw`/[abcA-Z\d\w\p{ASCII}]/u`]: 1,
        [String.raw`/[abcA-Z\d\w\p{ASCII}]/v`]: 1,
        [String.raw`/[abcA-Z\d\w\p{ASCII}\q{f|g|h}]/v`]: 1,
        [String.raw`/[^abcA-Z\d\w\p{ASCII}\q{f|g|h}]/v`]: 1,
        [String.raw`/a{100}/v`]: 1,
        [String.raw`/[]*/v`]: 1,
        [String.raw`/[]?/v`]: 1,
        [String.raw`/[]{0,100}/v`]: 1,
        [String.raw`/(?:a*a*a*a*){0}/`]: 1,
        [String.raw`/(a)b\1/v`]: 1,
        [String.raw`/a(?!foo)/`]: 1,
        [String.raw`/[^[a-b]&&\w]/v`]: 1,
        [String.raw`/[\w&&\d]/v`]: 1,
        [String.raw`/[^\p{ASCII}--\w]/v`]: 1,
        [String.raw`/[\w&&[\d\q{foo|bar}]]/v`]: 1,

        [String.raw`/a|b/`]: 2,
        [String.raw`/a|a/`]: 2,
        [String.raw`/a?/`]: 2,
        [String.raw`/a??/`]: 2,
        [String.raw`/[\q{foo|bar}]/v`]: 2,
        [String.raw`/[\q{foo|}]/v`]: 2,
        [String.raw`/[\q{foo}\w]/v`]: 2,
        [String.raw`/[\q{}\w]/v`]: 2,
        [String.raw`/(a|b)c\1/v`]: 2,
        [String.raw`/[[\p{ASCII}\q{foo}]--\w]/v`]: 2,

        [String.raw`/a{2,4}/v`]: 3,
        [String.raw`/(a|b){2,4}/v`]: 28,
        [String.raw`/(a|b|c){2,4}/v`]: 117,
        [String.raw`/(a|b|c)(a|b|c)((a|b|c)((a|b|c)|)|)/v`]: 117,

        [String.raw`/(a|b){10}/v`]: 2 ** 10,
        [String.raw`/(a|b|c|d|e){10}/v`]: 5 ** 10,

        [String.raw`/^\p{RGI_Emoji}$/v`]: 1001,

        [String.raw`/(a+)b\1/`]: Infinity,
        [String.raw`/(?:a|a)+b/`]: Infinity,
        [String.raw`/b+$/`]: Infinity,
        [String.raw`/b+[]/`]: Infinity,
        [String.raw`/b+$|foo/`]: Infinity,
        [String.raw`/foo|b+$/`]: Infinity,
        [String.raw`/(?:a+){3}/`]: Infinity,
        [String.raw`/(a|b|c|d|e){1000}/v`]: Infinity,
    }

    it("should be false for invalid regexes", () => {
        const actual = isSafeRegex("/foo[a-/u")
        assert.deepStrictEqual(actual, false)
    })

    // it("should be true for safe regexes", () => {
    //     for (const [regex, paths] of Object.entries(maxPaths)) {
    //         if (paths < 100) {
    //             const actual = isSafeRegex(regex)
    //             assert.deepStrictEqual(actual, true)
    //         }
    //     }
    // })

    describe("maxPaths", () => {
        for (const [regex, paths] of Object.entries(maxPaths)) {
            it(regex, () => {
                const parser = new RegExpParser()
                const ast = parser.parseLiteral(regex.toString())
                const actual = maxPossiblePaths(ast.pattern, "ltr")
                assert.deepStrictEqual(actual, paths)
            })
        }
    })
})
