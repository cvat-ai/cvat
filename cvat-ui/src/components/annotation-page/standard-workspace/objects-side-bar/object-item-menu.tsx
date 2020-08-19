// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from 'antd/lib/icon';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Tooltip from 'antd/lib/tooltip';

import { BackgroundIcon, ForegroundIcon, ResetPerspectiveIcon } from 'icons';
import { ObjectType, ShapeType } from 'reducers/interfaces';

interface Props {
    serverID: number | undefined;
    locked: boolean;
    shapeType: ShapeType;
    objectType: ObjectType;
    copyShortcut: string;
    pasteShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    removeShortcut: string;
    copy: (() => void);
    remove: (() => void);
    propagate: (() => void);
    createURL: (() => void);
    switchOrientation: (() => void);
    toBackground: (() => void);
    toForeground: (() => void);
    resetCuboidPerspective: (() => void);
}

export default function ItemMenu(props: Props): JSX.Element {
    const {
        serverID,
        locked,
        shapeType,
        objectType,
        copyShortcut,
        pasteShortcut,
        propagateShortcut,
        toBackgroundShortcut,
        toForegroundShortcut,
        removeShortcut,
        copy,
        remove,
        propagate,
        createURL,
        switchOrientation,
        toBackground,
        toForeground,
        resetCuboidPerspective,
    } = props;

    return (
        <Menu className='cvat-object-item-menu'>
            <Menu.Item>
                <Button disabled={serverID === undefined} type='link' icon='link' onClick={createURL}>
                    Create object URL
                </Button>
            </Menu.Item>
            <Menu.Item>
                <Tooltip title={`${copyShortcut} and ${pasteShortcut}`} mouseLeaveDelay={0}>
                    <Button type='link' icon='copy' onClick={copy}>
                        Make a copy
                    </Button>
                </Tooltip>
            </Menu.Item>
            <Menu.Item>
                <Tooltip title={`${propagateShortcut}`} mouseLeaveDelay={0}>
                    <Button type='link' icon='block' onClick={propagate}>
                        Propagate
                    </Button>
                </Tooltip>
            </Menu.Item>
            { [ShapeType.POLYGON, ShapeType.POLYLINE, ShapeType.CUBOID].includes(shapeType) && (
                <Menu.Item>
                    <Button type='link' icon='retweet' onClick={switchOrientation}>
                        Switch orientation
                    </Button>
                </Menu.Item>
            )}
            {shapeType === ShapeType.CUBOID && (
                <Menu.Item>
                    <Button type='link' onClick={resetCuboidPerspective}>
                        <Icon component={ResetPerspectiveIcon} />
                        Reset perspective
                    </Button>
                </Menu.Item>
            )}
            {objectType !== ObjectType.TAG && (
                <Menu.Item>
                    <Tooltip title={`${toBackgroundShortcut}`} mouseLeaveDelay={0}>
                        <Button type='link' onClick={toBackground}>
                            <Icon component={BackgroundIcon} />
                            To background
                        </Button>
                    </Tooltip>
                </Menu.Item>
            )}
            {objectType !== ObjectType.TAG && (
                <Menu.Item>
                    <Tooltip title={`${toForegroundShortcut}`} mouseLeaveDelay={0}>
                        <Button type='link' onClick={toForeground}>
                            <Icon component={ForegroundIcon} />
                            To foreground
                        </Button>
                    </Tooltip>
                </Menu.Item>
            )}
            <Menu.Item>
                <Tooltip title={`${removeShortcut}`} mouseLeaveDelay={0}>
                    <Button
                        type='link'
                        icon='delete'
                        onClick={(): void => {
                            if (locked) {
                                Modal.confirm({
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
                </Tooltip>
            </Menu.Item>
        </Menu>
    );
}
