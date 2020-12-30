// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Menu from 'antd/lib/menu';
import Text from 'antd/lib/typography/Text';
import { ExportOutlined, LoadingOutlined } from '@ant-design/icons';
import { DimensionType } from '../../reducers/interfaces';

interface Props {
    menuKey: string;
    exporters: any[];
    exportActivities: string[] | null;
    taskDimension: DimensionType;
}

export default function ExportSubmenu(props: Props): JSX.Element {
    const {
        menuKey, exporters, exportActivities, taskDimension,
    } = props;

    return (
        <Menu.SubMenu key={menuKey} title='Export as a dataset'>
            {exporters
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .filter((exporter: any): boolean => exporter.dimension === taskDimension)
                .map(
                    (exporter: any): JSX.Element => {
                        const pending = (exportActivities || []).includes(exporter.name);
                        const disabled = !exporter.enabled || pending;
                        return (
                            <Menu.Item
                                key={exporter.name}
                                disabled={disabled}
                                className='cvat-menu-export-submenu-item'
                            >
                                <ExportOutlined />
                                <Text disabled={disabled}>{exporter.name}</Text>
                                {pending && <LoadingOutlined style={{ marginLeft: 10 }} />}
                            </Menu.Item>
                        );
                    },
                )}
        </Menu.SubMenu>
    );
}
