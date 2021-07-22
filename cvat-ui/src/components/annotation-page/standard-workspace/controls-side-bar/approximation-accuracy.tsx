// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';

interface Props {
    approxPolyAccuracy: number;
    onChange(value: number): void;
}

export function thresholdFromAccuracy(approxPolyAccuracy: number): number {
    const maxAccuracy = 7;
    const approxPolyMaxDistance = maxAccuracy - approxPolyAccuracy;
    let threshold = 0;
    if (approxPolyMaxDistance > 0) {
        // 0.5 for 1, 1 for 2, 2 for 3, 4 for 4, ...
        threshold = 2 ** (approxPolyMaxDistance - 2);
    }

    return threshold;
}

function ApproximationAccuracy(props: Props): React.ReactPortal | null {
    const { approxPolyAccuracy, onChange } = props;
    const target = window.document.getElementsByClassName('cvat-canvas-container')[0];

    return target ?
        ReactDOM.createPortal(
            <div className='cvat-approx-poly-threshold-wrapper'>
                <Text>Approximation accuracy</Text>
                <Slider
                    value={approxPolyAccuracy}
                    min={0}
                    max={7}
                    step={1}
                    dots
                    tooltipVisible={false}
                    onChange={onChange}
                />
            </div>,
            target,
        ) :
        null;
}

export default React.memo(ApproximationAccuracy);
