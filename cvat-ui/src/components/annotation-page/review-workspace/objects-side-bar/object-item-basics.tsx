// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Dropdown from 'antd/lib/dropdown';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';

import { ColorBy } from 'reducers/interfaces';
import ItemMenu from './object-item-menu';

interface Props {
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    labels: any[];
    color: string;
    colorBy: ColorBy;
    type: string;
    changeColorShortcut: string;
    changeColor(color: string): void;
    createURL(): void;
}

function ItemTopComponent(props: Props): JSX.Element {
    const {
        clientID,
        serverID,
        labelID,
        labels,
        color,
        colorBy,
        type,
        changeColorShortcut,
        changeColor,
        createURL,
    } = props;

    const [menuVisible, setMenuVisible] = useState(false);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    const changeMenuVisible = (visible: boolean): void => {
        if (!visible && colorPickerVisible) return;
        setMenuVisible(visible);
    };

    const changeColorPickerVisible = (visible: boolean): void => {
        if (!visible) {
            setMenuVisible(false);
        }
        setColorPickerVisible(visible);
    };

    return (
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 12 }}>{clientID}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: 10 }}>
                    {type}
                </Text>
            </Col>
            <Col span={12}>
                <Tooltip title='Current label' mouseLeaveDelay={0}>
                    <Select size='small' value={`${labelID}`} disabled>
                        {labels.map(
                            (label: any): JSX.Element => (
                                <Select.Option key={label.id} value={`${label.id}`}>
                                    {label.name}
                                </Select.Option>
                            ),
                        )}
                    </Select>
                </Tooltip>
            </Col>
            <Col span={2}>
                <Dropdown
                    visible={menuVisible}
                    onVisibleChange={changeMenuVisible}
                    placement='bottomLeft'
                    overlay={ItemMenu({
                        serverID,
                        color,
                        colorBy,
                        colorPickerVisible,
                        changeColorShortcut,
                        changeColor,
                        createURL,
                        changeColorPickerVisible,
                    })}
                >
                    <Icon type='more' />
                </Dropdown>
            </Col>
        </Row>
    );
}

export default React.memo(ItemTopComponent);
