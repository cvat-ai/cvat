import { Label } from 'cvat-core/src/labels';
import ObjectState from 'cvat-core/src/object-state';
import { StatesOrdering } from 'reducers';

/**
 * Groups objects by label and sorts them within each label group by the specified ordering
 * @param objectStates
 * @param ordering
 * @returns
 */
export function groupAndSort(
    objectStates: ObjectState[],
    ordering: StatesOrdering,
    collapsedLabelStates: Record<number, boolean>,
): (Label | ObjectState)[] {
    const objectsByLabel = new Map<string, ObjectState[]>();
    const labelMap = new Map<string, Label>();
    for (const state of objectStates) {
        const group = objectsByLabel.get(state.label.name);
        if (group) {
            group.push(state);
        } else {
            labelMap.set(state.label.name, state.label);
            if (!collapsedLabelStates[state.label.id ?? 0]) {
                objectsByLabel.set(state.label.name, [state]);
            }
        }
    }

    const labels = Array.from(labelMap.values());
    labels.sort((a, b) => a.name.localeCompare(b.name));

    const result: (Label | ObjectState)[] = [];

    for (const label of labels) {
        const objects: ObjectState[] = objectsByLabel.get(label.name) ?? [];
        if (ordering === StatesOrdering.ID_ASCENT) {
            objects.sort((a: any, b: any): number => a.clientID - b.clientID);
        } else if (ordering === StatesOrdering.ID_DESCENT) {
            objects.sort((a: any, b: any): number => b.clientID - a.clientID);
        } else {
            objects.sort((a: any, b: any): number => b.updated - a.updated);
        }
        result.push(label);
        result.push(...objects);
    }

    return result;
}

export function getRowSize(groupedObjects: (Label | ObjectState)[], collapsedStates: Record<number, boolean>, index: number) {
    const row: Label | ObjectState = groupedObjects[index];
    if (row instanceof Label) {
        return 35;
    }

    const numAttr = Object.entries(row.attributes).length;
    if (numAttr === 0) {
        return 63; // no details at all
    }

    if (collapsedStates[row.clientID ?? 0] === false) {
        return 95 + numAttr * 27.5; // with expanded details
    }
    return 90; // with collapsed details
}
