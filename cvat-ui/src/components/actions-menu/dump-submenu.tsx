// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';

function isDefaultFormat(dumperName: string, taskMode: string): boolean {
    return (
        (dumperName === 'CVAT for video 1.1' && taskMode === 'interpolation') ||
        (dumperName === 'CVAT for images 1.1' && taskMode === 'annotation')
    );
}

interface Props {
    taskMode: string;
    menuKey: string;
    dumpers: any[];
    dumpActivities: string[] | null;
}

export default function DumpSubmenu(props: Props): JSX.Element {
    const { taskMode, menuKey, dumpers, dumpActivities } = props;

    return (
        <Menu.SubMenu key={menuKey} title='Dump annotations'>
            {dumpers
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .map(
                    (dumper: any): JSX.Element => {
                        const pending = (dumpActivities || []).includes(dumper.name);
                        const disabled = !dumper.enabled || pending;
                        const isDefault = isDefaultFormat(dumper.name, taskMode);
                        return (
                            <Menu.Item key={dumper.name} disabled={disabled} className='cvat-menu-dump-submenu-item'>
                                <Icon type='download' />
                                <Text strong={isDefault} disabled={disabled}>
                                    {dumper.name}
                                </Text>
                                {pending && <Icon style={{ marginLeft: 10 }} type='loading' />}
                            </Menu.Item>
                        );
                    },
                )}
        </Menu.SubMenu>
    );
}
