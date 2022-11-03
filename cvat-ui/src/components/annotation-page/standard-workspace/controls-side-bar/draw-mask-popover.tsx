// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import LabelSelector from 'components/label-selector/label-selector';
import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    labels: any[];
    selectedLabelID: number;
    repeatShapeShortcut: string;
    onChangeLabel(value: string): void;
    onDraw(labelID: number): void;
}

function DrawMaskPopover(props: Props): JSX.Element {
    const {
        labels, selectedLabelID, repeatShapeShortcut, onChangeLabel, onDraw,
    } = props;

    return (
        <div className='cvat-draw-shape-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>
                        Draw new mask
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
                    <CVATTooltip title={`Press ${repeatShapeShortcut} to draw a mask again`}>
                        <Button onClick={() => onDraw(selectedLabelID)}>Draw a mask</Button>
                    </CVATTooltip>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(DrawMaskPopover);
