import type { Scope } from "eslint"
import type * as ESTree from "estree"
import { getInnermostScope } from "./get-innermost-scope"

/**
 * Find the variable of a given name.
 * @param initialScope The scope to start finding.
 * @param nameOrNode The variable name to find. If this is a Node object then it should be an Identifier node.
 * @returns The found variable or null.
 */
export function findVariable(
    initialScope: Scope.Scope,
    nameOrNode: ESTree.Identifier | string,
): Scope.Variable | null {
    let name = ""
    let scope: Scope.Scope | null = initialScope

    if (typeof nameOrNode === "string") {
        name = nameOrNode
    } else {
        name = nameOrNode.name
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
