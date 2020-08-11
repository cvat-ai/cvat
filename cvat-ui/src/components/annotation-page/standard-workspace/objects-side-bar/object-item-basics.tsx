// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select, { OptionProps } from 'antd/lib/select';
import Dropdown from 'antd/lib/dropdown';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';

import { ObjectType, ShapeType } from 'reducers/interfaces';
import ItemMenu from './object-item-menu';

interface Props {
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    labels: any[];
    shapeType: ShapeType;
    objectType: ObjectType;
    type: string;
    locked: boolean;
    copyShortcut: string;
    pasteShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    removeShortcut: string;
    changeLabel(labelID: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    resetCuboidPerspective(): void;
}

function ItemTopComponent(props: Props): JSX.Element {
    const {
        clientID,
        serverID,
        labelID,
        labels,
        shapeType,
        objectType,
        type,
        locked,
        copyShortcut,
        pasteShortcut,
        propagateShortcut,
        toBackgroundShortcut,
        toForegroundShortcut,
        removeShortcut,
        changeLabel,
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
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 12 }}>{clientID}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: 10 }}>{type}</Text>
            </Col>
            <Col span={12}>
                <Tooltip title='Change current label' mouseLeaveDelay={0}>
                    <Select
                        size='small'
                        value={`${labelID}`}
                        onChange={changeLabel}
                        showSearch
                        filterOption={(input: string, option: React.ReactElement<OptionProps>) => {
                            const { children } = option.props;
                            if (typeof (children) === 'string') {
                                return children.toLowerCase().includes(input.toLowerCase());
                            }

                            return false;
                        }}
                    >
                        { labels.map((label: any): JSX.Element => (
                            <Select.Option key={label.id} value={`${label.id}`}>
                                {label.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Tooltip>
            </Col>
            <Col span={2}>
                <Dropdown
                    placement='bottomLeft'
                    overlay={ItemMenu({
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
                    })}
                >
                    <Icon type='more' />
                </Dropdown>
            </Col>
        </Row>
    );
}

export default React.memo(ItemTopComponent);
