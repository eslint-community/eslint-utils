import { isClosingParenToken, isOpeningParenToken } from "./token-predicate.mjs"
/** @typedef {import("estree").Node} Node */
/** @typedef {import("@typescript-eslint/types").TSESTree.NewExpression} TSNewExpression */
/** @typedef {import("@typescript-eslint/types").TSESTree.CallExpression} TSCallExpression */
/** @typedef {import("eslint").SourceCode} SourceCode */
/** @typedef {import("eslint").AST.Token} Token */
/** @typedef {import("eslint").Rule.Node} RuleNode */

/**
 * Get the left parenthesis of the parent node syntax if it exists.
 * E.g., `if (a) {}` then the `(`.
 * @param {Node} node The AST node to check.
 * @param {SourceCode} sourceCode The source code object to get tokens.
 * @returns {Token|null} The left parenthesis of the parent node syntax
 */
// eslint-disable-next-line complexity
function getParentSyntaxParen(node, sourceCode) {
    const parent = /** @type {RuleNode} */ (node).parent

    switch (parent?.type) {
        case "CallExpression":
        case "NewExpression":
            if (parent.arguments.length === 1 && parent.arguments[0] === node) {
                return sourceCode.getTokenAfter(
                    "typeArguments" in parent && parent.typeArguments
                        ? /** @type {RuleNode} */ (
                              /** @type {unknown} */ (
                                  /** @type {TSNewExpression | TSCallExpression} */ (
                                      parent
                                  ).typeArguments
                              )
                          )
                        : parent.callee,
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
 * @param {number} times The number of parantheses.
 * @param {Node} node The AST node to check.
 * @param {SourceCode} sourceCode The source code object to get tokens.
 * @returns {boolean} `true` if the node is parenthesized the given times.
 */
/**
 * Check whether a given node is parenthesized or not.
 * @param {Node} node The AST node to check.
 * @param {SourceCode} sourceCode The source code object to get tokens.
 * @returns {boolean} `true` if the node is parenthesized.
 */
/**
 * Check whether a given node is parenthesized or not.
 * @param {Node|number} timesOrNode The first parameter.
 * @param {Node|SourceCode} nodeOrSourceCode The second parameter.
 * @param {SourceCode} [optionalSourceCode] The third parameter.
 * @returns {boolean} `true` if the node is parenthesized.
 */
export function isParenthesized(
    timesOrNode,
    nodeOrSourceCode,
    optionalSourceCode,
) {
    /** @type {number} */
    let times,
        /** @type {RuleNode} */
        node,
        /** @type {SourceCode} */
        sourceCode,
        maybeLeftParen,
        maybeRightParen
    if (typeof timesOrNode === "number") {
        times = timesOrNode | 0
        node = /** @type {RuleNode} */ (nodeOrSourceCode)
        sourceCode = /** @type {SourceCode} */ (optionalSourceCode)
        if (!(times >= 1)) {
            throw new TypeError("'times' should be a positive integer.")
        }
    } else {
        times = 1
        node = /** @type {RuleNode} */ (timesOrNode)
        sourceCode = /** @type {SourceCode} */ (nodeOrSourceCode)
    }

    if (
        node == null ||
        // `Program` can't be parenthesized
        node.parent == null ||
        // `CatchClause.param` can't be parenthesized, example `try {} catch (error) {}`
        (node.parent.type === "CatchClause" && node.parent.param === node)
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
