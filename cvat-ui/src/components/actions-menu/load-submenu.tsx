// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Menu from 'antd/lib/menu';
import Icon from 'antd/lib/icon';
import Upload from 'antd/lib/upload';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

interface Props {
    menuKey: string;
    loaders: any[];
    loadActivity: string | null;
    onFileUpload(file: File): void;
}

export default function LoadSubmenu(props: Props): JSX.Element {
    const { menuKey, loaders, loadActivity, onFileUpload } = props;

    return (
        <Menu.SubMenu key={menuKey} title='Upload annotations'>
            {loaders
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .map(
                    (loader: any): JSX.Element => {
                        const accept = loader.format
                            .split(',')
                            .map((x: string) => `.${x.trimStart()}`)
                            .join(', '); // add '.' to each extension in a list
                        const pending = loadActivity === loader.name;
                        const disabled = !loader.enabled || !!loadActivity;
                        return (
                            <Menu.Item key={loader.name} disabled={disabled} className='cvat-menu-load-submenu-item'>
                                <Upload
                                    accept={accept}
                                    multiple={false}
                                    showUploadList={false}
                                    beforeUpload={(file: File): boolean => {
                                        onFileUpload(file);
                                        return false;
                                    }}
                                >
                                    <Button block type='link' disabled={disabled}>
                                        <Icon type='upload' />
                                        <Text>{loader.name}</Text>
                                        {pending && <Icon style={{ marginLeft: 10 }} type='loading' />}
                                    </Button>
                                </Upload>
                            </Menu.Item>
                        );
                    },
                )}
        </Menu.SubMenu>
    );
}
