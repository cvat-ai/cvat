// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import Text from 'antd/lib/typography/Text';
import LabelSelector from 'components/label-selector/label-selector';

interface Props {
    labels: any[];
    selectedLabelID: number;
    repeatShapeShortcut: string;
    onChangeLabel(value: string): void;
    onSetup(labelID: number): void;
}

function SetupTagPopover(props: Props): JSX.Element {
    const {
        labels, selectedLabelID, repeatShapeShortcut, onChangeLabel, onSetup,
    } = props;

    return (
        <div className='cvat-draw-shape-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>
                        Setup tag
                    </Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={24}>
                    <LabelSelector
                        style={{ width: '100%' }}
                        labels={labels}
                        value={selectedLabelID}
                        onChange={onChangeLabel}
                    />
                </Col>
            </Row>
            <Row justify='space-around'>
                <Col span={24}>
                    <Tooltip title={`Press ${repeatShapeShortcut} to add a tag again`} mouseLeaveDelay={0}>
                        <Button onClick={() => onSetup(selectedLabelID)}>Tag</Button>
                    </Tooltip>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(SetupTagPopover);
