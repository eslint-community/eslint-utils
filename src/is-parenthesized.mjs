import { isClosingParenToken, isOpeningParenToken } from "./token-predicate.mjs"

/**
 * Get the left parenthesis of the parent node syntax if it exists.
 * E.g., `if (a) {}` then the `(`.
 * @param {import('eslint').Rule.Node} node The AST node to check.
 * @param {import('eslint').SourceCode} sourceCode The source code object to get tokens.
 * @returns {import('eslint').AST.Token|null} The left parenthesis of the parent node syntax
 */
function getParentSyntaxParen(node, sourceCode) {
    const parent = node.parent

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
 * @overload
 * @param {number} timesOrNode The number of parantheses.
 * @param {import('eslint').Rule.Node} nodeOrSourceCode The AST node to check.
 * @param {import('eslint').SourceCode} optionalSourceCode The source code object to get tokens.
 * @returns {boolean} `true` if the node is parenthesized the given times.
 */
/**
 * Check whether a given node is parenthesized or not.
 * @overload
 * @param {import('eslint').Rule.Node} timesOrNode The AST node to check.
 * @param {import('eslint').SourceCode} nodeOrSourceCode The source code object to get tokens.
 * @returns {boolean} `true` if the node is parenthesized.
 */
/**
 * Check whether a given node is parenthesized or not.
 * @param {import('eslint').Rule.Node|number} timesOrNode The number of parantheses.
 * @param {import('eslint').SourceCode|import('eslint').Rule.Node} nodeOrSourceCode The AST node to check.
 * @param {import('eslint').SourceCode} [optionalSourceCode] The source code object to get tokens.
 * @returns {boolean} `true` if the node is parenthesized the given times.
 */
export function isParenthesized(
    timesOrNode,
    nodeOrSourceCode,
    optionalSourceCode,
) {
    if (typeof timesOrNode === "number") {
        if (!(timesOrNode >= 1)) {
            throw new TypeError("'times' should be a positive integer.")
        }
        return internalIsParenthesized(
            timesOrNode | 0,
            // @ts-ignore
            nodeOrSourceCode,
            optionalSourceCode,
        )
    }

    // @ts-ignore
    return internalIsParenthesized(1, timesOrNode, nodeOrSourceCode)
}

/**
 * Check whether a given node is parenthesized or not.
 * @param {number} times The number of parantheses.
 * @param {import('eslint').Rule.Node} node The AST node to check.
 * @param {import('eslint').SourceCode} sourceCode The source code object to get tokens.
 * @returns {boolean} `true` if the node is parenthesized the given times.
 */
function internalIsParenthesized(times, node, sourceCode) {
    /** @type {import('eslint').Rule.Node | import('eslint').AST.Token | null} */
    let maybeLeftParen = node
    /** @type {import('eslint').Rule.Node | import('eslint').AST.Token | null} */
    let maybeRightParen = node

    if (
        node == null ||
        // `Program` can't be parenthesized
        !("parent" in node) ||
        node.parent == null ||
        // `CatchClause.param` can't be parenthesized, example `try {} catch (error) {}`
        (node.parent.type === "CatchClause" && node.parent.param === node)
    ) {
        return false
    }

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
        // eslint-disable-next-line no-param-reassign
        --times > 0
    )

    return times === 0
}
