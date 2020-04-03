// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Menu,
    Icon,
    Upload,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {
    menuKey: string;
    loaders: string[];
    loadActivity: string | null;
    onFileUpload(file: File): void;
}

export default function LoadSubmenu(props: Props): JSX.Element {
    const {
        menuKey,
        loaders,
        loadActivity,
        onFileUpload,
    } = props;

    return (
        <Menu.SubMenu key={menuKey} title='Upload annotations'>
            {
                loaders.map((_loader: string): JSX.Element => {
                    const [loader, accept] = _loader.split('::');
                    const pending = loadActivity === loader;
                    return (
                        <Menu.Item
                            key={loader}
                            disabled={!!loadActivity}
                            className='cvat-menu-load-submenu-item'
                        >
                            <Upload
                                accept={accept}
                                multiple={false}
                                showUploadList={false}
                                beforeUpload={(file: File): boolean => {
                                    onFileUpload(file);
                                    return false;
                                }}
                            >
                                <Button block type='link' disabled={!!loadActivity}>
                                    <Icon type='upload' />
                                    <Text>{loader}</Text>
                                    {pending && <Icon style={{ marginLeft: 10 }} type='loading' />}
                                </Button>
                            </Upload>

                        </Menu.Item>
                    );
                })
            }
        </Menu.SubMenu>
    );
}
