// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import message from 'antd/lib/message';

import { LabelType, ObjectType, ShapeType } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
import {
    rememberObject, updateAnnotationsAsync, updateAnnotationsBatchAsync,
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

    const { labels, keyMap } = useSelector((state: CombinedState) => ({
        labels: state.annotation.job.labels,
        keyMap: state.shortcuts.keyMap,
    }), shallowEqual);

    const labelIDs = labels.map((label: any): number => label.id);

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
                states, activatedStateID, selectedStatesID,
            } = relevantAppState.annotation.annotations;
            const { activeShapeType, activeObjectType } = relevantAppState.annotation.drawing;

            if (selectedStatesID.length) {
                const selectedIDs = new Set(selectedStatesID);
                const selectedStates = states.filter((state: any): boolean => selectedIDs.has(state.clientID));
                const labelIsApplicable = selectedStates.length === selectedStatesID.length && selectedStates.every(
                    (state: any): boolean => (
                        !state.lock && !state.isGroundTruth &&
                        state.objectType !== ObjectType.TAG && state.shapeType !== ShapeType.SKELETON &&
                        filterApplicableLabels(state, labels).some((_label): boolean => _label.id === label.id)
                    ),
                );

                if (!labelIsApplicable) {
                    message.destroy();
                    message.warning(`Label "${label.name}" cannot be applied to every selected object`);
                    return;
                }

                const statesToUpdate = selectedStates.filter((state: any): boolean => state.label.id !== label.id);
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

    return (
        <div className='cvat-objects-sidebar-labels-list'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <div className='cvat-objects-sidebar-labels-list-header'>
                <Text>{`Items: ${labels.length}`}</Text>
            </div>
            {labelIDs.map(
                (labelID: number): JSX.Element => (
                    <LabelItemContainer key={labelID} labelID={labelID} />
                ),
            )}
        </div>
    );
}

export default React.memo(LabelsListComponent);
