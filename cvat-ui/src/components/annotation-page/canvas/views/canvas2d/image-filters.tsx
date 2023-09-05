// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import { CombinedState } from 'reducers';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';

import {
    enableImageFilter,
    disableImageFilter,
} from 'actions/settings-actions';
import GammaCorrection from 'utils/fabric-wrapper/gamma-correciton';
import { ImageFilterAlias, hasFilter } from 'utils/image-processing';

import './image-setups.scss';

export default function ImageFilters(): JSX.Element {
    const dispatch = useDispatch();
    const [gamma, setGamma] = useState<number>(1);
    const filters = useSelector((state: CombinedState) => state.settings.imageProcessing.filters);
    const gammaFilter = hasFilter(filters, ImageFilterAlias.GAMMA_CORRECTION);
    const onChangeGamma = useCallback((newGamma) => {
        setGamma(newGamma);
        if (newGamma === 1) {
            if (gammaFilter) {
                dispatch(disableImageFilter(ImageFilterAlias.GAMMA_CORRECTION));
            }
        } else {
            const convertedGamma = [newGamma, newGamma, newGamma];
            if (gammaFilter) {
                dispatch(enableImageFilter(gammaFilter, { gamma: convertedGamma }));
            } else {
                dispatch(enableImageFilter({
                    modifier: new GammaCorrection({ gamma: convertedGamma }),
                    alias: ImageFilterAlias.GAMMA_CORRECTION,
                }));
            }
        }
    }, [filters]);

    useEffect(() => {
        if (filters.length === 0) {
            setGamma(1);
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
