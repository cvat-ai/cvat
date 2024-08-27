// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import message from 'antd/lib/message';

import { LabelType } from 'cvat-core-wrapper';
import { CombinedState, ObjectType } from 'reducers';
import { rememberObject, updateAnnotationsAsync } from 'actions/annotation-actions';
import LabelItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/label-item';
import GlobalHotKeys, { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import Text from 'antd/lib/typography/Text';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useResetShortcutsOnUnmount } from 'utils/hooks';

const componentShortcuts: Record<string, KeyMapItem> = {};

for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
    componentShortcuts[`SWITCH_LABEL_${i}`] = {
        name: 'Switch label',
        description: 'Change label of a selected object or default label of the next created object if no one object is activated',
        sequences: [`ctrl+${i}`],
        nonActive: true,
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    };
}

registerComponentShortcuts(componentShortcuts);

function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const activatedStateID = useSelector((state: CombinedState) => state.annotation.annotations.activatedStateID);
    const activeShapeType = useSelector((state: CombinedState) => state.annotation.drawing.activeShapeType);
    const activeObjectType = useSelector((state: CombinedState) => state.annotation.drawing.activeObjectType);
    const states = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const labelIDs = labels.map((label: any): number => label.id);
    const [keyToLabelMapping, setKeyToLabelMapping] = useState<Record<string, number>>(
        Object.fromEntries(labelIDs.slice(0, 10).map((labelID: number, idx: number) => [(idx + 1) % 10, labelID])),
    );

    useResetShortcutsOnUnmount(componentShortcuts);

    useEffect(() => {
        const updatedComponentShortcuts = Object.keys(componentShortcuts).reduce((acc: KeyMap, key: string) => {
            acc[key] = {
                ...componentShortcuts[key],
                sequences: keyMap[key].sequences,
            };
            return acc;
        }, {});

        for (const [id, labelID] of Object.entries(keyToLabelMapping)) {
            if (labelID) {
                const labelName = labels.find((label: any) => label.id === labelID)?.name;
                updatedComponentShortcuts[`SWITCH_LABEL_${id}`] = {
                    ...updatedComponentShortcuts[`SWITCH_LABEL_${id}`],
                    nonActive: false,
                    name: `Switch label to ${labelName}`,
                    description: `Changes the label to ${labelName} for the activated
                object or for the next drawn object if no objects are activated`,
                };
            }
        }

        registerComponentShortcuts(updatedComponentShortcuts);
    }, [keyToLabelMapping]);

    const updateLabelShortcutKey = useCallback(
        (key: string, labelID: number) => {
            // unassign any keys assigned to the current labels
            const keyToLabelMappingCopy = { ...keyToLabelMapping };
            for (const shortKey of Object.keys(keyToLabelMappingCopy)) {
                if (keyToLabelMappingCopy[shortKey] === labelID) {
                    delete keyToLabelMappingCopy[shortKey];
                }
            }

            if (key === '—') {
                setKeyToLabelMapping(keyToLabelMappingCopy);
                return;
            }

            // check if this key is assigned to another label
            if (key in keyToLabelMappingCopy) {
                // try to find a new key for the other label
                for (let i = 0; i < 10; i++) {
                    const adjustedI = (i + 1) % 10;
                    if (!(adjustedI in keyToLabelMappingCopy)) {
                        keyToLabelMappingCopy[adjustedI] = keyToLabelMappingCopy[key];
                        break;
                    }
                }
                // delete assigning to the other label
                delete keyToLabelMappingCopy[key];
            }

            // assigning to the current label
            keyToLabelMappingCopy[key] = labelID;
            setKeyToLabelMapping(keyToLabelMappingCopy);
        },
        [keyToLabelMapping],
    );

    const handleHelper = (event: KeyboardEvent, i: number): void => {
        if (event) event.preventDefault();
        const labelID = keyToLabelMapping[i];
        const label = labels.find((_label: any) => _label.id === labelID)!;
        if (Number.isInteger(labelID) && label && Number.isInteger(activatedStateID)) {
            const activatedState = states.filter((state: any) => state.clientID === activatedStateID)[0];
            const bothAreTags = activatedState.objectType === ObjectType.TAG && label.type === ObjectType.TAG;
            const labelIsApplicable = label.type === LabelType.ANY ||
                activatedState.shapeType === label.type || bothAreTags;
            if (activatedState && labelIsApplicable) {
                activatedState.label = label;
                dispatch(updateAnnotationsAsync([activatedState]));
            }
        } else {
            const bothAreTags = activeObjectType === ObjectType.TAG && label.type === ObjectType.TAG;
            const labelIsApplicable = label.type === LabelType.ANY ||
                activeShapeType === label.type || bothAreTags;
            if (labelIsApplicable) {
                dispatch(rememberObject({ activeLabelID: labelID }));
                message.destroy();
                message.success(`Default label has been changed to "${label.name}"`);
            }
        }
    };

    const handlers: Record<keyof typeof componentShortcuts, (event: KeyboardEvent, shortcut: string) => void> = {};

    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        handlers[`SWITCH_LABEL_${i}`] = (event: KeyboardEvent) => {
            handleHelper(event, i);
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
                    <LabelItemContainer
                        key={labelID}
                        labelID={labelID}
                        keyToLabelMapping={keyToLabelMapping}
                        updateLabelShortcutKey={updateLabelShortcutKey}
                    />
                ),
            )}
        </div>
    );
}

export default React.memo(LabelsListComponent);
