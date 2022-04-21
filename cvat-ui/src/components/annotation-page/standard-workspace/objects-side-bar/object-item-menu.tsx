// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Icon, {
    LinkOutlined, CopyOutlined, BlockOutlined, RetweetOutlined, DeleteOutlined,
} from '@ant-design/icons';

import {
    BackgroundIcon, ForegroundIcon, ResetPerspectiveIcon, ColorizeIcon,
} from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    ObjectType, ShapeType, ColorBy, DimensionType,
} from 'reducers/interfaces';
import ColorPicker from './color-picker';

interface Props {
    readonly: boolean;
    serverID: number | undefined;
    locked: boolean;
    shapeType: ShapeType;
    objectType: ObjectType;
    color: string;
    colorBy: ColorBy;
    colorPickerVisible: boolean;
    changeColorShortcut: string;
    copyShortcut: string;
    pasteShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    removeShortcut: string;
    changeColor(value: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    resetCuboidPerspective(): void;
    changeColorPickerVisible(visible: boolean): void;
    jobInstance: any;
}

interface ItemProps {
    toolProps: Props;
}

function CreateURLItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { serverID, createURL } = toolProps;
    return (
        <Menu.Item {...rest}>
            <Button disabled={serverID === undefined} type='link' icon={<LinkOutlined />} onClick={createURL}>
                Create object URL
            </Button>
        </Menu.Item>
    );
}

function MakeCopyItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { copyShortcut, pasteShortcut, copy } = toolProps;
    return (
        <Menu.Item {...rest}>
            <CVATTooltip title={`${copyShortcut} and ${pasteShortcut}`}>
                <Button type='link' icon={<CopyOutlined />} onClick={copy}>
                    Make a copy
                </Button>
            </CVATTooltip>
        </Menu.Item>
    );
}

function PropagateItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { propagateShortcut, propagate } = toolProps;
    return (
        <Menu.Item {...rest}>
            <CVATTooltip title={`${propagateShortcut}`}>
                <Button type='link' icon={<BlockOutlined />} onClick={propagate}>
                    Propagate
                </Button>
            </CVATTooltip>
        </Menu.Item>
    );
}

function SwitchOrientationItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { switchOrientation } = toolProps;
    return (
        <Menu.Item {...rest}>
            <Button type='link' icon={<RetweetOutlined />} onClick={switchOrientation}>
                Switch orientation
            </Button>
        </Menu.Item>
    );
}

function ResetPerspectiveItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { resetCuboidPerspective } = toolProps;
    return (
        <Menu.Item {...rest}>
            <Button type='link' onClick={resetCuboidPerspective}>
                <Icon component={ResetPerspectiveIcon} />
                Reset perspective
            </Button>
        </Menu.Item>
    );
}

function ToBackgroundItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { toBackgroundShortcut, toBackground } = toolProps;
    return (
        <Menu.Item {...rest}>
            <CVATTooltip title={`${toBackgroundShortcut}`}>
                <Button type='link' onClick={toBackground}>
                    <Icon component={BackgroundIcon} />
                    To background
                </Button>
            </CVATTooltip>
        </Menu.Item>
    );
}

function ToForegroundItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { toForegroundShortcut, toForeground } = toolProps;
    return (
        <Menu.Item {...rest}>
            <CVATTooltip title={`${toForegroundShortcut}`}>
                <Button type='link' onClick={toForeground}>
                    <Icon component={ForegroundIcon} />
                    To foreground
                </Button>
            </CVATTooltip>
        </Menu.Item>
    );
}

function SwitchColorItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const {
        color,
        colorPickerVisible,
        changeColorShortcut,
        colorBy,
        changeColor,
        changeColorPickerVisible,
    } = toolProps;
    return (
        <Menu.Item {...rest}>
            <ColorPicker
                value={color}
                onChange={changeColor}
                visible={colorPickerVisible}
                onVisibleChange={changeColorPickerVisible}
                resetVisible={false}
            >
                <CVATTooltip title={`${changeColorShortcut}`}>
                    <Button type='link'>
                        <Icon component={ColorizeIcon} />
                        {`Change ${colorBy.toLowerCase()} color`}
                    </Button>
                </CVATTooltip>
            </ColorPicker>
        </Menu.Item>
    );
}

function RemoveItem(props: ItemProps): JSX.Element {
    const { toolProps, ...rest } = props;
    const { removeShortcut, locked, remove } = toolProps;
    return (
        <Menu.Item {...rest}>
            <CVATTooltip title={`${removeShortcut}`}>
                <Button
                    type='link'
                    icon={<DeleteOutlined />}
                    onClick={(): void => {
                        if (locked) {
                            Modal.confirm({
                                className: 'cvat-modal-confirm',
                                title: 'Object is locked',
                                content: 'Are you sure you want to remove it?',
                                onOk() {
                                    remove();
                                },
                            });
                        } else {
                            remove();
                        }
                    }}
                >
                    Remove
                </Button>
            </CVATTooltip>
        </Menu.Item>
    );
}

export default function ItemMenu(props: Props): JSX.Element {
    const {
        readonly, shapeType, objectType, colorBy, jobInstance,
    } = props;

    enum MenuKeys {
        CREATE_URL = 'create_url',
        COPY = 'copy',
        PROPAGATE = 'propagate',
        SWITCH_ORIENTATION = 'switch_orientation',
        RESET_PERSPECIVE = 'reset_perspective',
        TO_BACKGROUND = 'to_background',
        TO_FOREGROUND = 'to_foreground',
        SWITCH_COLOR = 'switch_color',
        REMOVE_ITEM = 'remove_item',
    }

    const is2D = jobInstance.dimension === DimensionType.DIM_2D;

    return (
        <Menu className='cvat-object-item-menu' selectable={false}>
            <CreateURLItem key={MenuKeys.CREATE_URL} toolProps={props} />
            {!readonly && <MakeCopyItem key={MenuKeys.COPY} toolProps={props} />}
            {!readonly && <PropagateItem key={MenuKeys.PROPAGATE} toolProps={props} />}
            {is2D && !readonly && [ShapeType.POLYGON, ShapeType.POLYLINE, ShapeType.CUBOID].includes(shapeType) && (
                <SwitchOrientationItem key={MenuKeys.SWITCH_ORIENTATION} toolProps={props} />
            )}
            {is2D && !readonly && shapeType === ShapeType.CUBOID && (
                <ResetPerspectiveItem key={MenuKeys.RESET_PERSPECIVE} toolProps={props} />
            )}
            {is2D && objectType !== ObjectType.TAG && (
                <ToBackgroundItem key={MenuKeys.TO_BACKGROUND} toolProps={props} />
            )}
            {is2D && !readonly && objectType !== ObjectType.TAG && (
                <ToForegroundItem key={MenuKeys.TO_FOREGROUND} toolProps={props} />
            )}
            {[ColorBy.INSTANCE, ColorBy.GROUP].includes(colorBy) && (
                <SwitchColorItem key={MenuKeys.SWITCH_COLOR} toolProps={props} />
            )}
            {!readonly && <RemoveItem key={MenuKeys.REMOVE_ITEM} toolProps={props} />}
        </Menu>
    );
}
