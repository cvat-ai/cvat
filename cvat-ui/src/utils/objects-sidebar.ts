import { ObjectState } from 'cvat-core-wrapper';

function getSidebarItemId(state: ObjectState): string {
    const { clientID, parentID } = state as any;

    if (Number.isInteger(parentID)) {
        return `cvat-objects-sidebar-state-item-element-${clientID}`;
    }

    return `cvat-objects-sidebar-state-item-${clientID}`;
}

function scrollSidebarItemIntoViewById(id: string): void {
    const sidebarItem = window.document.getElementById(id);

    if (sidebarItem) {
        sidebarItem.scrollIntoView();
    }
}

export function scrollAndExpandState(
    state: ObjectState,
    expandObject: (objectState: ObjectState) => void,
): void {
    const sidebarItemId = getSidebarItemId(state);
    scrollSidebarItemIntoViewById(sidebarItemId);
    expandObject(state);
}
