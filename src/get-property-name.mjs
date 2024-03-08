import { getStringIfConstant } from "./get-string-if-constant.mjs"

/**
 * Get the property name from a MemberExpression node or a Property node.
 * @param {import('./types.mjs').Node} node The node to get.
 * @param {import('eslint').Scope.Scope} [initialScope] The scope to start finding variable. Optional. If the node is a computed property node and this scope was given, this checks the computed property name by the `getStringIfConstant` function with the scope, and returns the value of it.
 * @returns {string|null} The property name of the node.
 */
export function getPropertyName(node, initialScope) {
    switch (node.type) {
        case "MemberExpression":
            if (node.computed) {
                return getStringIfConstant(node.property, initialScope)
            }
            if (node.property.type === "PrivateIdentifier") {
                return null
            }
            return 'name' in node.property ? node.property.name : null

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
            return 'name' in node.key ? node.key.name : null

        // no default
    }

    return null
}
