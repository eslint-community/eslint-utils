/** @typedef {import("./types.mjs").StaticValue} StaticValue */
/** @typedef {import("./types.mjs").StaticValueOptional} StaticValueOptional */
/** @typedef {import("./types.mjs").StaticValueProvided} StaticValueProvided */
/** @typedef {import("./types.mjs").ReferenceTrackerOptions} ReferenceTrackerOptions */
/**
 * @template T
 * @typedef {import("./types.mjs").TraceMap<T>} TraceMap
 */
/**
 * @template T
 * @typedef {import("./types.mjs").TrackedReferences<T>} TrackedReferences
 */
/** @typedef {import("./types.mjs").HasSideEffectOptions} HasSideEffectOptions */
/** @typedef {import("./types.mjs").ArrowToken} ArrowToken */
/** @typedef {import("./types.mjs").CommaToken} CommaToken */
/** @typedef {import("./types.mjs").SemicolonToken} SemicolonToken */
/** @typedef {import("./types.mjs").ColonToken} ColonToken */
/** @typedef {import("./types.mjs").OpeningParenToken} OpeningParenToken */
/** @typedef {import("./types.mjs").ClosingParenToken} ClosingParenToken */
/** @typedef {import("./types.mjs").OpeningBracketToken} OpeningBracketToken */
/** @typedef {import("./types.mjs").ClosingBracketToken} ClosingBracketToken */
/** @typedef {import("./types.mjs").OpeningBraceToken} OpeningBraceToken */
/** @typedef {import("./types.mjs").ClosingBraceToken} ClosingBraceToken */

import { findVariable } from "./find-variable.mjs"
import { getFunctionHeadLocation } from "./get-function-head-location.mjs"
import { getFunctionNameWithKind } from "./get-function-name-with-kind.mjs"
import { getInnermostScope } from "./get-innermost-scope.mjs"
import { getPropertyName } from "./get-property-name.mjs"
import { getStaticValue } from "./get-static-value.mjs"
import { getStringIfConstant } from "./get-string-if-constant.mjs"
import { hasSideEffect } from "./has-side-effect.mjs"
import { isParenthesized } from "./is-parenthesized.mjs"
import { PatternMatcher } from "./pattern-matcher.mjs"
import {
    CALL,
    CONSTRUCT,
    ESM,
    READ,
    ReferenceTracker,
} from "./reference-tracker.mjs"
import {
    isArrowToken,
    isClosingBraceToken,
    isClosingBracketToken,
    isClosingParenToken,
    isColonToken,
    isCommaToken,
    isCommentToken,
    isNotArrowToken,
    isNotClosingBraceToken,
    isNotClosingBracketToken,
    isNotClosingParenToken,
    isNotColonToken,
    isNotCommaToken,
    isNotCommentToken,
    isNotOpeningBraceToken,
    isNotOpeningBracketToken,
    isNotOpeningParenToken,
    isNotSemicolonToken,
    isOpeningBraceToken,
    isOpeningBracketToken,
    isOpeningParenToken,
    isSemicolonToken,
} from "./token-predicate.mjs"

export default {
    CALL,
    CONSTRUCT,
    ESM,
    findVariable,
    getFunctionHeadLocation,
    getFunctionNameWithKind,
    getInnermostScope,
    getPropertyName,
    getStaticValue,
    getStringIfConstant,
    hasSideEffect,
    isArrowToken,
    isClosingBraceToken,
    isClosingBracketToken,
    isClosingParenToken,
    isColonToken,
    isCommaToken,
    isCommentToken,
    isNotArrowToken,
    isNotClosingBraceToken,
    isNotClosingBracketToken,
    isNotClosingParenToken,
    isNotColonToken,
    isNotCommaToken,
    isNotCommentToken,
    isNotOpeningBraceToken,
    isNotOpeningBracketToken,
    isNotOpeningParenToken,
    isNotSemicolonToken,
    isOpeningBraceToken,
    isOpeningBracketToken,
    isOpeningParenToken,
    isParenthesized,
    isSemicolonToken,
    PatternMatcher,
    READ,
    ReferenceTracker,
}
export {
    CALL,
    CONSTRUCT,
    ESM,
    findVariable,
    getFunctionHeadLocation,
    getFunctionNameWithKind,
    getInnermostScope,
    getPropertyName,
    getStaticValue,
    getStringIfConstant,
    hasSideEffect,
    isArrowToken,
    isClosingBraceToken,
    isClosingBracketToken,
    isClosingParenToken,
    isColonToken,
    isCommaToken,
    isCommentToken,
    isNotArrowToken,
    isNotClosingBraceToken,
    isNotClosingBracketToken,
    isNotClosingParenToken,
    isNotColonToken,
    isNotCommaToken,
    isNotCommentToken,
    isNotOpeningBraceToken,
    isNotOpeningBracketToken,
    isNotOpeningParenToken,
    isNotSemicolonToken,
    isOpeningBraceToken,
    isOpeningBracketToken,
    isOpeningParenToken,
    isParenthesized,
    isSemicolonToken,
    PatternMatcher,
    READ,
    ReferenceTracker,
}
