import eslint from "eslint"
import semver from "semver"

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

export function newCompatLinter() {
    if (semver.gte(eslint.Linter.version, "9.0.0-0")) {
        return new eslint.Linter()
    }

    const linter = new eslint.Linter()
    return {
        verify(code, config) {
            const newConfig = { ...config }
            if (newConfig.languageOptions) {
                const languageOptions = newConfig.languageOptions
                delete newConfig.languageOptions
                newConfig.parserOptions = {
                    ...newConfig.parserOptions,
                    ...languageOptions.parserOptions,
                    ...languageOptions,
                }
                if (languageOptions.globals) {
                    newConfig.globals = {
                        ...newConfig.globals,
                        ...languageOptions.globals,
                    }
                }
            }
            if (newConfig.plugins) {
                const plugins = newConfig.plugins
                delete newConfig.plugins
                for (const [pluginName, plugin] of Object.entries(plugins)) {
                    for (const [ruleName, rule] of Object.entries(
                        plugin.rules || {},
                    )) {
                        linter.defineRule(`${pluginName}/${ruleName}`, rule)
                    }
                }
            }
            newConfig.env = { ...newConfig.env, es6: true }
            return linter.verify(code, newConfig)
        },
    }
}
