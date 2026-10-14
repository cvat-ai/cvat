import { ObjectState } from 'cvat-core-wrapper';

export const OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT = 'cvat.objects-sidebar.expand-z-layer';
export const OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT = 'cvat.objects-sidebar.open-z-layer';
export const OBJECTS_SIDEBAR_OPEN_EVENT = 'cvat.objects-sidebar.open';

const objectStateIndexes = new WeakMap<ObjectState[], Map<number, ObjectState>>();

export function getObjectStateByClientID(states: ObjectState[], clientID: number): ObjectState | null {
    let index = objectStateIndexes.get(states);

    if (!index) {
        index = new Map<number, ObjectState>();

        const addState = (state: ObjectState): void => {
            if (typeof state.clientID === 'number') {
                index!.set(state.clientID, state);
            }

            state.elements.forEach(addState);
        };

        states.forEach(addState);
        objectStateIndexes.set(states, index);
    }

    return index.get(clientID) ?? null;
}

export function scrollAndExpandState(
    state: ObjectState,
    expandObject: (objectState: ObjectState) => void,
): void {
    expandObject(state);
    // The virtual list owns mounting, measurement, and scrolling; never scroll a stale DOM row directly.
    window.dispatchEvent(new CustomEvent(OBJECTS_SIDEBAR_OPEN_EVENT));
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
