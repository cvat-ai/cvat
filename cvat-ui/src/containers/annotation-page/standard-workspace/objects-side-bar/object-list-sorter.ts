import { Label } from 'cvat-core/src/labels';
import ObjectState from 'cvat-core/src/object-state';
import { StatesOrdering } from 'reducers';

export interface SortedLabelGroup {
    label: Label;
    objects: ObjectState[];
}

/**
 * Groups objects by label and sorts them within each label group by the specified ordering
 * @param objectStates
 * @param ordering
 * @returns
 */
export function groupAndSort(objectStates: ObjectState[], ordering: StatesOrdering): SortedLabelGroup[] {
    const map = new Map<string, SortedLabelGroup>();
    for (const state of objectStates) {
        let group = map.get(state.label.name);
        if (group) {
            group.objects.push(state);
        } else {
            group = {
                label: state.label,
                objects: [state],
            };
            map.set(state.label.name, group);
        }
    }

    for (const group of map.values()) {
        if (ordering === StatesOrdering.ID_ASCENT) {
            group.objects.sort((a: any, b: any): number => a.clientID - b.clientID);
        } else if (ordering === StatesOrdering.ID_DESCENT) {
            group.objects.sort((a: any, b: any): number => b.clientID - a.clientID);
        } else {
            group.objects.sort((a: any, b: any): number => b.updated - a.updated);
        }
    }

    return Array.from(map.values());
}
