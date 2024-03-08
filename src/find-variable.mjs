import { getInnermostScope } from "./get-innermost-scope.mjs"

/**
 * Find the variable of a given name.
 * @param {import('eslint').Scope.Scope} initialScope The scope to start finding.
 * @param {string | import('./types.mjs').Node} nameOrNode The variable name to find. If this is a Node object then it should be an Identifier node.
 * @returns {import('eslint').Scope.Variable|null} The found variable or null.
 */
export function findVariable(initialScope, nameOrNode) {
    let name = ""
    /** @type {import('eslint').Scope.Scope|null} */
    let scope = initialScope

    if (typeof nameOrNode === "string") {
        name = nameOrNode
    } else {
        name = 'name' in nameOrNode ? nameOrNode.name : ''
        scope = getInnermostScope(scope, nameOrNode)
    }

    while (scope != null) {
        const variable = scope.set.get(name)
        if (variable != null) {
            return variable
        }
        scope = scope.upper
    }

    return null
}
