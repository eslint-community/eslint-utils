export function getScope(context, node) {
    const sourceCode = context.sourceCode || context.getSourceCode()
    if (sourceCode.getScope) {
        return sourceCode.getScope(node)
    }
    const scopeManager = sourceCode.scopeManager
    const inner = node.type !== "Program"
    for (let n = node; n; n = n.parent) {
        const scope = scopeManager.acquire(n, inner)
        if (scope) {
            if (scope.type === "function-expression-name") {
                return scope.childScopes[0]
            }
            return scope
        }
    }
    return scopeManager.scopes[0]
}
