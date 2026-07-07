// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import message from 'antd/lib/message';

import { LabelType, ObjectType, ShapeType } from 'cvat-core-wrapper';
import { ActiveControl, CombinedState } from 'reducers';
import { rememberObject, updateAnnotationsAsync } from 'actions/annotation-actions';
import LabelItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/label-item';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import Text from 'antd/lib/typography/Text';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useResetShortcutsOnUnmount } from 'utils/hooks';
import { getCVATStore } from 'cvat-store';

const componentShortcuts: Record<string, KeyMapItem> = {};

const makeKey = (index: number): string => `SWITCH_LABEL_${index}`;
const makeKeyShift = (index: number): string => `SWITCH_LABEL_SHIFT_${index}`;

for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
    componentShortcuts[makeKey(index)] = {
        name: 'Switch label',
        description: 'Change label of a selected object or default label of the next created object if no one object is activated',
        sequences: [`ctrl+${index}`],
        nonActive: true,
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    };
    componentShortcuts[makeKeyShift(index)] = {
        name: 'Switch label (11-20)',
        description: 'Change label of a selected object or default label of the next created object (labels 11-20)',
        sequences: [`ctrl+shift+${index}`],
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
    const keyToLabelMappingShift = Object.fromEntries(
        labelIDs.slice(10, 20).map((labelID: number, idx: number) => [(idx + 1) % 10, labelID]),
    );

    useEffect(() => {
        const updatedComponentShortcuts = JSON.parse(JSON.stringify(componentShortcuts));
        const mappings: [Record<string, number>, (index: number) => string][] = [
            [keyToLabelMapping, makeKey],
            [keyToLabelMappingShift, makeKeyShift],
        ];
        for (const [mapping, keyFactory] of mappings) {
            for (const [index, labelID] of Object.entries(mapping)) {
                if (labelID) {
                    const labelName = labels.find((label: any) => label.id === labelID)?.name;
                    const key = keyFactory(+index);
                    updatedComponentShortcuts[key] = {
                        ...updatedComponentShortcuts[key],
                        nonActive: false,
                        name: `Switch label to ${labelName}`,
                        description: `Changes the label to ${labelName} for the activated
                            object or for the next drawn object if no objects are activated`,
                    };
                }
            }
        }

        registerComponentShortcuts(updatedComponentShortcuts);
    }, [labels]);

    const handleHelper = (event: KeyboardEvent, labelID: number): void => {
        if (event) event.preventDefault();
        const label = labels.find((_label: any) => _label.id === labelID)!;
        if (Number.isInteger(labelID) && label) {
            const relevantAppState = getCVATStore().getState();
            const { states, activatedStateID } = relevantAppState.annotation.annotations;
            const { activeShapeType, activeObjectType } = relevantAppState.annotation.drawing;
            const { showPrivateAttributes } = relevantAppState.settings.workspace;

            // NCP mode: when idle and no annotation is selected, select a label and start drawing
            if (!showPrivateAttributes && !Number.isInteger(activatedStateID)){
                window.dispatchEvent(new CustomEvent('ncp:select-label', { detail: { label } }));
                return;
            }

            if (Number.isInteger(activatedStateID)) {
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
            handleHelper(event, keyToLabelMapping[index]);
        };
        handlers[makeKeyShift(index)] = (event: KeyboardEvent) => {
            handleHelper(event, keyToLabelMappingShift[index]);
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
