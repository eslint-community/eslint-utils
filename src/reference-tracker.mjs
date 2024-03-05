import { findVariable } from "./find-variable.mjs"
import { getPropertyName } from "./get-property-name.mjs"
import { getStringIfConstant } from "./get-string-if-constant.mjs"

const IMPORT_TYPE = /^(?:Import|Export(?:All|Default|Named))Declaration$/u

export const READ = Symbol("read")
export const CALL = Symbol("call")
export const CONSTRUCT = Symbol("construct")
export const ESM = Symbol("esm")

const requireCall = { require: { [CALL]: true } }

/** @typedef {import('eslint').Rule.Node | import('estree').Node | import('estree').Expression} Node */
/** @typedef {READ | CALL | CONSTRUCT} ReferenceType */

/** @typedef {Partial<Record<READ | CALL | CONSTRUCT, boolean>>} TraceMapLeaf */
/** @typedef {{ [key: string]: TraceMap } & TraceMapLeaf} TraceMap */

/**
 * @typedef Reference
 * @property {Node} node
 * @property {string[]} path
 * @property {ReferenceType} type
 * @property {any} info
 */

/**
 * Check whether a given variable is modified or not.
 * @param {import('eslint').Scope.Variable} variable The variable to check.
 * @returns {boolean} `true` if the variable is modified.
 */
function isModifiedGlobal(variable) {
    return (
        variable == null ||
        variable.defs.length !== 0 ||
        variable.references.some((r) => r.isWrite())
    )
}

/**
 * Check if the value of a given node is passed through to the parent syntax as-is.
 * For example, `a` and `b` in (`a || b` and `c ? a : b`) are passed through.
 * @param {Node} node A node to check.
 * @returns {boolean} `true` if the node is passed through.
 */
function isPassThrough(node) {
    const parent = 'parent' in node ? node.parent : undefined

    switch (parent?.type) {
        case "ConditionalExpression":
            return parent.consequent === node || parent.alternate === node
        case "LogicalExpression":
            return true
        case "SequenceExpression":
            return parent.expressions[parent.expressions.length - 1] === node
        case "ChainExpression":
            return true

        default:
            return false
    }
}

/**
 * The reference tracker.
 */
export class ReferenceTracker {
    /**
     * Initialize this tracker.
     * @param {import('eslint').Scope.Scope} globalScope The global scope.
     * @param {object} [options] The options.
     * @param {"legacy"|"strict"} [options.mode="strict"] The mode to determine the ImportDeclaration's behavior for CJS modules.
     * @param {string[]} [options.globalObjectNames=["global","globalThis","self","window"]] The variable names for Global Object.
     */
    constructor(
        globalScope,
        {
            mode = "strict",
            globalObjectNames = ["global", "globalThis", "self", "window"],
        } = {},
    ) {
        /** @type {import('eslint').Scope.Variable[]} */
        this.variableStack = []
        /** @type {import('eslint').Scope.Scope} */
        this.globalScope = globalScope
        /** @type {"legacy"|"strict"} */
        this.mode = mode
        /** @type {string[]} */
        this.globalObjectNames = globalObjectNames.slice(0)
    }

    /**
     * Iterate the references of global variables.
     * @param {TraceMap} traceMap The trace map.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    *iterateGlobalReferences(traceMap) {
        for (const [key, nextTraceMap] of Object.entries(traceMap)) {
            const path = [key]
            const variable = this.globalScope.set.get(key)

            if (!variable || isModifiedGlobal(variable)) {
                continue
            }

            yield* this._iterateVariableReferences(
                variable,
                path,
                nextTraceMap,
                true,
            )
        }

        for (const key of this.globalObjectNames) {
            /** @type {string[]} */
            const path = []
            const variable = this.globalScope.set.get(key)

            if (!variable || isModifiedGlobal(variable)) {
                continue
            }

            yield* this._iterateVariableReferences(
                variable,
                path,
                traceMap,
                false,
            )
        }
    }

    /**
     * Iterate the references of CommonJS modules.
     * @param {TraceMap} traceMap The trace map.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    *iterateCjsReferences(traceMap) {
        for (const { node } of this.iterateGlobalReferences(requireCall)) {
            const key = 'arguments' in node && node.arguments[0] ? getStringIfConstant(node.arguments[0]) : null
            if (key == null || !Object.hasOwn(traceMap, key)) {
                continue
            }

            const nextTraceMap = traceMap[key]
            const path = [key]

            if (!nextTraceMap) {
                return
            }

            if (nextTraceMap[READ]) {
                yield {
                    node,
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }
            yield* this._iteratePropertyReferences(node, path, nextTraceMap)
        }
    }

    /**
     * Iterate the references of ES modules.
     * @param {TraceMap} traceMap The trace map.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    // eslint-disable-next-line complexity
    *iterateEsmReferences(traceMap) {
        const programNode = this.globalScope.block

        if (!('body' in programNode) || !(Symbol.iterator in programNode.body)) {
            return
        }

        for (const node of programNode.body) {
            if (!IMPORT_TYPE.test(node.type) || !('source' in node) || node.source == null) {
                continue
            }
            const moduleId = node.source.value

            if (typeof moduleId !== 'string' || !Object.hasOwn(traceMap, moduleId)) {
                continue
            }
            const nextTraceMap = traceMap[moduleId]
            if (!nextTraceMap) {
                continue
            }
            const path = [moduleId]

            if (nextTraceMap[READ]) {
                yield { node, path, type: READ, info: nextTraceMap[READ] }
            }

            if (node.type === "ExportAllDeclaration") {
                for (const key of Object.keys(nextTraceMap)) {
                    const exportTraceMap = nextTraceMap[key]
                    if (exportTraceMap && exportTraceMap[READ]) {
                        yield {
                            node,
                            path: path.concat(key),
                            type: READ,
                            info: exportTraceMap[READ],
                        }
                    }
                }
            } else {
                for (const specifier of node.specifiers) {
                    const esm = Object.hasOwn(nextTraceMap, ESM)
                    const it = this._iterateImportReferences(
                        specifier,
                        path,
                        esm
                            ? nextTraceMap
                            : this.mode === "legacy"
                            ? { default: nextTraceMap, ...nextTraceMap }
                            : { default: nextTraceMap },
                    )

                    if (esm) {
                        yield* it
                    } else {
                        for (const report of it) {
                            report.path = report.path.filter(exceptDefault)
                            if (
                                report.path.length >= 2 ||
                                report.type !== READ
                            ) {
                                yield report
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Iterate the references for a given variable.
     * @param {import('eslint').Scope.Variable} variable The variable to iterate that references.
     * @param {string[]} path The current path.
     * @param {TraceMap} traceMap The trace map.
     * @param {boolean} shouldReport = The flag to report those references.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    *_iterateVariableReferences(variable, path, traceMap, shouldReport) {
        if (this.variableStack.includes(variable)) {
            return
        }
        this.variableStack.push(variable)
        try {
            for (const reference of variable.references) {
                if (!reference.isRead()) {
                    continue
                }
                const node = reference.identifier

                if (shouldReport && traceMap[READ]) {
                    yield { node, path, type: READ, info: traceMap[READ] }
                }
                yield* this._iteratePropertyReferences(node, path, traceMap)
            }
        } finally {
            this.variableStack.pop()
        }
    }

    /**
     * Iterate the references for a given AST node.
     * @param {Node} rootNode The AST node to iterate references.
     * @param {string[]} path The current path.
     * @param {TraceMap} traceMap The trace map.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    //eslint-disable-next-line complexity
    *_iteratePropertyReferences(rootNode, path, traceMap) {
        let node = rootNode

        while (isPassThrough(node) && 'parent' in node) {
            node = node.parent
        }

        const parent = 'parent' in node ? node.parent : undefined
        if (parent?.type === "MemberExpression") {
            if (parent.object === node) {
                const key = getPropertyName(parent)
                if (key == null || !Object.hasOwn(traceMap, key)) {
                    return
                }

                path = path.concat(key) //eslint-disable-line no-param-reassign
                const nextTraceMap = traceMap[key]
                if (!nextTraceMap) {
                    return;
                }
                if (nextTraceMap[READ]) {
                    yield {
                        node: parent,
                        path,
                        type: READ,
                        info: nextTraceMap[READ],
                    }
                }
                yield* this._iteratePropertyReferences(
                    parent,
                    path,
                    nextTraceMap,
                )
            }
            return
        }
        if (parent?.type === "CallExpression") {
            if (parent.callee === node && traceMap[CALL]) {
                yield { node: parent, path, type: CALL, info: traceMap[CALL] }
            }
            return
        }
        if (parent?.type === "NewExpression") {
            if (parent.callee === node && traceMap[CONSTRUCT]) {
                yield {
                    node: parent,
                    path,
                    type: CONSTRUCT,
                    info: traceMap[CONSTRUCT],
                }
            }
            return
        }
        if (parent?.type === "AssignmentExpression") {
            if (parent.right === node) {
                yield* this._iterateLhsReferences(parent.left, path, traceMap)
                yield* this._iteratePropertyReferences(parent, path, traceMap)
            }
            return
        }
        if (parent?.type === "AssignmentPattern") {
            if (parent.right === node) {
                yield* this._iterateLhsReferences(parent.left, path, traceMap)
            }
            return
        }
        if (parent?.type === "VariableDeclarator") {
            if (parent.init === node) {
                yield* this._iterateLhsReferences(parent.id, path, traceMap)
            }
        }
    }

    /**
     * Iterate the references for a given Pattern node.
     * @param {Node} patternNode The Pattern node to iterate references.
     * @param {string[]} path The current path.
     * @param {TraceMap} traceMap The trace map.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    *_iterateLhsReferences(patternNode, path, traceMap) {
        if (patternNode.type === "Identifier") {
            const variable = findVariable(this.globalScope, patternNode)
            if (variable != null) {
                yield* this._iterateVariableReferences(
                    variable,
                    path,
                    traceMap,
                    false,
                )
            }
            return
        }
        if (patternNode.type === "ObjectPattern") {
            for (const property of patternNode.properties) {
                const key = getPropertyName(property)

                if (key == null || !Object.hasOwn(traceMap, key)) {
                    continue
                }

                const nextPath = path.concat(key)
                const nextTraceMap = traceMap[key]
                if (!nextTraceMap) {
                    return;
                }
                if (nextTraceMap[READ]) {
                    yield {
                        node: property,
                        path: nextPath,
                        type: READ,
                        info: nextTraceMap[READ],
                    }
                }
                if ('value' in property) {
                    yield* this._iterateLhsReferences(
                        property.value,
                        nextPath,
                        nextTraceMap,
                    )
                }
            }
            return
        }
        if (patternNode.type === "AssignmentPattern") {
            yield* this._iterateLhsReferences(patternNode.left, path, traceMap)
        }
    }

    /**
     * Iterate the references for a given ModuleSpecifier node.
     * @param {Node} specifierNode The ModuleSpecifier node to iterate references.
     * @param {string[]} path The current path.
     * @param {TraceMap} traceMap The trace map.
     * @returns {IterableIterator<Reference>} The iterator to iterate references.
     */
    *_iterateImportReferences(specifierNode, path, traceMap) {
        const type = specifierNode.type

        if (type === "ImportSpecifier" || type === "ImportDefaultSpecifier") {
            const key =
                type === "ImportDefaultSpecifier"
                    ? "default"
                    : specifierNode.imported.name
            if (!Object.hasOwn(traceMap, key)) {
                return
            }

            path = path.concat(key) //eslint-disable-line no-param-reassign
            const nextTraceMap = traceMap[key]
            if (!nextTraceMap) {
                return
            }
            if (nextTraceMap[READ]) {
                yield {
                    node: specifierNode,
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }
            const variable = findVariable(this.globalScope, specifierNode.local)
            if (variable) {
                yield* this._iterateVariableReferences(
                    variable,
                    path,
                    nextTraceMap,
                    false,
                )
            }

            return
        }

        if (type === "ImportNamespaceSpecifier") {
            const variable = findVariable(this.globalScope, specifierNode.local)
            if (variable) {
                yield* this._iterateVariableReferences(
                    variable,
                    path,
                    traceMap,
                    false,
                )
            }
            return
        }

        if (type === "ExportSpecifier") {
            const key = specifierNode.local.name
            if (!Object.hasOwn(traceMap, key)) {
                return
            }

            path = path.concat(key) //eslint-disable-line no-param-reassign
            const nextTraceMap = traceMap[key]
            if (!nextTraceMap) {
                return
            }
            if (nextTraceMap[READ]) {
                yield {
                    node: specifierNode,
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }
        }
    }
}

ReferenceTracker.READ = READ
ReferenceTracker.CALL = CALL
ReferenceTracker.CONSTRUCT = CONSTRUCT
ReferenceTracker.ESM = ESM

/**
 * This is a predicate function for Array#filter.
 * @param {string} name A name part.
 * @param {number} index The index of the name.
 * @returns {boolean} `false` if it's default.
 */
function exceptDefault(name, index) {
    return !(index === 1 && name === "default")
}
