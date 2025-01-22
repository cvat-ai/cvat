// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import { Label, DimensionType } from 'cvat-core-wrapper';
import GlobalHotKeys, { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import { shift } from 'utils/math';
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
    onShortcutPress(event: KeyboardEvent | undefined, labelID: number): void;
    labels: Label[];
};

const componentShortcuts: Record<string, KeyMapItem> = {};

for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
    componentShortcuts[`SETUP_${idx}_TAG`] = {
        name: 'Create a new tag',
        description: 'Create a new tag with corresponding class. The class may be setup in tag annotation sidebar',
        sequences: [`${idx}`, `shift+${idx}`],
        nonActive: true,
        scope: ShortcutScope.TAG_ANNOTATION_WORKSPACE,
        applicable: [DimensionType.DIMENSION_2D, DimensionType.DIMENSION_3D],
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
        (labels as any[]).slice(0, 10).forEach((label, index) => {
            newShortcutLabelMap[(index + 1) % 10] = label.id;
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
                const key = `SETUP_${id}_TAG`;
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
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => shortcutLabelMap[id])
        .forEach((id: number): void => {
            const [label] = labels.filter((_label) => _label.id === shortcutLabelMap[id]);
            const key = `SETUP_${id}_TAG`;
            handlers[key] = (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }
                onShortcutPress(event, label.id as number);
            };
        });

    const onChangeShortcutLabel = (value: string, id: number): void => {
        const newShortcutLabelMap = { ...shortcutLabelMap };
        newShortcutLabelMap[id] = value ? Number.parseInt(value, 10) : '';
        setShortcutLabelMap(newShortcutLabelMap);
    };

    return (
        <div className='cvat-tag-annotation-label-selects'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <Row>
                <Col>
                    <Text strong>Shortcuts for labels:</Text>
                </Col>
            </Row>
            {shift(Object.keys(shortcutLabelMap), 1)
                .slice(0, Math.min(labels.length, 10))
                .map((id) => (
                    <Row key={id}>
                        <Col>
                            <Select
                                value={`${shortcutLabelMap[Number.parseInt(id, 10)]}`}
                                onChange={(value: string) => {
                                    onChangeShortcutLabel(value, Number.parseInt(id, 10));
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
                            <Text code className='cvat-tag-annotation-shortcut-key'>{`Key ${id}`}</Text>
                        </Col>
                    </Row>
                ))}
        </div>
    );
}

export default ShortcutsSelect;
