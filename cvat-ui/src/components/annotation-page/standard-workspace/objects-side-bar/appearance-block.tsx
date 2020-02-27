// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Checkbox,
    Collapse,
    Slider,
    Radio,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { RadioChangeEvent } from 'antd/lib/radio';
import { SliderValue } from 'antd/lib/slider';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

import { ColorBy } from 'reducers/interfaces';

interface Props {
    appearanceCollapsed: boolean;
    colorBy: ColorBy;
    opacity: number;
    selectedOpacity: number;
    blackBorders: boolean;

    collapseAppearance(): void;
    changeShapesColorBy(event: RadioChangeEvent): void;
    changeShapesOpacity(event: SliderValue): void;
    changeSelectedShapesOpacity(event: SliderValue): void;
    changeShapesBlackBorders(event: CheckboxChangeEvent): void;
}

function AppearanceBlock(props: Props): JSX.Element {
    const {
        appearanceCollapsed,
        colorBy,
        opacity,
        selectedOpacity,
        blackBorders,
        collapseAppearance,
        changeShapesColorBy,
        changeShapesOpacity,
        changeSelectedShapesOpacity,
        changeShapesBlackBorders,
    } = props;

    return (
        <Collapse
            onChange={collapseAppearance}
            activeKey={appearanceCollapsed ? [] : ['appearance']}
            className='cvat-objects-appearance-collapse'
        >
            <Collapse.Panel
                header={
                    <Text strong>Appearance</Text>
                }
                key='appearance'
            >
                <div className='cvat-objects-appearance-content'>
                    <Text type='secondary'>Color by</Text>
                    <Radio.Group value={colorBy} onChange={changeShapesColorBy}>
                        <Radio.Button value={ColorBy.INSTANCE}>{ColorBy.INSTANCE}</Radio.Button>
                        <Radio.Button value={ColorBy.GROUP}>{ColorBy.GROUP}</Radio.Button>
                        <Radio.Button value={ColorBy.LABEL}>{ColorBy.LABEL}</Radio.Button>
                    </Radio.Group>
                    <Text type='secondary'>Opacity</Text>
                    <Slider
                        onChange={changeShapesOpacity}
                        value={opacity}
                        min={0}
                        max={100}
                    />
                    <Text type='secondary'>Selected opacity</Text>
                    <Slider
                        onChange={changeSelectedShapesOpacity}
                        value={selectedOpacity}
                        min={0}
                        max={100}
                    />
                    <Checkbox
                        onChange={changeShapesBlackBorders}
                        checked={blackBorders}
                    >
                        Black borders
                    </Checkbox>
                </div>
            </Collapse.Panel>
        </Collapse>
    );
}

export default React.memo(AppearanceBlock);
