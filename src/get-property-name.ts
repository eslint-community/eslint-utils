import type { Scope } from "eslint"
import type * as ESTree from "estree"
import { getStringIfConstant } from "./get-string-if-constant"

/**
 * Get the property name from a MemberExpression node or a Property node.
 * @param node The node to get.
 * @param initialScope The scope to start finding variable. Optional. If the node is a computed property node and this scope was given, this checks the computed property name by the `getStringIfConstant` function with the scope, and returns the value of it.
 * @returns The property name of the node.
 */
export function getPropertyName(
    node:
        | ESTree.MemberExpression
        | ESTree.MethodDefinition
        | ESTree.Property
        | ESTree.PropertyDefinition,
    initialScope?: Scope.Scope,
): string | null {
    switch (node.type) {
        case "MemberExpression":
            if (node.computed) {
                return getStringIfConstant(node.property, initialScope)
            }
            if (node.property.type === "PrivateIdentifier") {
                return null
            }
            return (node.property as ESTree.Identifier).name

        case "Property":
        case "MethodDefinition":
        case "PropertyDefinition":
            if (node.computed) {
                return getStringIfConstant(node.key, initialScope)
            }
            if (node.key.type === "Literal") {
                return String(node.key.value)
            }
            if (node.key.type === "PrivateIdentifier") {
                return null
            }
            return (node.key as ESTree.Identifier).name
        default:
            return null
    }
}
