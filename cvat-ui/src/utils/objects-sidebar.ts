import { ObjectState } from 'cvat-core-wrapper';

export const OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT = 'cvat.objects-sidebar.expand-z-layer';
export const OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT = 'cvat.objects-sidebar.open-z-layer';

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
    window.dispatchEvent(new CustomEvent(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, {
        detail: {
            clientID: state.clientID,
            parentID: state.parentID,
        },
    }));
}

export function openZLayerInObjectsSidebar(): void {
    window.dispatchEvent(new CustomEvent(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT));
}
