// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import { Label } from 'cvat-core-wrapper';
import GlobalHotKeys, { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import { useResetShortcutsOnUnmount } from 'utils/hooks';

interface ShortcutLabelMap {
    [index: number]: any;
}

type Props = {
    onShortcutPress(labelID: number): void;
    labels: Label[];
};

const componentShortcuts: Record<string, KeyMapItem> = {};

const makeKey = (slot: number): string => `SETUP_${slot}_TAG`;

const shortcutSlots: Array<{ slot: number; sequence: string; displayedSequence?: string }> = [
    { slot: 1, sequence: '1' },
    { slot: 2, sequence: '2' },
    { slot: 3, sequence: '3' },
    { slot: 4, sequence: '4' },
    { slot: 5, sequence: '5' },
    { slot: 6, sequence: '6' },
    { slot: 7, sequence: '7' },
    { slot: 8, sequence: '8' },
    { slot: 9, sequence: '9' },
    { slot: 0, sequence: '0' },
    { slot: 10, sequence: 'alt+q' },
    { slot: 11, sequence: 'alt+w' },
    // On most layouts "~" is Shift+Backquote
    { slot: 12, sequence: 'ctrl+shift+`', displayedSequence: 'ctrl+~' },
];

for (const { slot, sequence, displayedSequence } of shortcutSlots) {
    componentShortcuts[makeKey(slot)] = {
        name: 'Create a new tag',
        description: 'Create a new tag with corresponding class. The class may be setup in tag annotation sidebar',
        sequences: [sequence],
        ...(displayedSequence ? { displayedSequences: [displayedSequence] } : {}),
        nonActive: true,
        scope: ShortcutScope.TAG_ANNOTATION_WORKSPACE,
    };
}

registerComponentShortcuts(componentShortcuts);

const defaultShortcutLabelMap = {
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
    7: '',
    8: '',
    9: '',
    0: '',
    10: '',
    11: '',
    12: '',
} as ShortcutLabelMap;

function ShortcutsSelect(props: Props): JSX.Element {
    const { labels, onShortcutPress } = props;
    const [shortcutLabelMap, setShortcutLabelMap] = useState(defaultShortcutLabelMap);

    const keyMap: KeyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const handlers: {
        [key: string]: (keyEvent?: KeyboardEvent) => void;
    } = {};

    useEffect(() => {
        const newShortcutLabelMap = { ...shortcutLabelMap };
        (labels as any[]).slice(0, shortcutSlots.length).forEach((label, index) => {
            newShortcutLabelMap[shortcutSlots[index].slot] = label.id;
        });
        setShortcutLabelMap(newShortcutLabelMap);
    }, []);

    useResetShortcutsOnUnmount(componentShortcuts);

    useEffect(() => {
        const updatedComponentShortcuts = Object.keys(componentShortcuts).reduce((acc: KeyMap, key: string) => {
            acc[key] = {
                ...componentShortcuts[key],
                sequences: keyMap[key].sequences,
            };
            return acc;
        }, {});

        for (const [id, labelID] of Object.entries(shortcutLabelMap)) {
            if (labelID) {
                const [label] = labels.filter((_label) => _label.id === labelID);
                const key = makeKey(Number.parseInt(id, 10));
                updatedComponentShortcuts[key] = {
                    ...updatedComponentShortcuts[key],
                    nonActive: false,
                    name: `Create a new tag "${label.name}"`,
                    description: `Create a new tag having class "${label.name}"`,
                };
            }
        }

        registerComponentShortcuts(updatedComponentShortcuts);
    }, [shortcutLabelMap]);

    Object.keys(shortcutLabelMap)
        .map((idx: string) => Number.parseInt(idx, 10))
        .filter((idx: number) => shortcutLabelMap[idx])
        .forEach((idx: number): void => {
            const [label] = labels.filter((_label) => _label.id === shortcutLabelMap[idx]);
            const key = makeKey(idx);
            handlers[key] = (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }
                onShortcutPress(label.id!);
            };
        });

    const onChangeShortcutLabel = (value: string, id: number): void => {
        const newShortcutLabelMap = { ...shortcutLabelMap };
        newShortcutLabelMap[id] = value ? Number.parseInt(value, 10) : '';
        setShortcutLabelMap(newShortcutLabelMap);
    };

    const getDisplayedShortcuts = (id: number): string => {
        const key = makeKey(id);
        const fromComponent = (componentShortcuts[key] as KeyMapItem & { displayedSequences?: string[] })
            .displayedSequences;
        return (fromComponent || keyMap[key].sequences).join(', ');
    };

    const visibleSlots = shortcutSlots
        .map(({ slot }) => slot)
        .slice(0, Math.min(labels.length, shortcutSlots.length));

    return (
        <div className='cvat-tag-annotation-label-selects'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <Row>
                <Col>
                    <Text strong>Shortcuts for labels:</Text>
                </Col>
            </Row>
            {visibleSlots.map((id) => (
                <Row key={id}>
                    <Col span={24}>
                        <Text code>
                            {`Shortcut: ${getDisplayedShortcuts(id)}`}
                        </Text>
                    </Col>
                    <Col>
                        <Select
                            value={`${shortcutLabelMap[id]}`}
                            onChange={(value: string) => {
                                onChangeShortcutLabel(value, id);
                            }}
                            style={{ width: 200 }}
                            className='cvat-tag-annotation-label-select'
                        >
                            <Select.Option value=''>
                                <Text type='secondary'>None</Text>
                            </Select.Option>
                            {(labels as any[]).map((label: any) => (
                                <Select.Option key={label.id} value={`${label.id}`}>
                                    {label.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            ))}
        </div>
    );
}

export default ShortcutsSelect;
