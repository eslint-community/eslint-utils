import type * as ESTree from "estree"
export function getParent(node: ESTree.Node): ESTree.Node | null {
    // eslint-disable-next-line @eslint-community/mysticatea/ts/no-unsafe-member-access
    return (node as any).parent as ESTree.Node | null
}
