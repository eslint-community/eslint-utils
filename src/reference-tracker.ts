import type { Scope } from "eslint"
import type * as ESTree from "estree"
import { findVariable } from "./find-variable"
import { getParent } from "./get-parent"
import { getPropertyName } from "./get-property-name"
import { getStringIfConstant } from "./get-string-if-constant"

const IMPORT_TYPE = /^(?:Import|Export(?:All|Default|Named))Declaration$/u
const has = Function.call.bind(Object.hasOwnProperty) as (
    o: any,
    k: string | symbol,
) => boolean

export const READ = Symbol("read")
export const CALL = Symbol("call")
export const CONSTRUCT = Symbol("construct")
export const ESM = Symbol("esm")

const requireCall = { require: { [CALL]: true } }

function isImportNodeAndHasSource(node: ESTree.Node): node is
    | (ESTree.ExportAllDeclaration & {
          source: ESTree.Literal & { value: string }
      })
    | (ESTree.ImportDeclaration & {
          source: ESTree.Literal & { value: string }
      }) {
    return (
        IMPORT_TYPE.test(node.type) &&
        (node as ESTree.ExportAllDeclaration | ESTree.ImportDeclaration)
            .source != null
    )
}

/**
 * Check whether a given variable is modified or not.
 * @param variable The variable to check.
 * @returns `true` if the variable is modified.
 */
function isModifiedGlobal(
    variable: Scope.Variable | null | undefined,
): boolean {
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
function isPassThrough(node: ESTree.Node) {
    const parent = getParent(node)

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

export type ReferenceTrackerOptions = {
    /**
     * The variable names for Global Object. Default is ["global","globalThis","self","window"]
     */
    globalObjectNames?: string[]

    /**
     * The mode to determine the ImportDeclaration's behavior for CJS modules. Default is "strict"
     */
    mode?: "legacy" | "strict"
}

export type TraceMap<
    CallInfo = never,
    ConstructInfo = never,
    ReadInfo = never,
> = Record<string, TraceMapObject<CallInfo, ConstructInfo, ReadInfo>>

export type TraceMapObject<CallInfo, ConstructInfo, ReadInfo> = {
    [i: string]: TraceMapObject<CallInfo, ConstructInfo, ReadInfo>
    [CALL]?: CallInfo
    [CONSTRUCT]?: ConstructInfo
    [ESM]?: boolean
    [READ]?: ReadInfo
}

export type TrackedReferenceWithCallInfo<CallInfo = unknown> = {
    info: CallInfo
    node: ESTree.SimpleCallExpression
    path: string[]
    type: symbol
}
export type TrackedReferenceWithConstructInfo<ConstructInfo = unknown> = {
    info: ConstructInfo
    node: ESTree.NewExpression
    path: string[]
    type: symbol
}

export type TrackedReferenceWithReadInfo<ReadInfo = unknown> = {
    info: ReadInfo
    node:
        | ESTree.AssignmentProperty
        | ESTree.ExportAllDeclaration
        | ESTree.ExportSpecifier
        | ESTree.Expression
        | ESTree.ImportDeclaration
        | ESTree.ImportDefaultSpecifier
        | ESTree.ImportSpecifier
        | ESTree.RestElement
    path: string[]
    type: symbol
}

export type TrackedReferences<CallInfo, ConstructInfo, ReadInfo> =
    | (CallInfo extends never ? never : TrackedReferenceWithCallInfo<CallInfo>)
    | (ConstructInfo extends never
          ? never
          : TrackedReferenceWithConstructInfo<ConstructInfo>)
    | (ReadInfo extends never ? never : TrackedReferenceWithReadInfo<ReadInfo>)

type TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo> =
    | TrackedReferenceWithCallInfo<CallInfo>
    | TrackedReferenceWithConstructInfo<ConstructInfo>
    | TrackedReferenceWithReadInfo<ReadInfo>

/**
 * The reference tracker.
 */
export class ReferenceTracker {
    public static readonly READ = READ

    public static readonly CALL = CALL

    public static readonly CONSTRUCT = CONSTRUCT

    public static readonly ESM = ESM

    private readonly globalScope: Scope.Scope

    private readonly mode: "legacy" | "strict"

    private readonly globalObjectNames: string[]

    private readonly variableStack: Scope.Variable[]

    /**
     * Initialize this tracker.
     * @param globalScope The global scope.
     * @param options The options.
     * @param options.mode The mode to determine the ImportDeclaration's behavior for CJS modules. Default is "strict"
     * @param options.globalObjectNames The variable names for Global Object. Default is ["global","globalThis","self","window"]
     */
    public constructor(
        globalScope: Scope.Scope,
        {
            mode = "strict",
            globalObjectNames = ["global", "globalThis", "self", "window"],
        }: ReferenceTrackerOptions = {},
    ) {
        this.variableStack = []
        this.globalScope = globalScope
        this.mode = mode
        this.globalObjectNames = globalObjectNames.slice(0)
    }

    /**
     * Iterate the references of global variables.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    public iterateGlobalReferences<
        CallInfo = never,
        ConstructInfo = never,
        ReadInfo = never,
    >(
        traceMap: TraceMap<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<TrackedReferences<CallInfo, ConstructInfo, ReadInfo>> {
        return this._iterateGlobalReferences(traceMap) as IterableIterator<
            TrackedReferences<CallInfo, ConstructInfo, ReadInfo>
        >
    }

    /**
     * Iterate the references of CommonJS modules.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    public iterateCjsReferences<
        CallInfo = never,
        ConstructInfo = never,
        ReadInfo = never,
    >(
        traceMap: TraceMap<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<TrackedReferences<CallInfo, ConstructInfo, ReadInfo>> {
        return this._iterateCjsReferences(traceMap) as IterableIterator<
            TrackedReferences<CallInfo, ConstructInfo, ReadInfo>
        >
    }

    /**
     * Iterate the references of ES modules.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    public iterateEsmReferences<
        CallInfo = never,
        ConstructInfo = never,
        ReadInfo = never,
    >(
        traceMap: TraceMap<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<TrackedReferences<CallInfo, ConstructInfo, ReadInfo>> {
        return this._iterateEsmReferences(traceMap) as IterableIterator<
            TrackedReferences<CallInfo, ConstructInfo, ReadInfo>
        >
    }

    /**
     * Iterate the references of global variables.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    private *_iterateGlobalReferences<
        CallInfo = never,
        ConstructInfo = never,
        ReadInfo = never,
    >(
        traceMap: TraceMap<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
        for (const key of Object.keys(traceMap)) {
            const nextTraceMap = traceMap[key]
            const path = [key]
            const variable = this.globalScope.set.get(key)

            if (isModifiedGlobal(variable)) {
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
            const path: string[] = []
            const variable = this.globalScope.set.get(key)

            if (isModifiedGlobal(variable)) {
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
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    private *_iterateCjsReferences<
        CallInfo = never,
        ConstructInfo = never,
        ReadInfo = never,
    >(
        traceMap: TraceMap<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
        for (const { node } of this.iterateGlobalReferences(requireCall)) {
            const key = getStringIfConstant(
                (node as ESTree.CallExpression).arguments[0],
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
            yield* this._iteratePropertyReferences(node, path, nextTraceMap)
        }
    }

    /**
     * Iterate the references of ES modules.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    public *_iterateEsmReferences<
        CallInfo = never,
        ConstructInfo = never,
        ReadInfo = never,
    >(
        traceMap: TraceMap<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
        const programNode = this.globalScope.block as ESTree.Program

        for (const node of programNode.body) {
            if (!isImportNodeAndHasSource(node)) {
                continue
            }
            const moduleId = node.source.value

            if (!has(traceMap, moduleId)) {
                continue
            }
            const nextTraceMap = traceMap[moduleId]
            const path = [moduleId]

            if (nextTraceMap[READ]) {
                yield { node, path, type: READ, info: nextTraceMap[READ] }
            }

            if (node.type === "ExportAllDeclaration") {
                for (const key of Object.keys(nextTraceMap)) {
                    const exportTraceMap = nextTraceMap[key]
                    if (exportTraceMap[READ]) {
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
     * Iterate the references for a given variable.
     * @param variable The variable to iterate that references.
     * @param path The current path.
     * @param traceMap The trace map.
     * @param shouldReport = The flag to report those references.
     * @returns The iterator to iterate references.
     */
    private *_iterateVariableReferences<CallInfo, ConstructInfo, ReadInfo>(
        variable: Scope.Variable | undefined,
        path: string[],
        traceMap: TraceMapObject<CallInfo, ConstructInfo, ReadInfo>,
        shouldReport: boolean,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
        if (!variable) {
            return
        }
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
     * @param rootNode The AST node to iterate references.
     * @param path The current path.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    //eslint-disable-next-line complexity
    private *_iteratePropertyReferences<CallInfo, ConstructInfo, ReadInfo>(
        rootNode: ESTree.Node,
        path: string[],
        traceMap: TraceMapObject<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
        let node = rootNode
        while (isPassThrough(node)) {
            node = getParent(node)!
        }

        const parent = getParent(node)!
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
     * @param {Node} patternNode The Pattern node to iterate references.
     * @param path The current path.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    private *_iterateLhsReferences<CallInfo, ConstructInfo, ReadInfo>(
        patternNode: ESTree.Pattern,
        path: string[],
        traceMap: TraceMapObject<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
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
                const key =
                    property.type === "Property"
                        ? getPropertyName(property)
                        : null

                if (key == null || !has(traceMap, key)) {
                    continue
                }

                const nextPath = path.concat(key)
                const nextTraceMap = traceMap[key]
                if (nextTraceMap[READ]) {
                    yield {
                        node: property,
                        path: nextPath,
                        type: READ,
                        info: nextTraceMap[READ],
                    }
                }
                if (property.type === "Property") {
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
     * @param specifierNode The ModuleSpecifier node to iterate references.
     * @param path The current path.
     * @param traceMap The trace map.
     * @returns The iterator to iterate references.
     */
    private *_iterateImportReferences<CallInfo, ConstructInfo, ReadInfo>(
        specifierNode:
            | ESTree.ExportSpecifier
            | ESTree.ImportDefaultSpecifier
            | ESTree.ImportNamespaceSpecifier
            | ESTree.ImportSpecifier,
        path: string[],
        traceMap: TraceMapObject<CallInfo, ConstructInfo, ReadInfo>,
    ): IterableIterator<
        TrackedReferencesInternal<CallInfo, ConstructInfo, ReadInfo>
    > {
        const type = specifierNode.type

        if (type === "ImportSpecifier" || type === "ImportDefaultSpecifier") {
            const key =
                type === "ImportDefaultSpecifier"
                    ? "default"
                    : specifierNode.imported.name
            if (!has(traceMap, key)) {
                return
            }

            path = path.concat(key) //eslint-disable-line no-param-reassign
            const nextTraceMap = traceMap[key]
            if (nextTraceMap[READ]) {
                yield {
                    node: specifierNode,
                    path,
                    type: READ,
                    info: nextTraceMap[READ],
                }
            }
            yield* this._iterateVariableReferences(
                findVariable(this.globalScope, specifierNode.local)!,
                path,
                nextTraceMap,
                false,
            )

            return
        }

        if (type === "ImportNamespaceSpecifier") {
            yield* this._iterateVariableReferences(
                findVariable(this.globalScope, specifierNode.local)!,
                path,
                traceMap,
                false,
            )
            return
        }

        if (type === "ExportSpecifier") {
            const key = specifierNode.local.name
            if (!has(traceMap, key)) {
                return
            }

            path = path.concat(key) //eslint-disable-line no-param-reassign
            const nextTraceMap = traceMap[key]
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

/**
 * This is a predicate function for Array#filter.
 * @param {string} name A name part.
 * @param {number} index The index of the name.
 * @returns {boolean} `false` if it's default.
 */
function exceptDefault(name: string, index: number) {
    return !(index === 1 && name === "default")
}
