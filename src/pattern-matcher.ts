/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * See LICENSE file in root directory for full license.
 */

const placeholder = /\$(?:[$&`']|[1-9][0-9]?)/gu

const internal = new WeakMap<
    PatternMatcher,
    { pattern: RegExp; escaped: boolean }
>()

/**
 * Check whether a given character is escaped or not.
 * @param str The string to check.
 * @param index The location of the character to check.
 * @returns `true` if the character is escaped.
 */
function isEscaped(str: string, index: number) {
    let escaped = false
    for (let i = index - 1; i >= 0 && str.charCodeAt(i) === 0x5c; --i) {
        escaped = !escaped
    }
    return escaped
}

/**
 * Replace a given string by a given matcher.
 * @param matcher The pattern matcher.
 * @param str The string to be replaced.
 * @param replacement The new substring to replace each matched part.
 * @returns The replaced string.
 */
function replaceS(matcher: PatternMatcher, str: string, replacement: string) {
    const chunks = []
    let index = 0

    /**
     * @param key The placeholder.
     * @returns The replaced string.
     */
    function replacer(key: string, match: RegExpExecArray) {
        switch (key) {
            case "$$":
                return "$"
            case "$&":
                return match[0]
            case "$`":
                return str.slice(0, match.index)
            case "$'":
                return str.slice(match.index + match[0].length)
            default: {
                const i = key.slice(1)
                if (i in match) {
                    return match[Number(i)]
                }
                return key
            }
        }
    }

    for (const match of matcher.execAll(str)) {
        chunks.push(str.slice(index, match.index))
        chunks.push(replacement.replace(placeholder, (s) => replacer(s, match)))
        index = match.index + match[0].length
    }
    chunks.push(str.slice(index))

    return chunks.join("")
}

/**
 * Replace a given string by a given matcher.
 * @param matcher The pattern matcher.
 * @param str The string to be replaced.
 * @param replace The function to replace each matched part.
 * @returns The replaced string.
 */
function replaceF(
    matcher: PatternMatcher,
    str: string,
    replace: (substring: string, ...args: any[]) => string,
) {
    const chunks = []
    let index = 0

    for (const match of matcher.execAll(str)) {
        chunks.push(str.slice(index, match.index))
        chunks.push(
            String(
                replace(
                    ...(match as unknown as [string, ...string[]]),
                    match.index,
                    match.input,
                ),
            ),
        )
        index = match.index + match[0].length
    }
    chunks.push(str.slice(index))

    return chunks.join("")
}

export type PatternMatherOptions = {
    escaped?: boolean
}
/**
 * The class to find patterns as considering escape sequences.
 */
export class PatternMatcher {
    /**
     * Initialize this matcher.
     * @param pattern The pattern to match.
     * @param options The options.
     */
    public constructor(
        pattern: RegExp,
        { escaped = false }: PatternMatherOptions = {},
    ) {
        if (!(pattern instanceof RegExp)) {
            throw new TypeError("'pattern' should be a RegExp instance.")
        }
        if (!pattern.flags.includes("g")) {
            throw new Error("'pattern' should contains 'g' flag.")
        }

        internal.set(this, {
            pattern: new RegExp(pattern.source, pattern.flags),
            escaped: Boolean(escaped),
        })
    }

    /**
     * Find the pattern in a given string.
     * @param str The string to find.
     * @returns The iterator which iterate the matched information.
     */
    public *execAll(str: string): IterableIterator<RegExpExecArray> {
        const { pattern, escaped } = internal.get(this)!
        let match = null
        let lastIndex = 0

        pattern.lastIndex = 0
        while ((match = pattern.exec(str)) != null) {
            if (escaped || !isEscaped(str, match.index)) {
                lastIndex = pattern.lastIndex
                yield match
                pattern.lastIndex = lastIndex
            }
        }
    }

    /**
     * Check whether the pattern is found in a given string.
     * @param str The string to check.
     * @returns `true` if the pattern was found in the string.
     */
    public test(str: string): boolean {
        const it = this.execAll(str)
        const ret = it.next()
        return !ret.done
    }

    /**
     * Replace a given string.
     * @param str The string to be replaced.
     * @param replacer The string or function to replace. This is the same as the 2nd argument of `String.prototype.replace`.
     * @returns The replaced string.
     */
    public [Symbol.replace](
        str: string,
        replacer: string | ((substring: string, ...args: any[]) => string),
    ): string {
        return typeof replacer === "function"
            ? replaceF(this, String(str), replacer)
            : replaceS(this, String(str), String(replacer))
    }
}
