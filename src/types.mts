import type { AST, Rule } from "eslint"
import type { CALL, CONSTRUCT, ESM, READ } from "./reference-tracker.mjs"

export type StaticValue = StaticValueProvided | StaticValueOptional

export type StaticValueProvided = {
    optional?: undefined
    value: unknown
}

export type StaticValueOptional = {
    optional?: true
    value: undefined
}

export type ReferenceTrackerOptions = {
    /**
     * The variable names for Global Object.
     */
    globalObjectNames?: string[]

    /**
     * The mode to determine the ImportDeclaration's behavior for CJS modules.
     */
    mode?: "legacy" | "strict"
}

export type TraceMap<T = unknown> = {
    [i: string]: TraceMapObject<T>
}

export type TraceMapObject<T> = {
    [i: string]: TraceMapObject<T>
    [CALL]?: T
    [CONSTRUCT]?: T
    [READ]?: T
    [ESM]?: boolean
}

export type TrackedReferences<T> = {
    info: T
    node: Rule.Node
    path: string[]
    type: typeof CALL | typeof CONSTRUCT | typeof READ
}

/**
 * Options for `hasSideEffect`, optionally.
 */
export type HasSideEffectOptions = {
    /**
     * If `true` then it considers member accesses as the node which has side effects.
     */
    considerGetters?: boolean

    /**
     * If `true` then it considers implicit type conversion as the node which has side effects.
     */
    considerImplicitTypeConversion?: boolean
}

export type PunctuatorToken<Value extends string> = AST.Token & {
    type: "Punctuator"
    value: Value
}
export type ArrowToken = PunctuatorToken<"=>">
export type CommaToken = PunctuatorToken<",">
export type SemicolonToken = PunctuatorToken<";">
export type ColonToken = PunctuatorToken<":">
export type OpeningParenToken = PunctuatorToken<"(">
export type ClosingParenToken = PunctuatorToken<")">
export type OpeningBracketToken = PunctuatorToken<"[">
export type ClosingBracketToken = PunctuatorToken<"]">
export type OpeningBraceToken = PunctuatorToken<"{">
export type ClosingBraceToken = PunctuatorToken<"}">
