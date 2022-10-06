// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import Popover from 'antd/lib/popover';

import Text from 'antd/lib/typography/Text';
import Radio from 'antd/lib/radio';
import { RgbIcon } from 'icons';
import withVisibilityHandling from './handle-popover-visibility';

export interface Props {
    redShortcut: string;
    greenShortcut: string;
    blueShortcut: string;
    colorChannel: any;
    chooseColor(color: string): void;
}

const CustomPopover = withVisibilityHandling(Popover, 'rgb-color');
function ColorControl(props: Props): JSX.Element {
    const {
        redShortcut, greenShortcut, blueShortcut, colorChannel, chooseColor,
    } = props;

    return (
        <CustomPopover
            placement='right'
            content={(
                <>
                    <CVATTooltip
                        title={`Choose the color channel R: ${redShortcut}, G: ${greenShortcut}, B: ${blueShortcut}`}
                        placement='topRight'
                    >
                        <Text>Color channel:</Text>
                        <div>
                            <Radio.Group
                                className='cvat-appearance-color-by-radio-group'
                                value={colorChannel}
                                onChange={(event) => chooseColor(event.target.value)}
                            >
                                <Radio.Button className='red-button' value='R'>
                                    Red
                                </Radio.Button>
                                <Radio.Button value='G'>Green</Radio.Button>
                                <Radio.Button value='B'>Blue</Radio.Button>
                            </Radio.Group>
                        </div>
                    </CVATTooltip>
                </>
            )}
            trigger='hover'
        >
            <Icon className='cvat-rgb-color-control' component={RgbIcon} />
        </CustomPopover>
    );
}

export default React.memo(ColorControl);
