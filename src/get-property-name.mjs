import { getStringIfConstant } from "./get-string-if-constant.mjs"
/** @typedef {import("eslint").Scope.Scope} Scope */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").MethodDefinition} MethodDefinition */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").PropertyDefinition} PropertyDefinition */
/** @typedef {import("estree").Identifier} Identifier */

/**
 * Get the property name from a MemberExpression node or a Property node.
 * @param {MemberExpression | MethodDefinition | Property | PropertyDefinition} node The node to get.
 * @param {Scope} [initialScope] The scope to start finding variable. Optional. If the node is a computed property node and this scope was given, this checks the computed property name by the `getStringIfConstant` function with the scope, and returns the value of it.
 * @returns {string|null|undefined} The property name of the node.
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
            return /** @type {Partial<Identifier>} */ (node.property).name

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
            return /** @type {Partial<Identifier>} */ (node.key).name

        default:
            break
    }

    return null
}
