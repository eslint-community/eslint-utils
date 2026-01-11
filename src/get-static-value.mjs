/* globals globalThis, global, self, window */

import { findVariable } from "./find-variable.mjs"
/** @typedef {import("./types.mjs").StaticValue} StaticValue */
/** @typedef {import("eslint").Scope.Scope} Scope */
/** @typedef {import("eslint").Scope.Variable} Variable */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("@typescript-eslint/types").TSESTree.Node} TSESTreeNode */
/** @typedef {import("@typescript-eslint/types").TSESTree.AST_NODE_TYPES} TSESTreeNodeTypes */
/** @typedef {import("@typescript-eslint/types").TSESTree.MemberExpression} MemberExpression */
/** @typedef {import("@typescript-eslint/types").TSESTree.Property} Property */
/** @typedef {import("@typescript-eslint/types").TSESTree.RegExpLiteral} RegExpLiteral */
/** @typedef {import("@typescript-eslint/types").TSESTree.BigIntLiteral} BigIntLiteral */
/** @typedef {import("@typescript-eslint/types").TSESTree.Literal} Literal */

const globalObject =
    typeof globalThis !== "undefined"
        ? globalThis
        : // @ts-ignore
          typeof self !== "undefined"
          ? // @ts-ignore
            self
          : // @ts-ignore
            typeof window !== "undefined"
            ? // @ts-ignore
              window
            : typeof global !== "undefined"
              ? global
              : {}

const builtinNames = Object.freeze(
    new Set([
        "Array",
        "ArrayBuffer",
        "BigInt",
        "BigInt64Array",
        "BigUint64Array",
        "Boolean",
        "DataView",
        "Date",
        "decodeURI",
        "decodeURIComponent",
        "encodeURI",
        "encodeURIComponent",
        "escape",
        "Float32Array",
        "Float64Array",
        "Function",
        "Infinity",
        "Int16Array",
        "Int32Array",
        "Int8Array",
        "isFinite",
        "isNaN",
        "isPrototypeOf",
        "JSON",
        "Map",
        "Math",
        "NaN",
        "Number",
        "Object",
        "parseFloat",
        "parseInt",
        "Promise",
        "Proxy",
        "Reflect",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "Uint16Array",
        "Uint32Array",
        "Uint8Array",
        "Uint8ClampedArray",
        "undefined",
        "unescape",
        "WeakMap",
        "WeakSet",
    ]),
)
const callAllowed = new Set(
    [
        Array.isArray,
        Array.of,
        Array.prototype.at,
        Array.prototype.concat,
        Array.prototype.entries,
        Array.prototype.every,
        Array.prototype.filter,
        Array.prototype.find,
        Array.prototype.findIndex,
        Array.prototype.flat,
        Array.prototype.includes,
        Array.prototype.indexOf,
        Array.prototype.join,
        Array.prototype.keys,
        Array.prototype.lastIndexOf,
        Array.prototype.slice,
        Array.prototype.some,
        Array.prototype.toString,
        Array.prototype.values,
        typeof BigInt === "function" ? BigInt : undefined,
        Boolean,
        Date,
        Date.parse,
        decodeURI,
        decodeURIComponent,
        encodeURI,
        encodeURIComponent,
        escape,
        isFinite,
        isNaN,
        // @ts-ignore
        isPrototypeOf,
        Map,
        Map.prototype.entries,
        Map.prototype.get,
        Map.prototype.has,
        Map.prototype.keys,
        Map.prototype.values,
        .../** @type {(keyof typeof Math)[]} */ (
            Object.getOwnPropertyNames(Math)
        )
            .filter((k) => k !== "random")
            .map((k) => Math[k])
            .filter((f) => typeof f === "function"),
        Number,
        Number.isFinite,
        Number.isNaN,
        Number.parseFloat,
        Number.parseInt,
        Number.prototype.toExponential,
        Number.prototype.toFixed,
        Number.prototype.toPrecision,
        Number.prototype.toString,
        Object,
        Object.entries,
        Object.is,
        Object.isExtensible,
        Object.isFrozen,
        Object.isSealed,
        Object.keys,
        Object.values,
        parseFloat,
        parseInt,
        RegExp,
        Set,
        Set.prototype.entries,
        Set.prototype.has,
        Set.prototype.keys,
        Set.prototype.values,
        String,
        String.fromCharCode,
        String.fromCodePoint,
        String.raw,
        String.prototype.at,
        String.prototype.charAt,
        String.prototype.charCodeAt,
        String.prototype.codePointAt,
        String.prototype.concat,
        String.prototype.endsWith,
        String.prototype.includes,
        String.prototype.indexOf,
        String.prototype.lastIndexOf,
        String.prototype.normalize,
        String.prototype.padEnd,
        String.prototype.padStart,
        String.prototype.slice,
        String.prototype.startsWith,
        String.prototype.substr,
        String.prototype.substring,
        String.prototype.toLowerCase,
        String.prototype.toString,
        String.prototype.toUpperCase,
        String.prototype.trim,
        String.prototype.trimEnd,
        String.prototype.trimLeft,
        String.prototype.trimRight,
        String.prototype.trimStart,
        Symbol.for,
        Symbol.keyFor,
        unescape,
    ].filter((f) => typeof f === "function"),
)
const callPassThrough = new Set([
    Object.freeze,
    Object.preventExtensions,
    Object.seal,
])

/** @type {ReadonlyArray<readonly [Function, ReadonlySet<string>]>} */
const getterAllowed = [
    [Map, new Set(["size"])],
    [
        RegExp,
        new Set([
            "dotAll",
            "flags",
            "global",
            "hasIndices",
            "ignoreCase",
            "multiline",
            "source",
            "sticky",
            "unicode",
        ]),
    ],
    [Set, new Set(["size"])],
]

/**
 * Get the property descriptor.
 * @param {object} object The object to get.
 * @param {string|number|symbol} name The property name to get.
 */
function getPropertyDescriptor(object, name) {
    let x = object
    while ((typeof x === "object" || typeof x === "function") && x !== null) {
        const d = Object.getOwnPropertyDescriptor(x, name)
        if (d) {
            return d
        }
        x = Object.getPrototypeOf(x)
    }
    return null
}

/**
 * Check if a property is getter or not.
 * @param {object} object The object to check.
 * @param {string|number|symbol} name The property name to check.
 */
function isGetter(object, name) {
    const d = getPropertyDescriptor(object, name)
    return d != null && d.get != null
}

/**
 * Get the element values of a given node list.
 * @param {(Node|TSESTreeNode|null)[]} nodeList The node list to get values.
 * @param {Scope|undefined|null} initialScope The initial scope to find variables.
 * @returns {any[]|null} The value list if all nodes are constant. Otherwise, null.
 */
function getElementValues(nodeList, initialScope) {
    const valueList = []

    for (let i = 0; i < nodeList.length; ++i) {
        const elementNode = nodeList[i]

        if (elementNode == null) {
            valueList.length = i + 1
        } else if (elementNode.type === "SpreadElement") {
            const argument = getStaticValueR(elementNode.argument, initialScope)
            if (argument == null) {
                return null
            }
            valueList.push(.../** @type {Iterable<any>} */ (argument.value))
        } else {
            const element = getStaticValueR(elementNode, initialScope)
            if (element == null) {
                return null
            }
            valueList.push(element.value)
        }
    }

    return valueList
}

/**
 * Checks if a variable is a built-in global.
 * @param {Variable|null} variable The variable to check.
 * @returns {variable is Variable & {defs:[]}}
 */
function isBuiltinGlobal(variable) {
    return (
        variable != null &&
        variable.defs.length === 0 &&
        builtinNames.has(variable.name) &&
        variable.name in globalObject
    )
}

/**
 * Checks if a variable can be considered as a constant.
 * @param {Variable} variable
 * @returns {variable is Variable & {defs: [import("eslint").Scope.Definition & { type: "Variable" }]}} True if the variable can be considered as a constant.
 */
function canBeConsideredConst(variable) {
    if (variable.defs.length !== 1) {
        return false
    }
    const def = variable.defs[0]
    return Boolean(
        def.parent &&
        def.type === "Variable" &&
        (def.parent.kind === "const" || isEffectivelyConst(variable)),
    )
}

/**
 * Returns whether the given variable is never written to after initialization.
 * @param {Variable} variable
 * @returns {boolean}
 */
function isEffectivelyConst(variable) {
    const refs = variable.references

    const inits = refs.filter((r) => r.init).length
    const reads = refs.filter((r) => r.isReadOnly()).length
    if (inits === 1 && reads + inits === refs.length) {
        // there is only one init and all other references only read
        return true
    }
    return false
}

/**
 * Checks if a variable has mutation in its property.
 * @param {Variable} variable The variable to check.
 * @param {Scope|null} initialScope The scope to start finding variable. Optional. If the node is a computed property node and this scope was given, this checks the computed property name by the `getStringIfConstant` function with the scope, and returns the value of it.
 * @returns {boolean} True if the variable has mutation in its property.
 */
function hasMutationInProperty(variable, initialScope) {
    for (const ref of variable.references) {
        let node = /** @type {TSESTreeNode} */ (ref.identifier)
        while (node && node.parent && node.parent.type === "MemberExpression") {
            node = node.parent
        }
        if (!node || !node.parent) {
            continue
        }
        if (
            (node.parent.type === "AssignmentExpression" &&
                node.parent.left === node) ||
            (node.parent.type === "UpdateExpression" &&
                node.parent.argument === node)
        ) {
            // This is a mutation.
            return true
        }
        if (
            node.parent.type === "CallExpression" &&
            node.parent.callee === node &&
            node.type === "MemberExpression"
        ) {
            const methodName = getStaticPropertyNameValue(node, initialScope)
            if (isNameOfMutationArrayMethod(methodName)) {
                // This is a mutation.
                return true
            }
        }
    }
    return false

    /**
     * Checks if a method name is one of the mutation array methods.
     * @param {StaticValue|null} methodName The method name to check.
     * @returns {boolean} True if the method name is a mutation array method.
     */
    function isNameOfMutationArrayMethod(methodName) {
        if (methodName == null || methodName.value == null) {
            return false
        }
        const name = methodName.value
        return (
            name === "copyWithin" ||
            name === "fill" ||
            name === "pop" ||
            name === "push" ||
            name === "reverse" ||
            name === "shift" ||
            name === "sort" ||
            name === "splice" ||
            name === "unshift"
        )
    }
}

/**
 * @template {TSESTreeNodeTypes} T
 * @callback VisitorCallback
 * @param {TSESTreeNode & { type: T }} node
 * @param {Scope|undefined|null} initialScope
 * @returns {StaticValue | null}
 */
/**
 * @typedef { { [K in TSESTreeNodeTypes]?: VisitorCallback<K> } } Operations
 */
/**
 * @type {Operations}
 */
const operations = Object.freeze({
    ArrayExpression(node, initialScope) {
        const elements = getElementValues(node.elements, initialScope)
        return elements != null ? { value: elements } : null
    },

    AssignmentExpression(node, initialScope) {
        if (node.operator === "=") {
            return getStaticValueR(node.right, initialScope)
        }
        return null
    },

    //eslint-disable-next-line complexity
    BinaryExpression(node, initialScope) {
        if (node.operator === "in" || node.operator === "instanceof") {
            // Not supported.
            return null
        }

        const left = getStaticValueR(node.left, initialScope)
        const right = getStaticValueR(node.right, initialScope)
        if (left != null && right != null) {
            switch (node.operator) {
                case "==":
                    return { value: left.value == right.value } //eslint-disable-line eqeqeq
                case "!=":
                    return { value: left.value != right.value } //eslint-disable-line eqeqeq
                case "===":
                    return { value: left.value === right.value }
                case "!==":
                    return { value: left.value !== right.value }
                case "<":
                    return {
                        value:
                            /** @type {any} */ (left.value) <
                            /** @type {any} */ (right.value),
                    }
                case "<=":
                    return {
                        value:
                            /** @type {any} */ (left.value) <=
                            /** @type {any} */ (right.value),
                    }
                case ">":
                    return {
                        value:
                            /** @type {any} */ (left.value) >
                            /** @type {any} */ (right.value),
                    }
                case ">=":
                    return {
                        value:
                            /** @type {any} */ (left.value) >=
                            /** @type {any} */ (right.value),
                    }
                case "<<":
                    return {
                        value:
                            /** @type {any} */ (left.value) <<
                            /** @type {any} */ (right.value),
                    }
                case ">>":
                    return {
                        value:
                            /** @type {any} */ (left.value) >>
                            /** @type {any} */ (right.value),
                    }
                case ">>>":
                    return {
                        value:
                            /** @type {any} */ (left.value) >>>
                            /** @type {any} */ (right.value),
                    }
                case "+":
                    return {
                        value:
                            /** @type {any} */ (left.value) +
                            /** @type {any} */ (right.value),
                    }
                case "-":
                    return {
                        value:
                            /** @type {any} */ (left.value) -
                            /** @type {any} */ (right.value),
                    }
                case "*":
                    return {
                        value:
                            /** @type {any} */ (left.value) *
                            /** @type {any} */ (right.value),
                    }
                case "/":
                    return {
                        value:
                            /** @type {any} */ (left.value) /
                            /** @type {any} */ (right.value),
                    }
                case "%":
                    return {
                        value:
                            /** @type {any} */ (left.value) %
                            /** @type {any} */ (right.value),
                    }
                case "**":
                    return {
                        value:
                            /** @type {any} */ (left.value) **
                            /** @type {any} */ (right.value),
                    }
                case "|":
                    return {
                        value:
                            /** @type {any} */ (left.value) |
                            /** @type {any} */ (right.value),
                    }
                case "^":
                    return {
                        value:
                            /** @type {any} */ (left.value) ^
                            /** @type {any} */ (right.value),
                    }
                case "&":
                    return {
                        value:
                            /** @type {any} */ (left.value) &
                            /** @type {any} */ (right.value),
                    }

                // no default
            }
        }

        return null
    },

    CallExpression(node, initialScope) {
        const calleeNode = node.callee
        const args = getElementValues(node.arguments, initialScope)

        if (args != null) {
            if (calleeNode.type === "MemberExpression") {
                if (calleeNode.property.type === "PrivateIdentifier") {
                    return null
                }
                const object = getStaticValueR(calleeNode.object, initialScope)
                if (object != null) {
                    if (
                        object.value == null &&
                        (object.optional || node.optional)
                    ) {
                        return { value: undefined, optional: true }
                    }
                    const property = getStaticPropertyNameValue(
                        calleeNode,
                        initialScope,
                    )

                    if (property != null) {
                        const receiver =
                            /** @type {Record<PropertyKey, (...args: any[]) => any>} */ (
                                object.value
                            )
                        const methodName = /** @type {PropertyKey} */ (
                            property.value
                        )
                        if (callAllowed.has(receiver[methodName])) {
                            return {
                                value: receiver[methodName](...args),
                            }
                        }
                        if (callPassThrough.has(receiver[methodName])) {
                            return { value: args[0] }
                        }
                    }
                }
            } else {
                const callee = getStaticValueR(calleeNode, initialScope)
                if (callee != null) {
                    if (callee.value == null && node.optional) {
                        return { value: undefined, optional: true }
                    }
                    const func = /** @type {(...args: any[]) => any} */ (
                        callee.value
                    )
                    if (callAllowed.has(func)) {
                        return { value: func(...args) }
                    }
                    if (callPassThrough.has(func)) {
                        return { value: args[0] }
                    }
                }
            }
        }

        return null
    },

    ConditionalExpression(node, initialScope) {
        const test = getStaticValueR(node.test, initialScope)
        if (test != null) {
            return test.value
                ? getStaticValueR(node.consequent, initialScope)
                : getStaticValueR(node.alternate, initialScope)
        }
        return null
    },

    ExpressionStatement(node, initialScope) {
        return getStaticValueR(node.expression, initialScope)
    },

    Identifier(node, initialScope) {
        if (initialScope != null) {
            const variable = findVariable(initialScope, node)

            if (variable != null) {
                // Built-in globals.
                if (isBuiltinGlobal(variable)) {
                    return { value: globalObject[variable.name] }
                }

                // Constants.
                if (canBeConsideredConst(variable)) {
                    const def = variable.defs[0]
                    if (
                        // TODO(mysticatea): don't support destructuring here.
                        def.node.id.type === "Identifier"
                    ) {
                        const init = getStaticValueR(
                            def.node.init,
                            initialScope,
                        )
                        if (
                            init &&
                            typeof init.value === "object" &&
                            init.value !== null
                        ) {
                            if (hasMutationInProperty(variable, initialScope)) {
                                // This variable has mutation in its property.
                                return null
                            }
                        }
                        return init
                    }
                }
            }
        }
        return null
    },

    Literal(node) {
        const literal =
            /** @type {Partial<Literal> & Partial<RegExpLiteral> & Partial<BigIntLiteral>} */ (
                node
            )
        //istanbul ignore if : this is implementation-specific behavior.
        if (
            (literal.regex != null || literal.bigint != null) &&
            literal.value == null
        ) {
            // It was a RegExp/BigInt literal, but Node.js didn't support it.
            return null
        }
        return { value: literal.value }
    },

    LogicalExpression(node, initialScope) {
        const left = getStaticValueR(node.left, initialScope)
        if (left != null) {
            if (
                (node.operator === "||" && Boolean(left.value) === true) ||
                (node.operator === "&&" && Boolean(left.value) === false) ||
                (node.operator === "??" && left.value != null)
            ) {
                return left
            }

            const right = getStaticValueR(node.right, initialScope)
            if (right != null) {
                return right
            }
        }

        return null
    },

    MemberExpression(node, initialScope) {
        if (node.property.type === "PrivateIdentifier") {
            return null
        }
        const object = getStaticValueR(node.object, initialScope)
        if (object != null) {
            if (object.value == null && (object.optional || node.optional)) {
                return { value: undefined, optional: true }
            }
            const property = getStaticPropertyNameValue(node, initialScope)

            if (property != null) {
                if (
                    !isGetter(
                        /** @type {object} */ (object.value),
                        /** @type {PropertyKey} */ (property.value),
                    )
                ) {
                    return {
                        value: /** @type {Record<PropertyKey, unknown>} */ (
                            object.value
                        )[/** @type {PropertyKey} */ (property.value)],
                    }
                }

                for (const [classFn, allowed] of getterAllowed) {
                    if (
                        object.value instanceof classFn &&
                        allowed.has(/** @type {string} */ (property.value))
                    ) {
                        return {
                            value: /** @type {Record<PropertyKey, unknown>} */ (
                                object.value
                            )[/** @type {PropertyKey} */ (property.value)],
                        }
                    }
                }
            }
        }
        return null
    },

    ChainExpression(node, initialScope) {
        const expression = getStaticValueR(node.expression, initialScope)
        if (expression != null) {
            return { value: expression.value }
        }
        return null
    },

    NewExpression(node, initialScope) {
        const callee = getStaticValueR(node.callee, initialScope)
        const args = getElementValues(node.arguments, initialScope)

        if (callee != null && args != null) {
            const Func = /** @type {new (...args: any[]) => any} */ (
                callee.value
            )
            if (callAllowed.has(Func)) {
                return { value: new Func(...args) }
            }
        }

        return null
    },

    ObjectExpression(node, initialScope) {
        /** @type {Record<PropertyKey, unknown>} */
        const object = {}

        for (const propertyNode of node.properties) {
            if (propertyNode.type === "Property") {
                if (propertyNode.kind !== "init") {
                    return null
                }
                const key = getStaticPropertyNameValue(
                    propertyNode,
                    initialScope,
                )
                const value = getStaticValueR(propertyNode.value, initialScope)
                if (key == null || value == null) {
                    return null
                }
                object[/** @type {PropertyKey} */ (key.value)] = value.value
            } else if (
                propertyNode.type === "SpreadElement" ||
                // @ts-expect-error -- Backward compatibility
                propertyNode.type === "ExperimentalSpreadProperty"
            ) {
                const argument = getStaticValueR(
                    propertyNode.argument,
                    initialScope,
                )
                if (argument == null) {
                    return null
                }
                Object.assign(object, argument.value)
            } else {
                return null
            }
        }

        return { value: object }
    },

    SequenceExpression(node, initialScope) {
        const last = node.expressions[node.expressions.length - 1]
        return getStaticValueR(last, initialScope)
    },

    TaggedTemplateExpression(node, initialScope) {
        const tag = getStaticValueR(node.tag, initialScope)
        const expressions = getElementValues(
            node.quasi.expressions,
            initialScope,
        )

        if (tag != null && expressions != null) {
            const func = /** @type {(...args: any[]) => any} */ (tag.value)
            /** @type {any[] & { raw?: string[] }} */
            const strings = node.quasi.quasis.map((q) => q.value.cooked)
            strings.raw = node.quasi.quasis.map((q) => q.value.raw)

            if (func === String.raw) {
                return { value: func(strings, ...expressions) }
            }
        }

        return null
    },

    TemplateLiteral(node, initialScope) {
        const expressions = getElementValues(node.expressions, initialScope)
        if (expressions != null) {
            let value = node.quasis[0].value.cooked
            for (let i = 0; i < expressions.length; ++i) {
                value += expressions[i]
                value += /** @type {string} */ (node.quasis[i + 1].value.cooked)
            }
            return { value }
        }
        return null
    },

    UnaryExpression(node, initialScope) {
        if (node.operator === "delete") {
            // Not supported.
            return null
        }
        if (node.operator === "void") {
            return { value: undefined }
        }

        const arg = getStaticValueR(node.argument, initialScope)
        if (arg != null) {
            switch (node.operator) {
                case "-":
                    return { value: -(/** @type {any} */ (arg.value)) }
                case "+":
                    return { value: +(/** @type {any} */ (arg.value)) } //eslint-disable-line no-implicit-coercion
                case "!":
                    return { value: !arg.value }
                case "~":
                    return { value: ~(/** @type {any} */ (arg.value)) }
                case "typeof":
                    return { value: typeof arg.value }

                // no default
            }
        }

        return null
    },
    TSAsExpression(node, initialScope) {
        return getStaticValueR(node.expression, initialScope)
    },
    TSSatisfiesExpression(node, initialScope) {
        return getStaticValueR(node.expression, initialScope)
    },
    TSTypeAssertion(node, initialScope) {
        return getStaticValueR(node.expression, initialScope)
    },
    TSNonNullExpression(node, initialScope) {
        return getStaticValueR(node.expression, initialScope)
    },
    TSInstantiationExpression(node, initialScope) {
        return getStaticValueR(node.expression, initialScope)
    },
})

/**
 * Get the value of a given node if it's a static value.
 * @param {Node|TSESTreeNode|null|undefined} node The node to get.
 * @param {Scope|undefined|null} initialScope The scope to start finding variable.
 * @returns {StaticValue|null} The static value of the node, or `null`.
 */
function getStaticValueR(node, initialScope) {
    if (node != null && Object.hasOwnProperty.call(operations, node.type)) {
        return /** @type {VisitorCallback<any>} */ (operations[node.type])(
            /** @type {TSESTreeNode} */ (node),
            initialScope,
        )
    }
    return null
}

/**
 * Get the static value of property name from a MemberExpression node or a Property node.
 * @param {MemberExpression|Property} node The node to get.
 * @param {Scope|null} [initialScope] The scope to start finding variable. Optional. If the node is a computed property node and this scope was given, this checks the computed property name by the `getStringIfConstant` function with the scope, and returns the value of it.
 * @returns {StaticValue|null} The static value of the property name of the node, or `null`.
 */
function getStaticPropertyNameValue(node, initialScope) {
    const nameNode = node.type === "Property" ? node.key : node.property

    if (node.computed) {
        return getStaticValueR(nameNode, initialScope)
    }

    if (nameNode.type === "Identifier") {
        return { value: nameNode.name }
    }

    if (nameNode.type === "Literal") {
        if (/** @type {Partial<BigIntLiteral>} */ (nameNode).bigint) {
            return { value: /** @type {BigIntLiteral} */ (nameNode).bigint }
        }
        return { value: String(nameNode.value) }
    }

    return null
}

/**
 * Get the value of a given node if it's a static value.
 * @param {Node} node The node to get.
 * @param {Scope|null} [initialScope] The scope to start finding variable. Optional. If this scope was given, this tries to resolve identifier references which are in the given node as much as possible.
 * @returns {StaticValue | null} The static value of the node, or `null`.
 */
export function getStaticValue(node, initialScope = null) {
    try {
        return getStaticValueR(node, initialScope)
    } catch (_error) {
        return null
    }
}
