import { isArrowToken, isOpeningParenToken } from "./token-predicate.mjs"

/**
 * Get the `(` token of the given function node.
 * @param {import('eslint').Rule.Node} node - The function node to get.
 * @param {import('eslint').SourceCode} sourceCode - The source code object to get tokens.
 * @returns {import('eslint').AST.Token | null} `(` token.
 */
function getOpeningParenOfParams(node, sourceCode) {
    return 'id' in node && node.id
        ? sourceCode.getTokenAfter(node.id, isOpeningParenToken)
        : sourceCode.getFirstToken(node, isOpeningParenToken)
}

/**
 * Get the location of the given function node for reporting.
 * @param {import('eslint').Rule.Node} node - The function node to get.
 * @param {import('eslint').SourceCode} sourceCode - The source code object to get tokens.
 * @returns {import('eslint').AST.SourceLocation|null} The location of the function node for reporting.
 */
export function getFunctionHeadLocation(node, sourceCode) {
    const parent = node.parent
    /** @type {import('eslint').AST.SourceLocation["start"]|undefined} */
    let start,
    /** @type {import('eslint').AST.SourceLocation["end"]|undefined} */
     end

    if (node.type === "ArrowFunctionExpression") {
        const arrowToken = sourceCode.getTokenBefore(node.body, isArrowToken)

        start = arrowToken?.loc.start
        end = arrowToken?.loc.end
    } else if (
        parent.type === "Property" ||
        parent.type === "MethodDefinition" ||
        parent.type === "PropertyDefinition"
    ) {
        start = parent.loc?.start
        end = getOpeningParenOfParams(node, sourceCode)?.loc.start
    } else {
        start = node.loc?.start
        end = getOpeningParenOfParams(node, sourceCode)?.loc.start
    }

    return start && end
        ? {
            start: { ...start },
            end: { ...end },
        }
        : null
}
