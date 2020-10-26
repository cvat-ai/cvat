// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';

import { ColorizeIcon } from 'icons';
import { ColorBy } from 'reducers/interfaces';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';

interface Props {
    serverID: number | undefined;
    color: string;
    colorBy: ColorBy;
    colorPickerVisible: boolean;
    changeColorShortcut: string;
    changeColor(value: string): void;
    createURL(): void;
    changeColorPickerVisible(visible: boolean): void;
}

export default function ItemMenu(props: Props): JSX.Element {
    const {
        serverID,
        color,
        colorBy,
        colorPickerVisible,
        changeColorShortcut,
        changeColor,
        createURL,
        changeColorPickerVisible,
    } = props;

    return (
        <Menu className='cvat-object-item-menu'>
            <Menu.Item>
                <Button disabled={serverID === undefined} type='link' icon='link' onClick={createURL}>
                    Create object URL
                </Button>
            </Menu.Item>
            {[ColorBy.INSTANCE, ColorBy.GROUP].includes(colorBy) && (
                <Menu.Item>
                    <ColorPicker
                        value={color}
                        onChange={changeColor}
                        visible={colorPickerVisible}
                        onVisibleChange={changeColorPickerVisible}
                        resetVisible={false}
                    >
                        <Tooltip title={`${changeColorShortcut}`} mouseLeaveDelay={0}>
                            <Button type='link'>
                                <Icon component={ColorizeIcon} />
                                {`Change ${colorBy.toLowerCase()} color`}
                            </Button>
                        </Tooltip>
                    </ColorPicker>
                </Menu.Item>
            )}
        </Menu>
    );
}
