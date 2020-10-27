// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';

import { CombinedState } from 'reducers/interfaces';
import { shift } from 'utils/math';

interface ShortcutLabelMap {
    [index: number]: any;
}

type Props = {
    onAddTag(labelID: number): void;
};

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

const ShortcutsSelect = (props: Props): JSX.Element => {
    const { onAddTag } = props;
    const { labels } = useSelector((state: CombinedState) => state.annotation.job);
    const [shortcutLabelMap, setShortcutLabelMap] = useState(defaultShortcutLabelMap);

    const keyMap: KeyMap = {};
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

    Object.keys(shortcutLabelMap)
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => shortcutLabelMap[id])
        .forEach((id: number): void => {
            const [label] = labels.filter((_label) => _label.id === shortcutLabelMap[id]);
            const key = `SETUP_${id}_TAG`;
            keyMap[key] = {
                name: `Setup ${label.name} tag`,
                description: `Setup tag with "${label.name}" label`,
                sequence: `${id}`,
                action: 'keydown',
            };

            handlers[key] = (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }

                onAddTag(label.id);
            };
        });

    const onChangeShortcutLabel = (value: string, id: number): void => {
        const newShortcutLabelMap = { ...shortcutLabelMap };
        newShortcutLabelMap[id] = value ? Number.parseInt(value, 10) : '';
        setShortcutLabelMap(newShortcutLabelMap);
    };

    return (
        <div className='cvat-tag-annotation-label-selects'>
            <GlobalHotKeys keyMap={keyMap as KeyMap} handlers={handlers} allowChanges />
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
                            <Text strong>{`Key ${id}:`}</Text>
                            <Select
                                value={`${shortcutLabelMap[Number.parseInt(id, 10)]}`}
                                onChange={(value: string) => {
                                    onChangeShortcutLabel(value, Number.parseInt(id, 10));
                                }}
                                size='default'
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
};

export default ShortcutsSelect;
