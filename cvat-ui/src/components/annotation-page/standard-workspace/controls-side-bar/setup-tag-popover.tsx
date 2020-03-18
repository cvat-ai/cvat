// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Select,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {
    labels: any[];
    selectedLabeID: number;
    onChangeLabel(value: string): void;
    onSetup(
        labelID: number,
    ): void;
}

function setupTagPopover(props: Props): JSX.Element {
    const {
        labels,
        selectedLabeID,
        onChangeLabel,
        onSetup,
    } = props;

    return (
        <div className='cvat-draw-shape-popover-content'>
            <Row type='flex' justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>Setup tag</Text>
                </Col>
            </Row>
            <Row type='flex' justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center'>
                <Col span={24}>
                    <Select
                        value={`${selectedLabeID}`}
                        onChange={onChangeLabel}
                    >
                        {
                            labels.map((label: any) => (
                                <Select.Option
                                    key={label.id}
                                    value={`${label.id}`}
                                >
                                    {label.name}
                                </Select.Option>
                            ))
                        }
                    </Select>
                </Col>
            </Row>
            <Row type='flex' justify='space-around'>
                <Col span={24}>
                    <Button onClick={() => onSetup(selectedLabeID)}>
                        Tag
                    </Button>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(setupTagPopover);
