/** @typedef {import("eslint").Scope.Scope} Scope */
/** @typedef {import("estree").Node} Node */

/**
 * Get the innermost scope which contains a given location.
 * @param {Scope} initialScope The initial scope to search.
 * @param {Node} node The location to search.
 * @returns {Scope} The innermost scope.
 */
export function getInnermostScope(initialScope, node) {
    const location = /** @type {[number, number]} */ (node.range)[0]

    let scope = initialScope
    let found = false
    do {
        found = false
        for (const childScope of scope.childScopes) {
            const range = /** @type {[number, number]} */ (
                childScope.block.range
            )

            if (range[0] <= location && location < range[1]) {
                scope = childScope
                found = true
                break
            }
        }
    } while (found)

    return scope
}
