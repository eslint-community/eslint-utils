type Token = { type: string; value: string }
type Comment = Token & { type: "Block" | "Line" | "Shebang" }

export type PunctuatorToken<Value extends string> = {
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

/**
 * Creates the negate function of the given function.
 * @param {function(Token):boolean} f - The function to negate.
 * @returns {function(Token):boolean} Negated function.
 */
function negate(f: (token: Token) => boolean): (token: Token) => boolean {
    return (t) => !f(t)
}

/**
 * Checks if the given token is a PunctuatorToken with the given value
 * @param token - The token to check.
 * @param value - The value to check.
 * @returns `true` if the token is a PunctuatorToken with the given value.
 */
function isPunctuatorTokenWithValue<V extends string>(
    token: Token,
    value: V,
): token is PunctuatorToken<V> {
    return token.type === "Punctuator" && token.value === value
}

/**
 * Checks if the given token is an arrow token or not.
 * @param token - The token to check.
 * @returns `true` if the token is an arrow token.
 */
export function isArrowToken(token: Token): token is ArrowToken {
    return isPunctuatorTokenWithValue(token, "=>")
}

/**
 * Checks if the given token is a comma token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a comma token.
 */
export function isCommaToken(token: Token): token is CommaToken {
    return isPunctuatorTokenWithValue(token, ",")
}

/**
 * Checks if the given token is a semicolon token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a semicolon token.
 */
export function isSemicolonToken(token: Token): token is SemicolonToken {
    return isPunctuatorTokenWithValue(token, ";")
}

/**
 * Checks if the given token is a colon token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a colon token.
 */
export function isColonToken(token: Token): token is ColonToken {
    return isPunctuatorTokenWithValue(token, ":")
}

/**
 * Checks if the given token is an opening parenthesis token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is an opening parenthesis token.
 */
export function isOpeningParenToken(token: Token): token is OpeningParenToken {
    return isPunctuatorTokenWithValue(token, "(")
}

/**
 * Checks if the given token is a closing parenthesis token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a closing parenthesis token.
 */
export function isClosingParenToken(token: Token): token is ClosingParenToken {
    return isPunctuatorTokenWithValue(token, ")")
}

/**
 * Checks if the given token is an opening square bracket token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is an opening square bracket token.
 */
export function isOpeningBracketToken(
    token: Token,
): token is OpeningBracketToken {
    return isPunctuatorTokenWithValue(token, "[")
}

/**
 * Checks if the given token is a closing square bracket token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a closing square bracket token.
 */
export function isClosingBracketToken(
    token: Token,
): token is ClosingBracketToken {
    return isPunctuatorTokenWithValue(token, "]")
}

/**
 * Checks if the given token is an opening brace token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is an opening brace token.
 */
export function isOpeningBraceToken(token: Token): token is OpeningBraceToken {
    return isPunctuatorTokenWithValue(token, "{")
}

/**
 * Checks if the given token is a closing brace token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a closing brace token.
 */
export function isClosingBraceToken(token: Token): token is ClosingBraceToken {
    return isPunctuatorTokenWithValue(token, "}")
}

/**
 * Checks if the given token is a comment token or not.
 * @param {Token} token - The token to check.
 * @returns {boolean} `true` if the token is a comment token.
 */
export function isCommentToken(token: Token): token is Comment {
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
