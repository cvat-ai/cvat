// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Button from 'antd/lib/button';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';
import { SketchPicker } from 'react-color';
import Tooltip from 'antd/lib/tooltip';

import getCore from 'cvat-core-wrapper';

const core = getCore();

interface Props {
    value?: string;
    children: React.ReactNode;
    onChange?: (value: string) => void;
    placement?: 'left' | 'top' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom' | undefined;
}

function ColorPicker(props: Props, ref: React.Ref<any>): JSX.Element {
    const {
        children,
        value,
        onChange,
        placement,
    } = props;

    const [colorState, setColorState] = useState(value);
    const [pickerVisible, setPickerVisible] = useState(false);

    const colors = [...core.enums.colors];

    return (
        <Popover
            content={(
                <>
                    <SketchPicker
                        color={colorState}
                        onChange={(color) => setColorState(color.hex)}
                        presetColors={colors}
                        ref={ref}
                        disableAlpha
                    />
                    <Row>
                        <Col span={18}>
                            <Button
                                onClick={() => {
                                    if (typeof onChange === 'function') onChange('');
                                    setPickerVisible(false);
                                }}
                            >
                                Reset to default
                            </Button>
                        </Col>
                        <Col span={6}>
                            <Button
                                type='primary'
                                onClick={() => {
                                    if (typeof onChange === 'function') onChange(colorState || '');
                                    setPickerVisible(false);
                                }}
                            >
                                Ok
                            </Button>
                        </Col>
                    </Row>
                </>
            )}
            title={(
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={12}>
                        <Text strong>
                            Select color
                        </Text>
                    </Col>
                    <Col span={4}>
                        <Tooltip title='Cancel'>
                            <Button
                                type='link'
                                onClick={() => {
                                    setPickerVisible(false);
                                }}
                            >
                                <Icon type='close' />
                            </Button>
                        </Tooltip>
                    </Col>
                </Row>

            )}
            placement={placement || 'left'}
            overlayClassName='cvat-label-color-picker'
            visible={pickerVisible}
            onVisibleChange={(visible) => setPickerVisible(visible)}
            trigger='click'
        >
            {children}
        </Popover>
    );
}

export default React.forwardRef(ColorPicker);
