import { findVariable } from "./find-variable.mjs"
import { getPropertyName } from "./get-property-name.mjs"
import { getStringIfConstant } from "./get-string-if-constant.mjs"
/** @typedef {import("eslint").Scope.Scope} Scope */
/** @typedef {import("eslint").Scope.Variable} Variable */
/** @typedef {import("eslint").Rule.Node} RuleNode */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").Pattern} Pattern */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").SimpleCallExpression} CallExpression */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").ImportDeclaration} ImportDeclaration */
/** @typedef {import("estree").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").ExportDefaultDeclaration} ExportDefaultDeclaration */
/** @typedef {import("estree").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("estree").ImportSpecifier} ImportSpecifier */
/** @typedef {import("estree").ImportDefaultSpecifier} ImportDefaultSpecifier */
/** @typedef {import("estree").ImportNamespaceSpecifier} ImportNamespaceSpecifier */
/** @typedef {import("estree").ExportSpecifier} ExportSpecifier */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").AssignmentProperty} AssignmentProperty */
/** @typedef {import("estree").Literal} Literal */
/** @typedef {import("./types.mjs").ReferenceTrackerOptions} ReferenceTrackerOptions */
/**
 * @template T
 * @typedef {import("./types.mjs").TraceMap<T>} TraceMap
 */
/**
 * @template T
 * @typedef {import("./types.mjs").TraceMapObject<T>} TraceMapObject
 */
/**
 * @template T
 * @typedef {import("./types.mjs").TrackedReferences<T>} TrackedReferences
 */

const IMPORT_TYPE = /^(?:Import|Export(?:All|Default|Named))Declaration$/u

/**
 * Check whether a given node is an import node or not.
 * @param {Node} node
 * @returns {node is ImportDeclaration|ExportAllDeclaration|ExportNamedDeclaration&{source: Literal}} `true` if the node is an import node.
 */
function isHasSource(node) {
    return (
        IMPORT_TYPE.test(node.type) &&
        /** @type {ImportDeclaration|ExportAllDeclaration|ExportNamedDeclaration} */ (
            node
        ).source != null
    )
}
const has =
    /** @type {<T>(traceMap: TraceMap<unknown>, v: T) => v is (string extends T ? string : T)} */ (
        Function.call.bind(Object.hasOwnProperty)
    )

export const READ = Symbol("read")
export const CALL = Symbol("call")
export const CONSTRUCT = Symbol("construct")
export const ESM = Symbol("esm")

const requireCall = { require: { [CALL]: true } }

/**
 * Check whether a given variable is modified or not.
 * @param {Variable|undefined} variable The variable to check.
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
 * @returns {node is RuleNode & {parent: Expression}} `true` if the node is passed through.
 */
function isPassThrough(node) {
    const parent = /** @type {RuleNode} */ (node).parent

    if (parent) {
        switch (parent.type) {
            case "ConditionalExpression":
                return parent.consequent === node || parent.alternate === node
            case "LogicalExpression":
                return true
            case "SequenceExpression":
                return (
                    parent.expressions[parent.expressions.length - 1] === node
                )
            case "ChainExpression":
                return true

            default:
                return false
        }
    }
    return false
}

/**
 * The reference tracker.
 */
export class ReferenceTracker {
    /**
     * Initialize this tracker.
     * @param {Scope} globalScope The global scope.
     * @param {object} [options] The options.
     * @param {"legacy"|"strict"} [options.mode="strict"] The mode to determine the ImportDeclaration's behavior for CJS modules.
     * @param {string[]} [options.globalObjectNames=["global","globalThis","self","window"]] The variable names for Global Object.
     */
    constructor(globalScope, options = {}) {
        const {
            mode = "strict",
            globalObjectNames = ["global", "globalThis", "self", "window"],
        } = options
        /** @type {Variable[]} */
        this.variableStack = []
        this.globalScope = globalScope
        this.mode = mode
        this.globalObjectNames = globalObjectNames.slice(0)
    }

    /**
     * Iterate the references of global variables.
     * @template T
     * @param {TraceMap<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
     */
    *iterateGlobalReferences(traceMap) {
        for (const key of Object.keys(traceMap)) {
            const nextTraceMap = traceMap[key]
            const path = [key]
            const variable = this.globalScope.set.get(key)

            if (isModifiedGlobal(variable)) {
                continue
            }

            yield* this._iterateVariableReferences(
                /** @type {Variable} */ (variable),
                path,
                nextTraceMap,
                true,
            )
        }

        for (const key of this.globalObjectNames) {
            /** @type {string[]} */
            const path = []
            const variable = this.globalScope.set.get(key)

            if (isModifiedGlobal(variable)) {
                continue
            }

            yield* this._iterateVariableReferences(
                /** @type {Variable} */ (variable),
                path,
                traceMap,
                false,
            )
        }
    }

    /**
     * Iterate the references of CommonJS modules.
     * @template T
     * @param {TraceMap<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
     */
    *iterateCjsReferences(traceMap) {
        for (const { node } of this.iterateGlobalReferences(requireCall)) {
            const key = getStringIfConstant(
                /** @type {CallExpression} */ (node).arguments[0],
            )
            if (key == null || !has(traceMap, key)) {
                continue
            }

            const nextTraceMap = traceMap[key]
            const path = [key]

            if (nextTraceMap[READ]) {
                yield {
                    node,
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }
            yield* this._iteratePropertyReferences(
                /** @type {CallExpression} */ (node),
                path,
                nextTraceMap,
            )
        }
    }

    /**
     * Iterate the references of ES modules.
     * @template T
     * @param {TraceMap<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
     */
    *iterateEsmReferences(traceMap) {
        const programNode = /** @type {Program} */ (this.globalScope.block)

        for (const node of programNode.body) {
            if (!isHasSource(node)) {
                continue
            }
            const moduleId = /** @type {string} */ (node.source.value)

            if (!has(traceMap, moduleId)) {
                continue
            }
            const nextTraceMap = traceMap[moduleId]
            const path = [moduleId]

            if (nextTraceMap[READ]) {
                yield {
                    // eslint-disable-next-line object-shorthand -- apply type
                    node: /** @type {RuleNode} */ (node),
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }

            if (node.type === "ExportAllDeclaration") {
                for (const key of Object.keys(nextTraceMap)) {
                    const exportTraceMap = nextTraceMap[key]
                    if (exportTraceMap[READ]) {
                        yield {
                            // eslint-disable-next-line object-shorthand -- apply type
                            node: /** @type {RuleNode} */ (node),
                            path: path.concat(key),
                            type: READ,
                            info: exportTraceMap[READ],
                        }
                    }
                }
            } else {
                for (const specifier of node.specifiers) {
                    const esm = has(nextTraceMap, ESM)
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
     * Iterate the property references for a given expression AST node.
     * @template T
     * @param {Expression} node The expression AST node to iterate property references.
     * @param {TraceMap<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate property references.
     */
    *iteratePropertyReferences(node, traceMap) {
        yield* this._iteratePropertyReferences(node, [], traceMap)
    }

    /**
     * Iterate the references for a given variable.
     * @template T
     * @param {Variable} variable The variable to iterate that references.
     * @param {string[]} path The current path.
     * @param {TraceMapObject<T>} traceMap The trace map.
     * @param {boolean} shouldReport = The flag to report those references.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
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
                const node = /** @type {RuleNode & Identifier} */ (
                    reference.identifier
                )

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
     * @template T
     * @param {Expression} rootNode The AST node to iterate references.
     * @param {string[]} path The current path.
     * @param {TraceMapObject<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
     */
    //eslint-disable-next-line complexity
    *_iteratePropertyReferences(rootNode, path, traceMap) {
        let node = rootNode
        while (isPassThrough(node)) {
            node = node.parent
        }

        const parent = /** @type {RuleNode} */ (node).parent
        if (parent.type === "MemberExpression") {
            if (parent.object === node) {
                const key = getPropertyName(parent)
                if (key == null || !has(traceMap, key)) {
                    return
                }

                path = path.concat(key) //eslint-disable-line no-param-reassign
                const nextTraceMap = traceMap[key]
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
        if (parent.type === "CallExpression") {
            if (parent.callee === node && traceMap[CALL]) {
                yield { node: parent, path, type: CALL, info: traceMap[CALL] }
            }
            return
        }
        if (parent.type === "NewExpression") {
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
        if (parent.type === "AssignmentExpression") {
            if (parent.right === node) {
                yield* this._iterateLhsReferences(parent.left, path, traceMap)
                yield* this._iteratePropertyReferences(parent, path, traceMap)
            }
            return
        }
        if (parent.type === "AssignmentPattern") {
            if (parent.right === node) {
                yield* this._iterateLhsReferences(parent.left, path, traceMap)
            }
            return
        }
        if (parent.type === "VariableDeclarator") {
            if (parent.init === node) {
                yield* this._iterateLhsReferences(parent.id, path, traceMap)
            }
        }
    }

    /**
     * Iterate the references for a given Pattern node.
     * @template T
     * @param {Pattern} patternNode The Pattern node to iterate references.
     * @param {string[]} path The current path.
     * @param {TraceMapObject<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
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
                const key = getPropertyName(
                    /** @type {AssignmentProperty} */ (property),
                )

                if (key == null || !has(traceMap, key)) {
                    continue
                }

                const nextPath = path.concat(key)
                const nextTraceMap = traceMap[key]
                if (nextTraceMap[READ]) {
                    yield {
                        node: /** @type {RuleNode} */ (property),
                        path: nextPath,
                        type: READ,
                        info: nextTraceMap[READ],
                    }
                }
                yield* this._iterateLhsReferences(
                    /** @type {AssignmentProperty} */ (property).value,
                    nextPath,
                    nextTraceMap,
                )
            }
            return
        }
        if (patternNode.type === "AssignmentPattern") {
            yield* this._iterateLhsReferences(patternNode.left, path, traceMap)
        }
    }

    /**
     * Iterate the references for a given ModuleSpecifier node.
     * @template T
     * @param {ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier | ExportSpecifier} specifierNode The ModuleSpecifier node to iterate references.
     * @param {string[]} path The current path.
     * @param {TraceMapObject<T>} traceMap The trace map.
     * @returns {IterableIterator<TrackedReferences<T>>} The iterator to iterate references.
     */
    *_iterateImportReferences(specifierNode, path, traceMap) {
        const type = specifierNode.type

        if (type === "ImportSpecifier" || type === "ImportDefaultSpecifier") {
            const key =
                type === "ImportDefaultSpecifier"
                    ? "default"
                    : specifierNode.imported.type === "Identifier"
                    ? specifierNode.imported.name
                    : specifierNode.imported.value
            if (!has(traceMap, key)) {
                return
            }

            path = path.concat(key) //eslint-disable-line no-param-reassign
            const nextTraceMap = traceMap[key]
            if (nextTraceMap[READ]) {
                yield {
                    node: /** @type {RuleNode} */ (specifierNode),
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }
            yield* this._iterateVariableReferences(
                /** @type {Variable} */ (
                    findVariable(this.globalScope, specifierNode.local)
                ),
                path,
                nextTraceMap,
                false,
            )

            return
        }

        if (type === "ImportNamespaceSpecifier") {
            yield* this._iterateVariableReferences(
                /** @type {Variable} */ (
                    findVariable(this.globalScope, specifierNode.local)
                ),
                path,
                traceMap,
                false,
            )
            return
        }

        if (type === "ExportSpecifier") {
            const key =
                specifierNode.local.type === "Identifier"
                    ? specifierNode.local.name
                    : specifierNode.local.value
            if (!has(traceMap, key)) {
                return
            }

            path = path.concat(key) //eslint-disable-line no-param-reassign
            const nextTraceMap = traceMap[key]
            if (nextTraceMap[READ]) {
                yield {
                    node: /** @type {RuleNode} */ (specifierNode),
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
