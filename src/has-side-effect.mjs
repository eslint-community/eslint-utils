import { getKeys, KEYS } from "eslint-visitor-keys"
/** @typedef {import("estree").Node} Node */
/** @typedef {import("eslint").SourceCode} SourceCode */
/** @typedef {import("./types.mjs").HasSideEffectOptions} HasSideEffectOptions */
/** @typedef {import("estree").BinaryExpression} BinaryExpression */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").MethodDefinition} MethodDefinition */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").PropertyDefinition} PropertyDefinition */
/** @typedef {import("estree").UnaryExpression} UnaryExpression */

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
 * @param {any} x The value to check.
 * @returns {x is Node} `true` if the value is an ASTNode.
 */
function isNode(x) {
    return x !== null && typeof x === "object" && typeof x.type === "string"
}

const visitor = Object.freeze(
    Object.assign(Object.create(null), {
        /**
         * @param {Node} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {any}
         */
        $visit(node, options, visitorKeys) {
            const { type } = node

            if (typeof (/** @type {any} */ (this)[type]) === "function") {
                return /** @type {any} */ (this)[type](
                    node,
                    options,
                    visitorKeys,
                )
            }

            return this.$visitChildren(node, options, visitorKeys)
        },

        /**
         * @param {Node} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        $visitChildren(node, options, visitorKeys) {
            const { type } = node

            for (const key of /** @type {(keyof Node)[]} */ (
                visitorKeys[type] || getKeys(node)
            )) {
                const value = node[key]

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
        /**
         * @param {BinaryExpression} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        BinaryExpression(node, options, visitorKeys) {
            if (
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
        /**
         * @param {MemberExpression} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        MemberExpression(node, options, visitorKeys) {
            if (options.considerGetters) {
                return true
            }
            if (
                options.considerImplicitTypeConversion &&
                node.computed &&
                node.property.type !== "Literal"
            ) {
                return true
            }
            return this.$visitChildren(node, options, visitorKeys)
        },
        /**
         * @param {MethodDefinition} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        MethodDefinition(node, options, visitorKeys) {
            if (
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
        /**
         * @param {Property} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        Property(node, options, visitorKeys) {
            if (
                options.considerImplicitTypeConversion &&
                node.computed &&
                node.key.type !== "Literal"
            ) {
                return true
            }
            return this.$visitChildren(node, options, visitorKeys)
        },
        /**
         * @param {PropertyDefinition} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        PropertyDefinition(node, options, visitorKeys) {
            if (
                options.considerImplicitTypeConversion &&
                node.computed &&
                node.key.type !== "Literal"
            ) {
                return true
            }
            return this.$visitChildren(node, options, visitorKeys)
        },
        /**
         * @param {UnaryExpression} node
         * @param {HasSideEffectOptions} options
         * @param {Record<string, string[]>} visitorKeys
         * @returns {boolean}
         */
        UnaryExpression(node, options, visitorKeys) {
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
            return this.$visitChildren(node, options, visitorKeys)
        },
        UpdateExpression() {
            return true
        },
        YieldExpression() {
            return true
        },
    }),
)

/**
 * Check whether a given node has any side effect or not.
 * @param {Node} node The node to get.
 * @param {SourceCode} sourceCode The source code object.
 * @param {HasSideEffectOptions} [options] The option object.
 * @returns {boolean} `true` if the node has a certain side effect.
 */
export function hasSideEffect(node, sourceCode, options = {}) {
    const { considerGetters = false, considerImplicitTypeConversion = false } =
        options
    return visitor.$visit(
        node,
        { considerGetters, considerImplicitTypeConversion },
        sourceCode.visitorKeys || KEYS,
    )
}
