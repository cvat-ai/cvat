// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Menu,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {
    menuKey: string;
    exporters: string[];
    exportActivities: string[] | null;
}

export default function ExportSubmenu(props: Props): JSX.Element {
    const {
        menuKey,
        exporters,
        exportActivities,
    } = props;

    return (
        <Menu.SubMenu key={menuKey} title='Export as a dataset'>
            {
                exporters.map((exporter: string): JSX.Element => {
                    const pending = (exportActivities || []).includes(exporter);
                    return (
                        <Menu.Item
                            key={exporter}
                            disabled={pending}
                            className='cvat-menu-export-submenu-item'
                        >
                            <Icon type='export' />
                            <Text>{exporter}</Text>
                            {pending && <Icon style={{ marginLeft: 10 }} type='loading' />}
                        </Menu.Item>
                    );
                })
            }
        </Menu.SubMenu>
    );
}
