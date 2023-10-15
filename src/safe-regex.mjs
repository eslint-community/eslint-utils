import { RegExpParser } from "@eslint-community/regexpp"

/**
 * Returns whether the given regex will execute in O(n) (with a decently small
 * constant factor) on any string. This is a conservative check. If the check
 * returns `true`, then the regex is guaranteed to be safe.
 * @param {RegExp | string} regex
 * @returns {boolean}
 */
export function isSafeRegex(regex) {
    try {
        const parser = new RegExpParser()
        const ast = parser.parseLiteral(regex.toString())
        const paths = maxPossiblePaths(ast.pattern, "ltr")
        return paths < 100
    } catch {
        // can't parse regex, or there are some elements we don't support
        return false
    }
}

/**
 * @typedef {import("@eslint-community/regexpp").AST} AST
 */

/**
 * Returns the maximum number of possible paths through a given regex node.
 * @param {import("@eslint-community/regexpp/ast").Element
 * | import("@eslint-community/regexpp/ast").Alternative
 * | import("@eslint-community/regexpp/ast").Pattern
 * } n
 * @param {"ltr" | "rtl"} direction The matching direction.
 * @returns {number}
 */
// eslint-disable-next-line complexity
export function maxPossiblePaths(n, direction) {
    switch (n.type) {
        case "Alternative": {
            let elements = n.elements
            if (direction === "rtl") {
                elements = [...elements].reverse()
            }
            let paths = 1
            for (const e of elements) {
                paths *= maxPossiblePaths(e, direction)
                if (paths === 0 || paths === Infinity) {
                    return paths
                }
            }
            return paths
        }

        case "Assertion": {
            if (n.kind === "lookahead" || n.kind === "lookbehind") {
                const d = n.kind === "lookahead" ? "ltr" : "rtl"
                let paths = 0
                for (const e of n.alternatives) {
                    paths += maxPossiblePaths(e, d)
                }
                return paths
            }
            // built-in assertions are always constant
            return 1
        }

        case "Backreference":
            return 1

        case "Character":
        case "CharacterSet":
        case "CharacterClass":
        case "ExpressionCharacterClass":
            return getStringsInCharacters(n) + (hasNoCharacters(n) ? 0 : 1)

        case "Quantifier": {
            if (n.max === 0) {
                return 1
            }
            const inner = maxPossiblePaths(n.element, direction)
            if (inner === 0) {
                return n.min === 0 ? 1 : 0
            }
            if (n.max === Infinity) {
                return Infinity
            }
            if (inner === Infinity) {
                return inner
            }
            const constant = inner ** n.min
            if (n.min === n.max) {
                return constant
            }
            // The {n,m} case (n!=m) is bit harder.
            // Example: (a|b){2,4} is equivalent to (a|b){2}(a|b){0,2}
            // To get the maximum possible paths of any x{0,p}, we first note
            // that this is the same as x{0}|x|xx|xxx|...|x{p}. So the max
            // paths of x{0,p} is the sum of the max paths of x{0}, x{1}, ..., x{p}.
            // Let y=maxPossiblePaths(x). Then maxPossiblePaths(x{0,p}) =
            //  = 1 + y + y^2 + y^3 + ... y^p
            //  = ceil(y*(p+1)/(y-1))-1   (if y>=2)
            //  = p+1                     (if y=1)
            //  = 1                       (if y=0)
            const p = n.max - n.min
            let e
            if (inner < 2) {
                e = p * inner + 1
            } else {
                e = Math.ceil(inner ** (p + 1) / (inner - 1)) - 1
            }
            return constant * e
        }

        case "CapturingGroup":
        case "Group":
        case "Pattern": {
            let paths = 0
            for (const e of n.alternatives) {
                paths += maxPossiblePaths(e, direction)
                if (paths === Infinity) {
                    return paths
                }
            }
            return paths
        }

        default:
            return assertNever(n)
    }
}

/**
 * Returns the worst-case (=maximum) number of string (length!=1) elements in the given character element.
 * @param {import("@eslint-community/regexpp/ast").CharacterClassElement
 * | import("@eslint-community/regexpp/ast").ExpressionCharacterClass["expression"]
 * | import("@eslint-community/regexpp/ast").CharacterSet
 * | import("@eslint-community/regexpp/ast").CharacterClass
 * } n
 * @returns {number}
 *
 * @typedef {import("@eslint-community/regexpp").AST} AST
 */
function getStringsInCharacters(n) {
    switch (n.type) {
        case "Character":
        case "CharacterClassRange":
            return 0

        case "CharacterSet":
            // since we can't know how many strings the set contains, we
            // just assume 1000
            return n.kind === "property" && n.strings ? 1000 : 0

        case "ClassStringDisjunction":
            return n.alternatives.filter((a) => a.elements.length !== 1).length

        case "CharacterClass":
            if (n.negate || !n.unicodeSets) {
                return 0
            }
            return n.elements.reduce((a, b) => a + getStringsInCharacters(b), 0)

        case "ExpressionCharacterClass":
            if (n.negate) {
                return 0
            }
            return getStringsInCharacters(n.expression)

        case "ClassIntersection":
            return Math.min(
                getStringsInCharacters(n.left),
                getStringsInCharacters(n.right),
            )
        case "ClassSubtraction":
            return getStringsInCharacters(n.left)

        default:
            return assertNever(n)
    }
}

/**
 * Returns `true` if the given elements does not contain any single-character
 * elements. If `false` is returned, then the given element might still contain
 * single-character elements.
 * @param {import("@eslint-community/regexpp/ast").CharacterClassElement
 * | import("@eslint-community/regexpp/ast").ExpressionCharacterClass["expression"]
 * | import("@eslint-community/regexpp/ast").CharacterSet
 * | import("@eslint-community/regexpp/ast").CharacterClass
 * } n
 * @returns {boolean}
 *
 * @typedef {import("@eslint-community/regexpp").AST} AST
 */
function hasNoCharacters(n) {
    switch (n.type) {
        case "Character":
        case "CharacterClassRange":
            return false

        case "CharacterSet":
            // while not exactly true, we'll just assume that character sets
            // always contain at least one character
            return false

        case "ClassStringDisjunction":
            return n.alternatives.every((a) => a.elements.length !== 1)

        case "CharacterClass":
            if (n.negate) {
                // since we can't know whether the elements contains all
                // characters, we have have to assume that [^not all] will
                // contains at least some
                return false
            }
            return n.elements.every(hasNoCharacters)

        case "ExpressionCharacterClass":
            if (n.negate) {
                // since we can't know whether the expression contains all
                // characters, we have have to assume that [^not all] will
                // contains at least some
                return false
            }
            return hasNoCharacters(n.expression)

        case "ClassIntersection":
            return hasNoCharacters(n.left) || hasNoCharacters(n.right)
        case "ClassSubtraction":
            return hasNoCharacters(n.left)

        default:
            return assertNever(n)
    }
}

/**
 * A function that should never be called.
 * @param {never} value
 * @returns {never}
 */
function assertNever(value) {
    throw new Error(`Unexpected value: ${value}`)
}
