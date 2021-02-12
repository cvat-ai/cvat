// Copyright (C) 2020-2021 Intel Corporation
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
    onSetup(labelID: number): void;
}

function SetupTagPopover(props: Props): JSX.Element {
    const {
        labels, selectedLabelID, repeatShapeShortcut, onChangeLabel, onSetup,
    } = props;

    return (
        <div className='cvat-setup-tag-popover-content'>
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
                    <CVATTooltip title={`Press ${repeatShapeShortcut} to add a tag again`}>
                        <Button onClick={() => onSetup(selectedLabelID)}>Tag</Button>
                    </CVATTooltip>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(SetupTagPopover);
