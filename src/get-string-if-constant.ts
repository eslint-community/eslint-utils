import type { Scope } from "eslint"
import type * as ESTree from "estree"
import { getStaticValue } from "./get-static-value"

/**
 * Get the value of a given node if it's a literal or a template literal.
 * @param node The node to get.
 * @param initialScope The scope to start finding variable. Optional. If the node is an Identifier node and this scope was given, this checks the variable of the identifier, and returns the value of it if the variable is a constant.
 * @returns The value of the node, or `null`.
 */
export function getStringIfConstant(
    node: ESTree.Node,
    initialScope: Scope.Scope | null = null,
): string | null {
    // Handle the literals that the platform doesn't support natively.
    if (node && node.type === "Literal" && node.value === null) {
        if ("regex" in node && node.regex) {
            return `/${node.regex.pattern}/${node.regex.flags}`
        }
        if ("bigint" in node && node.bigint) {
            return node.bigint
        }
    }

    const evaluated = getStaticValue(node, initialScope)
    return evaluated && String(evaluated.value)
}
