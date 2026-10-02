import { ObjectState } from 'cvat-core-wrapper';

export const OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT = 'cvat.objects-sidebar.expand-z-layer';
export const OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT = 'cvat.objects-sidebar.open-z-layer';

const objectStateIndexes = new WeakMap<ObjectState[], Map<number, ObjectState>>();

export function getObjectStateByClientID(states: ObjectState[], clientID: number): ObjectState | null {
    let index = objectStateIndexes.get(states);

    if (!index) {
        index = new Map<number, ObjectState>();

        const addState = (state: ObjectState): void => {
            if (typeof state.clientID === 'number') {
                index?.set(state.clientID, state);
            }

            state.elements.forEach(addState);
        };

        states.forEach(addState);
        objectStateIndexes.set(states, index);
    }

    return index.get(clientID) || null;
}

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
