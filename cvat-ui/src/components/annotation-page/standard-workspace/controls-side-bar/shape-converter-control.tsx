// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Popover from 'antd/lib/popover';
import { SwapOutlined } from '@ant-design/icons';

import { ConversionOptions } from 'cvat-core-wrapper';
import { Canvas } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ActiveControl } from 'reducers';
import withVisibilityHandling from './handle-popover-visibility';
import { Col, Row, Select } from 'antd';
import Text from 'antd/lib/typography/Text';
import { Button } from 'antd/lib/radio';
import opencvWrapper from 'utils/opencv-wrapper/opencv-wrapper';

// import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    updateActiveControl(activeControl: ActiveControl): void;
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled?: boolean;
}

interface PopoverProps {
    canvasInstance: Canvas;
    updateActiveControl(activeControl: ActiveControl): void;
    option: ConversionOptions | null;
    setOption(value: ConversionOptions): void;
}

function PopoverContent({
    canvasInstance, updateActiveControl, option, setOption,
}: PopoverProps): JSX.Element {
    return (
        <div className='cvat-setup-tag-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>
                        Convert shapes from/to
                    </Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Method</Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Select value={option} onChange={setOption}>
                        <Select.Option value={ConversionOptions.MASK_TO_POLYGON}>
                            Mask to polygon(s)
                        </Select.Option>
                        <Select.Option value={ConversionOptions.POLYGON_TO_MASK}>
                            Polygon to mask
                        </Select.Option>
                    </Select>
                    <CVATTooltip title={`Press ${'a shortcut'} to enable again`}>
                        <Button
                            disabled={option === null}
                            type='primary'
                            className='cvat-convert-shape-button'
                            onClick={() => {
                                canvasInstance.cancel();
                                canvasInstance.convert({
                                    enabled: true,
                                    method: option as ConversionOptions,
                                    getContours: opencvWrapper.getContoursFromState,
                                });
                                updateActiveControl(ActiveControl.CONVERT);
                            }}
                        >
                            Convert
                        </Button>
                    </CVATTooltip>
                </Col>
            </Row>
        </div>
    );
}

const CustomPopover = withVisibilityHandling(Popover, 'shape-converter');
function SplitControl(props: Props): JSX.Element {
    const [option, setOption] = useState<ConversionOptions | null>(null);
    const {
        shortcuts, activeControl, canvasInstance, updateActiveControl, disabled,
    } = props;

    const dynamicIconProps = activeControl === ActiveControl.CONVERT ?
        {
            className: 'cvat-convert-shapes-control cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.convert({ enabled: false });
            },
        } :
        {
            className: 'cvat-convert-shapes-control',
            onClick: (): void => {

            },
        };

    // const shortcutHandlers = {
    //     SWITCH_CONVERT_MODE: (event: KeyboardEvent | undefined) => {
    //         if (event) event.preventDefault();
    //         dynamicIconProps.onClick();
    //     },
    // };

    return disabled ? (
        <SwapOutlined className='cvat-split-track-control cvat-disabled-canvas-control' />
    ) : (
        <>
            {/* <GlobalHotKeys
                keyMap={{ SWITCH_SPLIT_MODE: shortcuts.SWITCH_CONVERT_MODE.details }}
                handlers={shortcutHandlers}
            /> */}
            <CVATTooltip title='Conversion tool' placement='right'>
                <CustomPopover
                    placement='right'
                    content={(
                        <PopoverContent
                            canvasInstance={canvasInstance}
                            updateActiveControl={updateActiveControl}
                            option={option}
                            setOption={setOption}
                        />
                    )}
                >
                    <SwapOutlined {...dynamicIconProps} />
                </CustomPopover>
            </CVATTooltip>
        </>
    );
}

export default React.memo(SplitControl);
