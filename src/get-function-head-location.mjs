import { isArrowToken, isOpeningParenToken } from "./token-predicate.mjs"
/** @typedef {import("eslint").Rule.Node} RuleNode */
/** @typedef {import("eslint").SourceCode} SourceCode */
/** @typedef {import("eslint").AST.Token} Token */
/** @typedef {import("estree").Function} FunctionNode */
/** @typedef {import("estree").FunctionDeclaration} FunctionDeclaration */
/** @typedef {import("estree").FunctionExpression} FunctionExpression */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("estree").Position} Position */

/**
 * Get the `(` token of the given function node.
 * @param {FunctionExpression | FunctionDeclaration} node - The function node to get.
 * @param {SourceCode} sourceCode - The source code object to get tokens.
 * @returns {Token} `(` token.
 */
function getOpeningParenOfParams(node, sourceCode) {
    return node.id
        ? /** @type {Token} */ (
              sourceCode.getTokenAfter(node.id, isOpeningParenToken)
          )
        : /** @type {Token} */ (
              sourceCode.getFirstToken(node, isOpeningParenToken)
          )
}

/**
 * Get the location of the given function node for reporting.
 * @param {FunctionNode} node - The function node to get.
 * @param {SourceCode} sourceCode - The source code object to get tokens.
 * @returns {SourceLocation|null} The location of the function node for reporting.
 */
export function getFunctionHeadLocation(node, sourceCode) {
    const parent = /** @type {RuleNode} */ (node).parent

    /** @type {Position|null} */
    let start = null
    /** @type {Position|null} */
    let end = null

    if (node.type === "ArrowFunctionExpression") {
        const arrowToken = /** @type {Token} */ (
            sourceCode.getTokenBefore(node.body, isArrowToken)
        )

        start = arrowToken.loc.start
        end = arrowToken.loc.end
    } else if (
        parent.type === "Property" ||
        parent.type === "MethodDefinition" ||
        parent.type === "PropertyDefinition"
    ) {
        start = /** @type {SourceLocation} */ (parent.loc).start
        end = getOpeningParenOfParams(node, sourceCode)?.loc.start
    } else {
        start = /** @type {SourceLocation} */ (node.loc).start
        end = getOpeningParenOfParams(node, sourceCode)?.loc.start
    }

    return {
        start: { ...start },
        end: { ...end },
    }
}
