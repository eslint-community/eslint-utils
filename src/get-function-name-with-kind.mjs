import { getPropertyName } from "./get-property-name.mjs"
/** @typedef {import("./types.mjs").FunctionKind} FunctionKind */
/** @typedef {import("./types.mjs").FunctionModifier} FunctionModifier */
/** @typedef {import("./types.mjs").FunctionNameWithKindParts} FunctionNameWithKindParts */
/** @typedef {import("eslint").Rule.Node} RuleNode */
/** @typedef {import("eslint").SourceCode} SourceCode */
/** @typedef {import("estree").Function} FunctionNode */
/** @typedef {import("estree").FunctionDeclaration} FunctionDeclaration */
/** @typedef {import("estree").FunctionExpression} FunctionExpression */
/** @typedef {import("estree").Identifier} Identifier */

/**
 * Get the modifiers, kinds, and name of the given function node separately.
 * @param {FunctionNode} node - The function node to get.
 * @param {SourceCode} [sourceCode] The source code object to get the code of computed property keys.
 * @returns {FunctionNameWithKindParts} The modifiers, kinds, and name of the function node.
 */
// eslint-disable-next-line complexity
export function getFunctionNameWithKindParts(node, sourceCode) {
    const parent = /** @type {RuleNode} */ (node).parent

    /** @type {FunctionModifier[]} */
    const modifiers = []
    /** @type {FunctionKind[]} */
    const kinds = []
    /** @type {string | null} */
    let name = null

    if (!parent) {
        return { modifiers, kinds, name }
    }

    const isObjectMethod = parent.type === "Property" && parent.value === node
    const isClassMethod =
        parent.type === "MethodDefinition" && parent.value === node
    const isClassFieldMethod =
        parent.type === "PropertyDefinition" && parent.value === node

    if ((isObjectMethod || isClassMethod) && parent.kind === "constructor") {
        return { modifiers, kinds: ["constructor"], name }
    }

    // Modifiers.
    if (isClassMethod || isClassFieldMethod) {
        if (parent.static) {
            modifiers.push("static")
        }
        if (parent.key.type === "PrivateIdentifier") {
            modifiers.push("private")
        }
    }
    if (node.async) {
        modifiers.push("async")
    }
    if (node.generator) {
        modifiers.push("generator")
    }

    // Kinds.
    if (isObjectMethod || isClassMethod) {
        if (parent.kind === "get") {
            kinds.push("getter")
        } else if (parent.kind === "set") {
            kinds.push("setter")
        } else {
            kinds.push("method")
        }
    } else if (isClassFieldMethod) {
        kinds.push("method")
    } else {
        if (node.type === "ArrowFunctionExpression") {
            kinds.push("arrow")
        }
        kinds.push("function")
    }

    // Names.
    if (isObjectMethod || isClassMethod || isClassFieldMethod) {
        if (parent.key.type === "PrivateIdentifier") {
            name = `#${parent.key.name}`
        } else {
            const propertyName = getPropertyName(parent)
            if (propertyName != null) {
                name = `'${propertyName}'`
            } else if (sourceCode) {
                const keyText = sourceCode.getText(parent.key)
                if (!keyText.includes("\n")) {
                    name = `[${keyText}]`
                }
            }
        }
    } else if (hasId(node)) {
        name = `'${node.id.name}'`
    } else if (
        parent.type === "VariableDeclarator" &&
        parent.id &&
        parent.id.type === "Identifier"
    ) {
        name = `'${parent.id.name}'`
    } else if (
        (parent.type === "AssignmentExpression" ||
            parent.type === "AssignmentPattern") &&
        parent.left &&
        parent.left.type === "Identifier"
    ) {
        name = `'${parent.left.name}'`
    } else if (
        parent.type === "ExportDefaultDeclaration" &&
        parent.declaration === node
    ) {
        name = "'default'"
    }

    return { modifiers, kinds, name }
}

/**
 * Get the name and kind of the given function node.
 * @param {FunctionNode} node - The function node to get.
 * @param {SourceCode} [sourceCode] The source code object to get the code of computed property keys.
 * @returns {string} The name and kind of the function node.
 */
export function getFunctionNameWithKind(node, sourceCode) {
    const { modifiers, kinds, name } = getFunctionNameWithKindParts(
        node,
        sourceCode,
    )

    return [...modifiers, ...kinds, ...(name ? [name] : [])].join(" ")
}

/**
 * @param {FunctionNode} node
 * @returns {node is FunctionDeclaration | FunctionExpression & { id: Identifier }}
 */
function hasId(node) {
    return Boolean(
        /** @type {Partial<FunctionDeclaration | FunctionExpression>} */ (node)
            .id,
    )
}
