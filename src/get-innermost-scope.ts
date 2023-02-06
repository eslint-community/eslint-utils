import type { Scope } from "eslint"
import type * as ESTree from "estree"

/**
 * Get the innermost scope which contains a given location.
 * @param initialScope The initial scope to search.
 * @param node The location to search.
 * @returns The innermost scope.
 */
export function getInnermostScope(
    initialScope: Scope.Scope,
    node: ESTree.Node,
): Scope.Scope {
    const location = node.range![0]

    let scope = initialScope
    let found = false
    do {
        found = false
        for (const childScope of scope.childScopes) {
            const range = childScope.block.range!

            if (range[0] <= location && location < range[1]) {
                scope = childScope
                found = true
                break
            }
        }
    } while (found)

    return scope
}
