// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';

import {
    addImageFilter,
    removeImageFilter,
    setupImageFilter,
} from 'actions/settings-actions';
import GammaCorrection from 'utils/fabric-wrapper/gamma-correciton';
import { ImageFilterAlias, filterActive } from 'utils/image-processing';

import './image-setups.scss';

export default function ImageFilters(): JSX.Element {
    const dispatch = useDispatch();
    const [gamma, setGamma] = useState<number[]>([1.5, 1.5, 1.5]);
    const filters = useSelector((state: CombinedState) => state.settings.imageProcessing.filters);
    const gammaFilterActive = filterActive(filters, ImageFilterAlias.GAMMA_CORRECTION);
    const onChangeGamma = useCallback((newGamma) => {
        setGamma(newGamma);
        if (gammaFilterActive) {
            dispatch(setupImageFilter(
                ImageFilterAlias.GAMMA_CORRECTION,
                { gamma: newGamma },
            ));
        }
    }, [filters]);

    return (
        <div className='cvat-image-setups-filters'>
            <Text>Image filters</Text>
            <hr />
            <Row justify='space-around'>
                <Col span={24}>
                    <Row className='cvat-image-setups-gamma'>
                        <Col span={6}>
                            <Text className='cvat-text-color'> Gamma </Text>
                        </Col>
                        <Col>
                            <Checkbox
                                checked={gammaFilterActive}
                                onChange={(e: CheckboxChangeEvent) => {
                                    if (e.target.checked) {
                                        dispatch(addImageFilter({
                                            modifier: new GammaCorrection({ gamma }),
                                            alias: ImageFilterAlias.GAMMA_CORRECTION,
                                        }));
                                    } else {
                                        dispatch(removeImageFilter(ImageFilterAlias.GAMMA_CORRECTION));
                                    }
                                }}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col span={6}>
                            <Text>Red:</Text>
                        </Col>
                        <Col span={12}>
                            <Slider
                                min={0.2}
                                max={2.2}
                                value={gamma[0]}
                                step={0.01}
                                onChange={(value) => onChangeGamma([value, gamma[1], gamma[2]])}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col span={6}>
                            <Text>Green:</Text>
                        </Col>
                        <Col span={12}>
                            <Slider
                                min={0.2}
                                max={2.2}
                                value={gamma[1]}
                                step={0.01}
                                onChange={(value) => onChangeGamma([gamma[0], value, gamma[2]])}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col span={6}>
                            <Text>Blue:</Text>
                        </Col>
                        <Col span={12}>
                            <Slider
                                min={0.2}
                                max={2.2}
                                value={gamma[2]}
                                step={0.01}
                                onChange={(value) => onChangeGamma([gamma[0], gamma[1], value])}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}
