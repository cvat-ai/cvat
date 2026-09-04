// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import message from 'antd/lib/message';

import {
    LabelType, ObjectState, ObjectType, ShapeType,
} from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import {
    rememberObject, selectObjectsAsync, updateAnnotationsAsync, updateAnnotationsBatchAsync,
} from 'actions/annotation-actions';
import LabelItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/label-item';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import Text from 'antd/lib/typography/Text';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useResetShortcutsOnUnmount } from 'utils/hooks';
import { getCVATStore } from 'cvat-store';
import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import { getSelectedStates, isMultiSelectObjectModifierPressed } from 'utils/multi-selection';
import { filterAnnotations } from 'utils/filter-annotations';
import getHiddenZLayers from 'utils/get-hidden-z-layers';

const INTERACTIVE_ELEMENT_SELECTOR = 'a, button, input, textarea, [role="button"], .ant-select, .anticon';

const componentShortcuts: Record<string, KeyMapItem> = {};

const makeKey = (index: number): string => `SWITCH_LABEL_${index}`;

for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
    componentShortcuts[makeKey(index)] = {
        name: 'Switch label',
        description: 'Change label of selected objects, an activated object, or the next created object',
        sequences: [`ctrl+${index}`],
        nonActive: true,
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    };
}

registerComponentShortcuts(componentShortcuts);

function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();

    const {
        labels, keyMap, objectStates, selectedStatesID, frame, workspace, hiddenZLayers,
    } = useSelector((state: CombinedState) => ({
        labels: state.annotation.job.labels,
        keyMap: state.shortcuts.keyMap,
        objectStates: state.annotation.annotations.states,
        selectedStatesID: state.annotation.annotations.selectedStatesID,
        frame: state.annotation.player.frame.number,
        workspace: state.annotation.workspace,
        hiddenZLayers: getHiddenZLayers(state),
    }), shallowEqual);

    const labelIDs = labels.map((label: any): number => label.id);
    const selectionAnchorLabelID = useRef<number | null>(null);
    const selectedIDs = new Set(selectedStatesID);
    const selectableStates = filterAnnotations(objectStates, { frame, workspace }).filter(
        (state: ObjectState): boolean => (
            [ObjectType.SHAPE, ObjectType.TRACK].includes(state.objectType) &&
            !state.outside && !state.hidden && !hiddenZLayers.has(state.zOrder)
        ),
    );
    const selectableIDsByLabel = Object.fromEntries(labelIDs.map((labelID: number) => [
        labelID,
        selectableStates
            .filter((state: ObjectState): boolean => state.label.id === labelID)
            .map((state: ObjectState): number => state.clientID as number),
    ])) as Record<number, number[]>;

    useResetShortcutsOnUnmount(componentShortcuts);

    const keyToLabelMapping = Object.fromEntries(
        labelIDs.slice(0, 10).map((labelID: number, idx: number) => [(idx + 1) % 10, labelID]),
    );

    useEffect(() => {
        const updatedComponentShortcuts = Object.keys(componentShortcuts).reduce<Record<string, KeyMapItem>>(
            (shortcuts, key) => ({
                ...shortcuts,
                [key]: {
                    ...componentShortcuts[key],
                    sequences: keyMap[key]?.sequences ?? componentShortcuts[key].sequences,
                },
            }),
            {},
        );
        for (const [index, labelID] of Object.entries(keyToLabelMapping)) {
            if (labelID) {
                const labelName = labels.find((label: any) => label.id === labelID)?.name;
                const key = makeKey(+index);
                updatedComponentShortcuts[key] = {
                    ...updatedComponentShortcuts[key],
                    nonActive: false,
                    name: `Switch label to ${labelName}`,
                    description: `Changes the label to ${labelName} for selected objects, the activated
                        object, or the next drawn object if no objects are selected or activated`,
                };
            }
        }

        registerComponentShortcuts(updatedComponentShortcuts);
    }, [labels]);

    const handleHelper = (event: KeyboardEvent, index: number): void => {
        if (event) event.preventDefault();
        const labelID = keyToLabelMapping[index];
        const label = labels.find((_label: any) => _label.id === labelID)!;
        if (Number.isInteger(labelID) && label) {
            const relevantAppState = getCVATStore().getState();
            const {
                states, activatedStateID, selectedStatesID: currentSelectedStatesID,
            } = relevantAppState.annotation.annotations;
            const { activeShapeType, activeObjectType } = relevantAppState.annotation.drawing;

            if (currentSelectedStatesID.length) {
                const selectedStates = getSelectedStates(states, currentSelectedStatesID);
                const labelIsApplicable = selectedStates.length === currentSelectedStatesID.length &&
                    selectedStates.every(
                        (state: ObjectState): boolean => (
                            !state.lock && !state.isGroundTruth && state.shapeType !== ShapeType.SKELETON &&
                            filterApplicableLabels(state, labels).some((_label): boolean => _label.id === label.id)
                        ),
                    );

                if (!labelIsApplicable) {
                    message.destroy();
                    message.warning(`Label "${label.name}" cannot be applied to every selected object`);
                    return;
                }

                const statesToUpdate = selectedStates.filter(
                    (state: ObjectState): boolean => state.label.id !== label.id,
                );
                for (const selectedState of statesToUpdate) {
                    selectedState.label = label;
                }
                if (statesToUpdate.length) {
                    dispatch(updateAnnotationsBatchAsync(statesToUpdate));
                }
            } else if (Number.isInteger(activatedStateID)) {
                const activatedState = states.filter((state: any) => state.clientID === activatedStateID)[0];
                const bothAreTags = activatedState.objectType === ObjectType.TAG && label.type === LabelType.TAG;
                const labelIsApplicable = label.type === LabelType.ANY ||
                    (activatedState.shapeType === label.type && activatedState.shapeType !== ShapeType.SKELETON) ||
                    bothAreTags;
                if (activatedState && labelIsApplicable) {
                    activatedState.label = label;
                    dispatch(updateAnnotationsAsync([activatedState]));
                }
            } else {
                if (label.type === LabelType.TAG) {
                    dispatch(rememberObject({ activeLabelID: labelID, activeObjectType: ObjectType.TAG }, false));
                } else if (label.type === LabelType.MASK) {
                    dispatch(rememberObject({
                        activeLabelID: labelID,
                        activeObjectType: ObjectType.SHAPE,
                        activeShapeType: ShapeType.MASK,
                    }, false));
                } else {
                    dispatch(rememberObject({
                        activeLabelID: labelID,
                        activeObjectType: activeObjectType !== ObjectType.TAG ? activeObjectType : ObjectType.SHAPE,
                        activeShapeType: label.type === LabelType.ANY && activeShapeType !== ShapeType.SKELETON ?
                            activeShapeType : label.type as unknown as ShapeType,
                    }, false));
                }

                message.destroy();
                message.success(`Default label has been changed to "${label.name}"`);
            }
        }
    };

    const handlers: Record<keyof typeof componentShortcuts, (event: KeyboardEvent, shortcut: string) => void> = {};

    for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        handlers[makeKey(index)] = (event: KeyboardEvent) => {
            handleHelper(event, index);
        };
    }

    const selectLabels = (event: React.MouseEvent, labelID: number): void => {
        if (event.button !== 0 || (event.target as Element).closest(INTERACTIVE_ELEMENT_SELECTOR)) {
            return;
        }

        let affectedLabelIDs: number[] = [];
        if (event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            const anchorIndex = selectionAnchorLabelID.current === null ?
                -1 : labelIDs.indexOf(selectionAnchorLabelID.current);
            const currentIndex = labelIDs.indexOf(labelID);
            affectedLabelIDs = anchorIndex === -1 ? [labelID] : labelIDs.slice(
                Math.min(anchorIndex, currentIndex),
                Math.max(anchorIndex, currentIndex) + 1,
            );
        } else if (isMultiSelectObjectModifierPressed(event, keyMap)) {
            affectedLabelIDs = [labelID];
        } else {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        selectionAnchorLabelID.current = labelID;
        const affectedIDs = affectedLabelIDs.flatMap((id: number): number[] => selectableIDsByLabel[id]);
        const remove = affectedLabelIDs.length === 1 && affectedIDs.length > 0 &&
            affectedIDs.every((clientID: number): boolean => selectedIDs.has(clientID));
        const nextSelection = remove ?
            selectedStatesID.filter((clientID: number): boolean => !affectedIDs.includes(clientID)) :
            [...new Set([...selectedStatesID, ...affectedIDs])];
        dispatch(selectObjectsAsync(nextSelection));
    };
    const suppressModifierContextMenu = (event: React.MouseEvent): void => {
        if (isMultiSelectObjectModifierPressed(event, keyMap) &&
            !(event.target as Element).closest(INTERACTIVE_ELEMENT_SELECTOR)) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    return (
        <div className='cvat-objects-sidebar-labels-list'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <div className='cvat-objects-sidebar-labels-list-header'>
                <Text>{`Items: ${labels.length}`}</Text>
            </div>
            {labelIDs.map(
                (labelID: number): JSX.Element => (
                    <LabelItemContainer
                        key={labelID}
                        labelID={labelID}
                        multiSelected={!!selectableIDsByLabel[labelID].length &&
                            selectableIDsByLabel[labelID].every((clientID: number): boolean => (
                                selectedIDs.has(clientID)
                            ))}
                        onMouseDown={(event: React.MouseEvent): void => selectLabels(event, labelID)}
                        onContextMenu={suppressModifierContextMenu}
                    />
                ),
            )}
        </div>
    );
}

export default React.memo(LabelsListComponent);
