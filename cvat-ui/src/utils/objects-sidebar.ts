import { ObjectState } from 'cvat-core-wrapper';

export function getSidebarItemId(state: ObjectState): string {
    const { clientID, parentID } = state as any;

    if (Number.isInteger(parentID)) {
        return `cvat-objects-sidebar-state-item-element-${clientID}`;
    }

    return `cvat-objects-sidebar-state-item-${clientID}`;
}

export function scrollSidebarItemIntoViewById(id: string): void {
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

export function scrollAndExpandByClientID(
    clientID: number,
    annotations: ObjectState[],
    expandObject: (objectState: ObjectState) => void,
): void {
    const objectState = annotations.find((state) => state.clientID === clientID);

    if (!objectState) {
        return;
    }

    scrollAndExpandState(objectState, expandObject);
}
