// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
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
    const [gamma, setGamma] = useState<number>(1);
    const filters = useSelector((state: CombinedState) => state.settings.imageProcessing.filters);
    const gammaFilterActive = filterActive(filters, ImageFilterAlias.GAMMA_CORRECTION);
    const onChangeGamma = useCallback((newGamma) => {
        setGamma(newGamma);
        if (newGamma === 1) {
            if (gammaFilterActive) {
                dispatch(removeImageFilter(ImageFilterAlias.GAMMA_CORRECTION));
            }
        } else if (gammaFilterActive) {
            dispatch(setupImageFilter(
                ImageFilterAlias.GAMMA_CORRECTION,
                { gamma: [newGamma, newGamma, newGamma] },
            ));
        } else {
            dispatch(addImageFilter({
                modifier: new GammaCorrection({ gamma: [newGamma, newGamma, newGamma] }),
                alias: ImageFilterAlias.GAMMA_CORRECTION,
            }));
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
                            <Text className='cvat-text-color'> Gamma: </Text>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={12}>
                            <Slider
                                min={0.2}
                                max={2.2}
                                value={gamma}
                                step={0.01}
                                onChange={(value) => onChangeGamma(value)}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}
