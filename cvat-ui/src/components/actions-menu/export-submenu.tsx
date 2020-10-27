// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';

interface Props {
    menuKey: string;
    exporters: any[];
    exportActivities: string[] | null;
}

export default function ExportSubmenu(props: Props): JSX.Element {
    const { menuKey, exporters, exportActivities } = props;

    return (
        <Menu.SubMenu key={menuKey} title='Export as a dataset'>
            {exporters
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
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
                                <Icon type='export' />
                                <Text disabled={disabled}>{exporter.name}</Text>
                                {pending && <Icon style={{ marginLeft: 10 }} type='loading' />}
                            </Menu.Item>
                        );
                    },
                )}
        </Menu.SubMenu>
    );
}
