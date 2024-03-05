/**
 * Get the innermost scope which contains a given location.
 * @param {import('eslint').Scope.Scope} initialScope The initial scope to search.
 * @param {import('estree').Node | import('estree').Expression} node The location to search.
 * @returns {import('eslint').Scope.Scope} The innermost scope.
 */
export function getInnermostScope(initialScope, node) {
    const location = node.range ? node.range[0] : undefined

    let scope = initialScope
    let found = false
    do {
        found = false
        for (const childScope of scope.childScopes) {
            const range = childScope.block.range

            if (range && location && range[0] <= location && location < range[1]) {
                scope = childScope
                found = true
                break
            }
        }
    } while (found)

    return scope
}
