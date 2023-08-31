// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';

import {
    addImageFilter,
    removeImageFilter,
} from 'actions/settings-actions';
import GammaCorrectionImplementation from 'utils/fabric-wrapper/gamma-correciton';
import { ImageFilterAlias, filterActive } from 'utils/image-processing';

export default function ImageFilters(): JSX.Element {
    const dispatch = useDispatch();
    const [gamma, setGamma] = useState<number[]>([1, 1, 1]);
    const filters = useSelector((state: CombinedState) => state.settings.imageProcessing.filters);

    return (
        <>
            <Text>Image filters</Text>
            <hr />
            <Row justify='space-around'>
                <Col span={24}>
                    <Row className='cvat-image-setups-brightness'>
                        <Col span={6}>
                            <Text className='cvat-text-color'> Gamma </Text>
                        </Col>
                        <Col span={12}>
                            <Checkbox
                                onChange={(e: CheckboxChangeEvent) => {
                                    if (e.target.checked) {
                                        dispatch(addImageFilter({
                                            modifier: new GammaCorrectionImplementation(),
                                            alias: 'fabric.gamma',
                                        }));
                                    } else {
                                        dispatch(removeImageFilter('fabric.gamma'));
                                    }
                                }}
                            />
                        </Col>

                    </Row>
                    <Row>
                        <Col span={12}>
                            <Slider
                                min={0.2}
                                max={2.2}
                                value={gamma[0]}
                                onChange={(value: number): void => {
                                    setGamma([value, gamma[1], gamma[2]]);
                                    if (filterActive(filters, ImageFilterAlias.GAMMA_CORRECTION)) {
                                        dispatch(changeSaturationLevel(value as number));
                                    }
                                }}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </>
    );
}
