import type { AST, SourceCode } from "eslint"
import type * as ESTree from "estree"
import { getParent } from "./get-parent"
import { isClosingParenToken, isOpeningParenToken } from "./token-predicate"

/**
 * Get the left parenthesis of the parent node syntax if it exists.
 * E.g., `if (a) {}` then the `(`.
 * @param node The AST node to check.
 * @param sourceCode The source code object to get tokens.
 * @returns The left parenthesis of the parent node syntax
 */
function getParentSyntaxParen(node: ESTree.Node, sourceCode: SourceCode) {
    const parent = getParent(node)!

    switch (parent.type) {
        case "CallExpression":
        case "NewExpression":
            if (parent.arguments.length === 1 && parent.arguments[0] === node) {
                return sourceCode.getTokenAfter(
                    parent.callee,
                    isOpeningParenToken,
                )
            }
            return null

        case "DoWhileStatement":
            if (parent.test === node) {
                return sourceCode.getTokenAfter(
                    parent.body,
                    isOpeningParenToken,
                )
            }
            return null

        case "IfStatement":
        case "WhileStatement":
            if (parent.test === node) {
                return sourceCode.getFirstToken(parent, 1)
            }
            return null

        case "ImportExpression":
            if (parent.source === node) {
                return sourceCode.getFirstToken(parent, 1)
            }
            return null

        case "SwitchStatement":
            if (parent.discriminant === node) {
                return sourceCode.getFirstToken(parent, 1)
            }
            return null

        case "WithStatement":
            if (parent.object === node) {
                return sourceCode.getFirstToken(parent, 1)
            }
            return null

        default:
            return null
    }
}

/**
 * Check whether a given node is parenthesized or not.
 * @param times The number of parantheses.
 * @param node The AST node to check.
 * @param sourceCode The source code object to get tokens.
 * @returns `true` if the node is parenthesized the given times.
 */
export function isParenthesized(
    times: number,
    node: ESTree.Node,
    sourceCode: SourceCode,
): boolean
/**
 * Check whether a given node is parenthesized or not.
 * @param node The AST node to check.
 * @param sourceCode The source code object to get tokens.
 * @returns `true` if the node is parenthesized.
 */
export function isParenthesized(
    node: ESTree.Node,
    sourceCode: SourceCode,
): boolean
export function isParenthesized(
    timesOrNode: ESTree.Node | number,
    nodeOrSourceCode: ESTree.Node | SourceCode,
    optionalSourceCode?: SourceCode,
): boolean {
    let times: number | undefined = undefined,
        node: ESTree.Node | undefined = undefined,
        sourceCode: SourceCode | undefined = undefined,
        maybeLeftParen: AST.Token | ESTree.Comment | ESTree.Node | null = null,
        maybeRightParen: AST.Token | ESTree.Comment | ESTree.Node | null = null
    if (typeof timesOrNode === "number") {
        times = timesOrNode | 0
        node = nodeOrSourceCode as ESTree.Node
        sourceCode = optionalSourceCode!
        if (!(times >= 1)) {
            throw new TypeError("'times' should be a positive integer.")
        }
    } else {
        times = 1
        node = timesOrNode
        sourceCode = nodeOrSourceCode as SourceCode
    }

    if (node == null) {
        return false
    }
    const parent = getParent(node)
    if (
        // `Program` can't be parenthesized
        parent == null ||
        // `CatchClause.param` can't be parenthesized, example `try {} catch (error) {}`
        (parent.type === "CatchClause" && parent.param === node)
    ) {
        return false
    }

    maybeLeftParen = maybeRightParen = node
    do {
        maybeLeftParen = sourceCode.getTokenBefore(maybeLeftParen)
        maybeRightParen = sourceCode.getTokenAfter(maybeRightParen)
    } while (
        maybeLeftParen != null &&
        maybeRightParen != null &&
        isOpeningParenToken(maybeLeftParen) &&
        isClosingParenToken(maybeRightParen) &&
        // Avoid false positive such as `if (a) {}`
        maybeLeftParen !== getParentSyntaxParen(node, sourceCode) &&
        --times > 0
    )

    return times === 0
}
