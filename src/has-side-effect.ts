import type { SourceCode } from "eslint"
import type { VisitorKeys } from "eslint-visitor-keys"
import { getKeys, KEYS } from "eslint-visitor-keys"
import type * as ESTree from "estree"

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
 * @param x The value to check.
 * @returns `true` if the value is an ASTNode.
 */
function isNode(x: any): x is ESTree.Node {
    // eslint-disable-next-line @eslint-community/mysticatea/ts/no-unsafe-member-access
    return x !== null && typeof x === "object" && typeof x.type === "string"
}

function freeze<T>(o: T): T {
    return Object.freeze(o) as T
}

const visitor = freeze(
    Object.assign(Object.create(null) as {}, {
        $visit(
            node: ESTree.Node,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ): boolean {
            const type = node.type as keyof typeof visitor

            if (this[type]) {
                return this[type](node as never, options, visitorKeys)
            }

            return this.$visitChildren(node, options, visitorKeys)
        },

        $visitChildren(
            node: ESTree.Node,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ): boolean {
            const { type } = node

            for (const key of visitorKeys[type] || getKeys(node)) {
                // eslint-disable-next-line @eslint-community/mysticatea/ts/no-unsafe-assignment, @eslint-community/mysticatea/ts/no-unsafe-member-access
                const value = (node as any)[key]

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
        BinaryExpression(
            node: ESTree.BinaryExpression,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ) {
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
        MemberExpression(
            node: ESTree.MemberExpression,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ) {
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
        MethodDefinition(
            node: ESTree.MethodDefinition,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ) {
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
        Property(
            node: ESTree.Property,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ) {
            if (
                options.considerImplicitTypeConversion &&
                node.computed &&
                node.key.type !== "Literal"
            ) {
                return true
            }
            return this.$visitChildren(node, options, visitorKeys)
        },
        PropertyDefinition(
            node: ESTree.PropertyDefinition,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ) {
            if (
                options.considerImplicitTypeConversion &&
                node.computed &&
                node.key.type !== "Literal"
            ) {
                return true
            }
            return this.$visitChildren(node, options, visitorKeys)
        },
        UnaryExpression(
            node: ESTree.UnaryExpression,
            options: Required<HasSideEffectOptions>,
            visitorKeys: VisitorKeys,
        ) {
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
 * Options for `hasSideEffect`, optionally.
 */
export interface HasSideEffectOptions {
    /**
     * If `true` then it considers member accesses as the node which has side effects. Default is `false`.
     */
    considerGetters?: boolean

    /**
     * If `true` then it considers implicit type conversion as the node which has side effects. Default is `false`.
     */
    considerImplicitTypeConversion?: boolean
}

/**
 * Check whether a given node has any side effect or not.
 * @param node The node to get.
 * @param sourceCode The source code object.
 * @param options The option object.
 * @param options.considerGetters If `true` then it considers member accesses as the node which has side effects. Default is `false`.
 * @param options.considerImplicitTypeConversion If `true` then it considers implicit type conversion as the node which has side effects. Default is `false`.
 * @returns `true` if the node has a certain side effect.
 */
export function hasSideEffect(
    node: ESTree.Node,
    sourceCode: SourceCode,
    {
        considerGetters = false,
        considerImplicitTypeConversion = false,
    }: HasSideEffectOptions = {},
): boolean {
    return visitor.$visit(
        node,
        { considerGetters, considerImplicitTypeConversion },
        sourceCode.visitorKeys || KEYS,
    )
}
