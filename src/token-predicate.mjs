/** @typedef {import("eslint").AST.Token} Token */
/** @typedef {import("estree").Comment} Comment */
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
/**
 * @template {string} Value
 * @typedef {import("./types.mjs").PunctuatorToken<Value>} PunctuatorToken
 */

/** @typedef {Comment | Token} CommentOrToken */

/**
 * Creates the negate function of the given function.
 * @param {function(CommentOrToken):boolean} f - The function to negate.
 * @returns {function(CommentOrToken):boolean} Negated function.
 */
function negate(f) {
    return (token) => !f(token)
}

/**
 * Checks if the given token is a PunctuatorToken with the given value
 * @template {string} Value
 * @param {CommentOrToken} token - The token to check.
 * @param {Value} value - The value to check.
 * @returns {token is PunctuatorToken<Value>} `true` if the token is a PunctuatorToken with the given value.
 */
function isPunctuatorTokenWithValue(token, value) {
    return token.type === "Punctuator" && token.value === value
}

/**
 * Checks if the given token is an arrow token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is ArrowToken} `true` if the token is an arrow token.
 */
export function isArrowToken(token) {
    return isPunctuatorTokenWithValue(token, "=>")
}

/**
 * Checks if the given token is a comma token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is CommaToken} `true` if the token is a comma token.
 */
export function isCommaToken(token) {
    return isPunctuatorTokenWithValue(token, ",")
}

/**
 * Checks if the given token is a semicolon token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is SemicolonToken} `true` if the token is a semicolon token.
 */
export function isSemicolonToken(token) {
    return isPunctuatorTokenWithValue(token, ";")
}

/**
 * Checks if the given token is a colon token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is ColonToken} `true` if the token is a colon token.
 */
export function isColonToken(token) {
    return isPunctuatorTokenWithValue(token, ":")
}

/**
 * Checks if the given token is an opening parenthesis token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is OpeningParenToken} `true` if the token is an opening parenthesis token.
 */
export function isOpeningParenToken(token) {
    return isPunctuatorTokenWithValue(token, "(")
}

/**
 * Checks if the given token is a closing parenthesis token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is ClosingParenToken} `true` if the token is a closing parenthesis token.
 */
export function isClosingParenToken(token) {
    return isPunctuatorTokenWithValue(token, ")")
}

/**
 * Checks if the given token is an opening square bracket token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is OpeningBracketToken} `true` if the token is an opening square bracket token.
 */
export function isOpeningBracketToken(token) {
    return isPunctuatorTokenWithValue(token, "[")
}

/**
 * Checks if the given token is a closing square bracket token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is ClosingBracketToken} `true` if the token is a closing square bracket token.
 */
export function isClosingBracketToken(token) {
    return isPunctuatorTokenWithValue(token, "]")
}

/**
 * Checks if the given token is an opening brace token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is OpeningBraceToken} `true` if the token is an opening brace token.
 */
export function isOpeningBraceToken(token) {
    return isPunctuatorTokenWithValue(token, "{")
}

/**
 * Checks if the given token is a closing brace token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is ClosingBraceToken} `true` if the token is a closing brace token.
 */
export function isClosingBraceToken(token) {
    return isPunctuatorTokenWithValue(token, "}")
}

/**
 * Checks if the given token is a comment token or not.
 * @param {CommentOrToken} token - The token to check.
 * @returns {token is Comment} `true` if the token is a comment token.
 */
export function isCommentToken(token) {
    return ["Block", "Line", "Shebang"].includes(token.type)
}

export const isNotArrowToken = negate(isArrowToken)
export const isNotCommaToken = negate(isCommaToken)
export const isNotSemicolonToken = negate(isSemicolonToken)
export const isNotColonToken = negate(isColonToken)
export const isNotOpeningParenToken = negate(isOpeningParenToken)
export const isNotClosingParenToken = negate(isClosingParenToken)
export const isNotOpeningBracketToken = negate(isOpeningBracketToken)
export const isNotClosingBracketToken = negate(isClosingBracketToken)
export const isNotOpeningBraceToken = negate(isOpeningBraceToken)
export const isNotClosingBraceToken = negate(isClosingBraceToken)
export const isNotCommentToken = negate(isCommentToken)
