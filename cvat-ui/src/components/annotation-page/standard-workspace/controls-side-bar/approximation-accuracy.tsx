// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';
import { Col, Row } from 'antd/lib/grid';

interface Props {
    approxPolyAccuracy: number;
    onChange(value: number): void;
}

export const MAX_ACCURACY = 13;

function ApproximationAccuracy(props: Props): React.ReactPortal | null {
    const { approxPolyAccuracy, onChange } = props;
    const target = window.document.getElementsByClassName('cvat-canvas-container')[0];

    return target ?
        ReactDOM.createPortal(
            <Row align='middle' className='cvat-approx-poly-threshold-wrapper'>
                <Col span={24}>
                    <Slider
                        value={approxPolyAccuracy}
                        min={0}
                        max={MAX_ACCURACY}
                        step={1}
                        dots
                        tooltip={{
                            open: false,
                        }}
                        onChange={onChange}
                    />
                </Col>
                <Text type='secondary'>approximation accuracy</Text>
            </Row>,
            target,
        ) :
        null;
}

export default React.memo(ApproximationAccuracy);
