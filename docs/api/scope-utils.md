# Scope analysis utilities

## findVariable

```js
const variable = utils.findVariable(initialScope, name)
```

Get the variable of a given name.

### Parameters

| Name         | Type           | Description                                                |
| :----------- | :------------- | :--------------------------------------------------------- |
| initialScope | Scope          | The scope object to start finding variables.               |
| name         | string or Node | The variable name to find. This can be an Identifier node. |

### Return value

The found variable or `null`.

### Example

```js{8}
const { findVariable } = require("@eslint-community/eslint-utils")

module.exports = {
    meta: {},
    create(context) {
        return {
            Identifier(node) {
                const variable = findVariable(context.sourceCode.getScope(node), node)
                // When using ESLint<8.37.0, write as follows:
                // const variable = findVariable(context.getScope(), node)
            },
        }
    },
}
```

## getInnermostScope

```js
const scope = utils.getInnermostScope(initialScope, node)
```

Get the innermost scope which contains a given node.

### Parameters

| Name         | Type  | Description                           |
| :----------- | :---- | :------------------------------------ |
| initialScope | Scope | The scope to start finding.           |
| node         | Node  | The node to find the innermost scope. |

### Return value

The innermost scope which contains the given node.
If such scope doesn't exist then it returns the 1st argument `initialScope`.

### Example

```js{9}
const { getInnermostScope } = require("@eslint-community/eslint-utils")

module.exports = {
    meta: {},
    create(context) {
        return {
            "Program"(node) {
                const globalScope = context.sourceCode.getScope(node)
                // When using ESLint<8.37.0, write as follows:
                // const globalScope = context.getScope()
                const maybeNodejsScope = getInnermostScope(globalScope, node)
            },
        }
    },
}
```

## ReferenceTracker class

```js
const tracker = new utils.ReferenceTracker(globalScope, options)
```

The tracker for references.
This provides reference tracking for global variables, CommonJS modules, and ES modules.

### Parameters

| Name                      | Type                     | Description                                                                                                                                                                                                                                                                                                   |
| :------------------------ | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| globalScope               | Scope                    | The global scope.                                                                                                                                                                                                                                                                                             |
| options.mode              | `"strict"` or `"legacy"` | The mode which determines how the `tracker.iterateEsmReferences()` method scans CommonJS modules. If this is `"strict"`, the method binds CommonJS modules to the default export. Otherwise, the method binds CommonJS modules to both the default export and named exports. Optional. Default is `"strict"`. |
| options.globalObjectNames | string[]                 | The name list of Global Object. Optional. Default is `["global", "globalThis", "self", "window"]`.                                                                                                                                                                                                            |

## tracker.iterateGlobalReferences

```js
const it = tracker.iterateGlobalReferences(traceMap)
```

Iterate the references that the given `traceMap` determined.
This method starts to search from global variables.

### Parameters

| Name     | Type   | Description                                                              |
| :------- | :----- | :----------------------------------------------------------------------- |
| traceMap | object | The object which determines global variables and properties it iterates. |

### Return value

The Iterator which iterates the reference of global variables.
Every reference is the object that has the following properties.

| Name  | Type     | Description                                                                                                                                                                                                                                                                              |
| :---- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| node  | Node     | The node of the reference.                                                                                                                                                                                                                                                               |
| path  | string[] | The path of the reference. For example, if it's the access of `console.log` then `["console", "log"]`.                                                                                                                                                                                   |
| type  | symbol   | The reference type. If this is `ReferenceTracker.READ` then it read the variable (or property). If this is `ReferenceTracker.CALL` then it called the variable (or property). If this is `ReferenceTracker.CONSTRUCT` then it called the variable (or property) with the `new` operator. |
| entry | any      | The property value of any of `ReferenceTracker.READ`, `ReferenceTracker.CALL`, and `ReferenceTracker.CONSTRUCT`.                                                                                                                                                                         |

### Examples

```js
const { ReferenceTracker } = require("@eslint-community/eslint-utils")

module.exports = {
    meta: {},
    create(context) {
        return {
            "Program:exit"() {
                const tracker = new ReferenceTracker(
                    context.sourceCode.getScope(context.sourceCode.ast),
                )
                // When using ESLint<8.37.0, write as follows:
                // const tracker = new ReferenceTracker(context.getScope())

                const traceMap = {
                    // Find `console.log`, `console.info`, `console.warn`, and `console.error`.
                    console: {
                        log: { [ReferenceTracker.READ]: true },
                        info: { [ReferenceTracker.READ]: true },
                        warn: { [ReferenceTracker.READ]: true },
                        error: { [ReferenceTracker.READ]: true },
                    },
                    // Find `Buffer()` and `new Buffer()`.
                    Buffer: {
                        [ReferenceTracker.CALL]: true,
                        [ReferenceTracker.CONSTRUCT]: true,
                    },
                }

                for (const { node, path } of tracker.iterateGlobalReferences(
                    traceMap,
                )) {
                    context.report({
                        node,
                        message: "disallow {{name}}.",
                        data: { name: path.join(".") },
                    })
                }
            },
        }
    },
}
```

## tracker.iterateCjsReferences

```js
const it = tracker.iterateCjsReferences(traceMap)
```

Iterate the references that the given `traceMap` determined.
This method starts to search from `require()` expression.

### Parameters

| Name     | Type   | Description                                      |
| :------- | :----- | :----------------------------------------------- |
| traceMap | object | The object which determines modules it iterates. |

### Return value

The Iterator which iterates the reference of modules.
Every reference is the object that has the following properties.

| Name  | Type     | Description                                                                                                                                                                                                                                                                              |
| :---- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| node  | Node     | The node of the reference.                                                                                                                                                                                                                                                               |
| path  | string[] | The path of the reference. For example, if it's the access of `fs.exists` then `["fs", "exists"]`.                                                                                                                                                                                       |
| type  | symbol   | The reference type. If this is `ReferenceTracker.READ` then it read the variable (or property). If this is `ReferenceTracker.CALL` then it called the variable (or property). If this is `ReferenceTracker.CONSTRUCT` then it called the variable (or property) with the `new` operator. |
| entry | any      | The property value of any of `ReferenceTracker.READ`, `ReferenceTracker.CALL`, and `ReferenceTracker.CONSTRUCT`.                                                                                                                                                                         |

### Examples

```js
const { ReferenceTracker } = require("@eslint-community/eslint-utils")

module.exports = {
    meta: {},
    create(context) {
        return {
            "Program:exit"() {
                const tracker = new ReferenceTracker(
                    context.sourceCode.getScope(context.sourceCode.ast),
                )
                // When using ESLint<8.37.0, write as follows:
                // const tracker = new ReferenceTracker(context.getScope())

                const traceMap = {
                    // Find `Buffer()` and `new Buffer()` of `buffer` module.
                    buffer: {
                        Buffer: {
                            [ReferenceTracker.CALL]: true,
                            [ReferenceTracker.CONSTRUCT]: true,
                        },
                    },
                    // Find `exists` of `fs` module.
                    fs: {
                        exists: {
                            [ReferenceTracker.READ]: true,
                        },
                    },
                }

                for (const { node, path } of tracker.iterateCjsReferences(
                    traceMap,
                )) {
                    context.report({
                        node,
                        message: "disallow {{name}}.",
                        data: { name: path.join(".") },
                    })
                }
            },
        }
    },
}
```

## tracker.iterateEsmReferences

```js
const it = tracker.iterateEsmReferences(traceMap)
```

Iterate the references that the given `traceMap` determined.
This method starts to search from `import`/`export` declarations.

### Parameters

| Name     | Type   | Description                                      |
| :------- | :----- | :----------------------------------------------- |
| traceMap | object | The object which determines modules it iterates. |

### Return value

The Iterator which iterates the reference of modules.
Every reference is the object that has the following properties.

| Name  | Type     | Description                                                                                                                                                                                                                                                                              |
| :---- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| node  | Node     | The node of the reference.                                                                                                                                                                                                                                                               |
| path  | string[] | The path of the reference. For example, if it's the access of `fs.exists` then `["fs", "exists"]`.                                                                                                                                                                                       |
| type  | symbol   | The reference type. If this is `ReferenceTracker.READ` then it read the variable (or property). If this is `ReferenceTracker.CALL` then it called the variable (or property). If this is `ReferenceTracker.CONSTRUCT` then it called the variable (or property) with the `new` operator. |
| entry | any      | The property value of any of `ReferenceTracker.READ`, `ReferenceTracker.CALL`, and `ReferenceTracker.CONSTRUCT`.                                                                                                                                                                         |

### Examples

```js
const { ReferenceTracker } = require("@eslint-community/eslint-utils")

module.exports = {
    meta: {},
    create(context) {
        return {
            "Program:exit"() {
                const tracker = new ReferenceTracker(
                    context.sourceCode.getScope(context.sourceCode.ast),
                )
                // When using ESLint<8.37.0, write as follows:
                // const tracker = new ReferenceTracker(context.getScope())

                const traceMap = {
                    // Find `Buffer()` and `new Buffer()` of `buffer` module.
                    buffer: {
                        Buffer: {
                            [ReferenceTracker.CALL]: true,
                            [ReferenceTracker.CONSTRUCT]: true,
                        },
                    },
                    // Find `exists` of `fs` module.
                    fs: {
                        exists: {
                            [ReferenceTracker.READ]: true,
                        },
                    },
                }

                for (const { node, path } of tracker.iterateEsmReferences(
                    traceMap,
                )) {
                    context.report({
                        node,
                        message: "disallow {{name}}.",
                        data: { name: path.join(".") },
                    })
                }
            },
        }
    },
}
```

## tracker.iteratePropertyReferences

```js
const it = tracker.iteratePropertyReferences(node, traceMap)
```

Iterate the property references of the given node that the given `traceMap` determined.
This method starts to search from the given expression node.

### Parameters

| Name     | Type   | Description                                         |
| :------- | :----- | :-------------------------------------------------- |
| node     | object | The expression node.                                |
| traceMap | object | The object which determines properties it iterates. |

### Return value

The Iterator which iterates the reference of properties.
Every reference is the object that has the following properties.

| Name  | Type     | Description                                                                                                                                                                                                                                                                              |
| :---- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| node  | Node     | The node of the reference.                                                                                                                                                                                                                                                               |
| path  | string[] | The path of the reference. For example, if it's the access of `x.length` then `["length"]`.                                                                                                                                                                                              |
| type  | symbol   | The reference type. If this is `ReferenceTracker.READ` then it read the variable (or property). If this is `ReferenceTracker.CALL` then it called the variable (or property). If this is `ReferenceTracker.CONSTRUCT` then it called the variable (or property) with the `new` operator. |
| entry | any      | The property value of any of `ReferenceTracker.READ`, `ReferenceTracker.CALL`, and `ReferenceTracker.CONSTRUCT`.                                                                                                                                                                         |

### Examples

```js
const { ReferenceTracker } = require("@eslint-community/eslint-utils")

module.exports = {
    meta: {},
    create(context) {
        return {
            "MetaProperty:exit"(node) {
                if (
                    node.meta.name !== "import" ||
                    node.property.name !== "meta"
                ) {
                    return
                }
                const tracker = new ReferenceTracker(
                    context.sourceCode.getScope(context.sourceCode.ast),
                )

                const traceMap = {
                    // Find `import.meta.resolve()`.
                    resolve: {
                        [ReferenceTracker.CALL]: true,
                    },
                    // Find `import.meta.dirname`.
                    dirname: {
                        [ReferenceTracker.READ]: true,
                    },
                    // Find `import.meta.filename`.
                    filename: {
                        [ReferenceTracker.READ]: true,
                    },
                }

                for (const { node, path } of tracker.iteratePropertyReferences(
                    node,
                    traceMap,
                )) {
                    context.report({
                        node,
                        message: "disallow {{name}}.",
                        data: { name: "import.meta." + path.join(".") },
                    })
                }
            },
        }
    },
}
```
