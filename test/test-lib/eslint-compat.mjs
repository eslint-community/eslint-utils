export const getScope = (context, node) =>
    getSourceCode(context).getScope?.(node) ?? context.getScope();

const getSourceCode = (context) =>
    context.sourceCode ?? context.getSourceCode();
