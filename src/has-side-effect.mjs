import { getKeys, KEYS } from "eslint-visitor-keys"

const typeConversionBinaryOps = Object.freeze(
    new Set([
        "==",
        "!=",
        "<",
        "<=",
        ">",
        ">=",
        "<<",
        ">>",
        ">>>",
        "+",
        "-",
        "*",
        "/",
        "%",
        "|",
        "^",
        "&",
        "in",
    ]),
)
const typeConversionUnaryOps = Object.freeze(new Set(["-", "+", "!", "~"]))

/**
 * Check whether the given value is an ASTNode or not.
 * @param {unknown} x The value to check.
 * @returns {x is { type: string }} `true` if the value is an ASTNode.
 */
function isNode(x) {
    return x !== null && typeof x === "object" && 'type' in x && typeof x.type === "string"
}

/**
 * @see https://github.com/sindresorhus/type-fest/blob/906e7e77204c65f7512f9f54b3205f25c5c0c8e5/source/keys-of-union.d.ts#L38-L40
 * @template T
 * @typedef {T extends unknown ? T[keyof T] : never} ValuesInObjectUnion
 */

/**
 * @typedef VisitOptions
 * @property {boolean} [considerGetters=false] If `true` then it considers member accesses as the node which has side effects.
 * @property {boolean} [considerImplicitTypeConversion=false] If `true` then it considers implicit type conversion as the node which has side effects.
 */

/**
 * @callback VisitorCallback
 * @param {import('./types.mjs').Node | import('estree').Comment | import('estree').MaybeNamedClassDeclaration | import('estree').MaybeNamedFunctionDeclaration} node 
 * @param {VisitOptions} options 
 * @param {import('eslint').SourceCode.VisitorKeys | typeof KEYS} visitorKeys 
 * @returns {boolean}
 */

/** @type {Partial<Record<import('eslint').Rule.NodeTypes | import('estree').Comment["type"], VisitorCallback>> & Record<'$visit' | '$visitChildren', VisitorCallback>} */
const visitor = {
    $visit(node, options, visitorKeys) {
        const match = this[node.type]

        if (typeof match === "function") {
            return match(node, options, visitorKeys)
        }

        return this.$visitChildren(node, options, visitorKeys)
    },

    $visitChildren(node, options, visitorKeys) {
        const { type, ...remainder } = node

        for (const key of visitorKeys[type] || getKeys(node)) {
            const value = /** @type {ValuesInObjectUnion<typeof remainder>} */ (remainder[/** @type {keyof typeof remainder} */ (key)])

            if (Array.isArray(value)) {
                for (const element of value) {
                    if (
                        isNode(element) &&
                        this.$visit(element, options, visitorKeys)
                    ) {
                        return true
                    }
                }
            } else if (
                isNode(value) &&
                this.$visit(value, options, visitorKeys)
            ) {
                return true
            }
        }

        return false
    },
    ArrowFunctionExpression() {
        return false
    },
    AssignmentExpression() {
        return true
    },
    AwaitExpression() {
        return true
    },
    BinaryExpression(node, options, visitorKeys) {
        if (
            node.type === 'BinaryExpression' &&
            options.considerImplicitTypeConversion &&
            typeConversionBinaryOps.has(node.operator) &&
            (node.left.type !== "Literal" || node.right.type !== "Literal")
        ) {
            return true
        }
        return this.$visitChildren(node, options, visitorKeys)
    },
    CallExpression() {
        return true
    },
    FunctionExpression() {
        return false
    },
    ImportExpression() {
        return true
    },
    MemberExpression(node, options, visitorKeys) {
        if (options.considerGetters) {
            return true
        }
        if (
            node.type === 'MemberExpression' &&
            options.considerImplicitTypeConversion &&
            node.computed &&
            node.property.type !== "Literal"
        ) {
            return true
        }
        return this.$visitChildren(node, options, visitorKeys)
    },
    MethodDefinition(node, options, visitorKeys) {
        if (
            node.type === 'MethodDefinition' &&
            options.considerImplicitTypeConversion &&
            node.computed &&
            node.key.type !== "Literal"
        ) {
            return true
        }
        return this.$visitChildren(node, options, visitorKeys)
    },
    NewExpression() {
        return true
    },
    Property(node, options, visitorKeys) {
        if (
            node.type === 'Property' &&
            options.considerImplicitTypeConversion &&
            node.computed &&
            node.key.type !== "Literal"
        ) {
            return true
        }
        return this.$visitChildren(node, options, visitorKeys)
    },
    PropertyDefinition(node, options, visitorKeys) {
        if (
            node.type === 'PropertyDefinition' &&
            options.considerImplicitTypeConversion &&
            node.computed &&
            node.key.type !== "Literal"
        ) {
            return true
        }
        return this.$visitChildren(node, options, visitorKeys)
    },
    UnaryExpression(node, options, visitorKeys) {
        if (node.type === 'UnaryExpression') {
            if (node.operator === "delete") {
                return true
            }
            if (
                options.considerImplicitTypeConversion &&
                typeConversionUnaryOps.has(node.operator) &&
                node.argument.type !== "Literal"
            ) {
                return true
            }
        }
        return this.$visitChildren(node, options, visitorKeys)
    },
    UpdateExpression() {
        return true
    },
    YieldExpression() {
        return true
    },
}

/**
 * Check whether a given node has any side effect or not.
 * @param {import('eslint').Rule.Node} node The node to get.
 * @param {import('eslint').SourceCode} sourceCode The source code object.
 * @param {VisitOptions} [options] The option object.
 * @returns {boolean} `true` if the node has a certain side effect.
 */
export function hasSideEffect(
    node,
    sourceCode,
    { considerGetters = false, considerImplicitTypeConversion = false } = {},
) {
    return visitor.$visit(
        node,
        { considerGetters, considerImplicitTypeConversion },
        sourceCode.visitorKeys || KEYS,
    )
}
