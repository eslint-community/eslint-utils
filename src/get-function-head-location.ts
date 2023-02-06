import type { SourceCode } from "eslint"
import type * as ESTree from "estree"
import { getParent } from "./get-parent"
import { isArrowToken, isOpeningParenToken } from "./token-predicate"

/**
 * Get the `(` token of the given function node.
 * @param node - The function node to get.
 * @param sourceCode - The source code object to get tokens.
 * @returns `(` token.
 */
function getOpeningParenOfParams(
    node: ESTree.Function,
    sourceCode: SourceCode,
) {
    return node.type !== "ArrowFunctionExpression" && node.id
        ? sourceCode.getTokenAfter(node.id, isOpeningParenToken)!
        : sourceCode.getFirstToken(node, isOpeningParenToken)!
}

/**
 * Get the location of the given function node for reporting.
 * @param node - The function node to get.
 * @param sourceCode - The source code object to get tokens.
 * @returns The location of the function node for reporting.
 */
export function getFunctionHeadLocation(
    node: ESTree.Function,
    sourceCode: SourceCode,
): ESTree.SourceLocation {
    const parent = getParent(node)!
    let start: ESTree.Position | null = null
    let end: ESTree.Position | null = null

    if (node.type === "ArrowFunctionExpression") {
        const arrowToken = sourceCode.getTokenBefore(node.body, isArrowToken)!

        start = arrowToken.loc.start
        end = arrowToken.loc.end
    } else if (
        parent.type === "Property" ||
        parent.type === "MethodDefinition" ||
        parent.type === "PropertyDefinition"
    ) {
        start = parent.loc!.start
        end = getOpeningParenOfParams(node, sourceCode).loc.start
    } else {
        start = node.loc!.start
        end = getOpeningParenOfParams(node, sourceCode).loc.start
    }

    return {
        start: { ...start },
        end: { ...end },
    }
}
