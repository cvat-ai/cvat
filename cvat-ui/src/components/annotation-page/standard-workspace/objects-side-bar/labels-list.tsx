// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import message from 'antd/lib/message';

import { LabelType } from 'cvat-core-wrapper';
import { CombinedState, ObjectType } from 'reducers';
import { rememberObject, updateAnnotationsAsync } from 'actions/annotation-actions';
import LabelItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/label-item';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import Text from 'antd/lib/typography/Text';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';

const componentShortcuts: Record<string, KeyMapItem> = {
    SWITCH_LABEL_1: {
        name: 'Switch label 1',
        description: 'Changes the label to label 1 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+1'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_2: {
        name: 'Switch label 2',
        description: 'Changes the label to label 2 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+2'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_3: {
        name: 'Switch label 3',
        description: 'Changes the label to label 3 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+3'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_4: {
        name: 'Switch label 4',
        description: 'Changes the label to label 4 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+4'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_5: {
        name: 'Switch label 5',
        description: 'Changes the label to label 5 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+5'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_6: {
        name: 'Switch label 6',
        description: 'Changes the label to label 6 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+6'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_7: {
        name: 'Switch label 7',
        description: 'Changes the label to label 7 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+7'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_8: {
        name: 'Switch label 8',
        description: 'Changes the label to label 8 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+8'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_9: {
        name: 'Switch label 9',
        description: 'Changes a label for object 9 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+9'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
    SWITCH_LABEL_0: {
        name: 'Switch label 0',
        description: 'Changes the label to label 0 for the activated object or for the next drawn object if no objects are activated',
        sequences: ['ctrl+0'],
        scope: ShortcutScope.OBJECTS_SIDE_BAR,
    },
};

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
    const keyMapRef = useRef(keyMap);

    useEffect(() => () => {
        const revertedShortcuts = Object.entries(componentShortcuts).reduce((acc: any, [key, value]) => {
            acc[key] = {
                ...value,
                sequences: keyMapRef.current[key] ? keyMapRef.current[key].sequences : value.sequences,
            };
            return acc;
        }, {});
        registerComponentShortcuts(revertedShortcuts);
    }, []);

    useEffect(() => {
        keyMapRef.current = keyMap;
    }, [keyMap]);

    useEffect(() => {
        const updatedComponentShortcuts = {
            ...Object.keys(componentShortcuts).reduce((acc: any, key) => {
                if (keyMap[key]) {
                    acc[key] = {
                        ...componentShortcuts[key],
                        sequences: keyMap[key].sequences,
                    };
                }
                return acc;
            }, {}),
        };

        for (const [id, labelID] of Object.entries(keyToLabelMapping)) {
            if (labelID) {
                updatedComponentShortcuts[`SWITCH_LABEL_${id}`] = {
                    ...updatedComponentShortcuts[`SWITCH_LABEL_${id}`],
                    name: `Switch label to ${labels.filter((label: any) => label.id === labelID)[0].name}`,
                    description: `Changes the label to ${
                        labels.filter((label: any) => label.id === labelID)[0].name
                    } for the activated object or for the next drawn object if no objects are activated`,
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

    const handleHelper = (labelID: number): void => {
        if (Number.isInteger(activatedStateID)) {
            const activatedState = states.filter((state: any) => state.clientID === activatedStateID)[0];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            const bothAreTags = activatedState.objectType === ObjectType.TAG && label.type === ObjectType.TAG;
            const labelIsApplicable = label.type === LabelType.ANY ||
                activatedState.shapeType === label.type || bothAreTags;
            if (activatedState && labelIsApplicable) {
                activatedState.label = label;
                dispatch(updateAnnotationsAsync([activatedState]));
            }
        } else {
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
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

    const handlers: Record<keyof typeof componentShortcuts, (event: KeyboardEvent, shortcut: string) => void> = {
        SWITCH_LABEL_1: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[1];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_2: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[2];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_3: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[3];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_4: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[4];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_5: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[5];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_6: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[6];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_7: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[7];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_8: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[8];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_9: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[9];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
        SWITCH_LABEL_0: (event: KeyboardEvent) => {
            if (event) event.preventDefault();
            const labelID = keyToLabelMapping[0];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                handleHelper(labelID);
            }
        },
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
                        keyToLabelMapping={keyToLabelMapping}
                        updateLabelShortcutKey={updateLabelShortcutKey}
                    />
                ),
            )}
        </div>
    );
}

export default React.memo(LabelsListComponent);
