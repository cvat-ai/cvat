// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Divider from 'antd/lib/divider';
import Select from 'antd/lib/select';
import { PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import Tooltip from 'antd/lib/tooltip';

const { Option } = Select;
interface Props {
    selectedRegion: undefined | string;
    onSelectRegion: any;
    internalCommonProps: any;

    label: 'Location' | 'Region';
    name: 'location' | 'region';
    values: string[][];
    href: string;
}

interface Locations {
    [index: string]: string;
}

export default function Location(props: Props): JSX.Element {
    const {
        selectedRegion, onSelectRegion, internalCommonProps, name, values, href, label,
    } = props;
    const [locations, setLocations] = useState<Locations>(() => Object.fromEntries(values));
    const [newRegionKey, setNewRegionKey] = useState<string>('');
    const [newRegionName, setNewRegionName] = useState<string>('');

    const handleAddingRegion = (): void => {
        if (!newRegionKey || !newRegionName) {
            notification.warning({
                message: 'Incorrect region',
                className: 'cvat-incorrect-add-region-notification',
            });
        } else if (locations[newRegionKey]) {
            notification.warning({
                message: 'This region already exists',
                className: 'cvat-incorrect-add-region-notification',
            });
        } else {
            setLocations({
                ...locations,
                [newRegionKey]: newRegionName,
            });
            setNewRegionKey('');
            setNewRegionName('');
        }
    };

    return (
        <Form.Item
            label={(
                <>
                    {label}
                    <Tooltip title='More information'>
                        <Button
                            className='cvat-cloud-storage-help-button'
                            type='link'
                            target='_blank'
                            href={href}
                        >
                            <QuestionCircleOutlined />
                        </Button>
                    </Tooltip>
                </>
            )}
            name={name}
            {...internalCommonProps}
        >
            <Select
                placeholder={name}
                defaultValue={selectedRegion ? locations[selectedRegion] : undefined}
                dropdownRender={(menu) => (
                    <div>
                        {menu}
                        <Divider className='cvat-divider' />
                        <div className='cvat-cloud-storage-region-creator'>
                            <Input
                                value={newRegionKey}
                                onChange={(event: any) => setNewRegionKey(event.target.value)}
                                maxLength={14}
                                placeholder='key'
                            />
                            <Input
                                value={newRegionName}
                                onChange={(event: any) => setNewRegionName(event.target.value)}
                                placeholder='name'
                            />
                            <Button
                                type='link'
                                onClick={handleAddingRegion}
                            >
                                Add region
                                <PlusCircleOutlined />
                            </Button>
                        </div>
                    </div>
                )}
                onSelect={(_, instance) => onSelectRegion(instance.key)}
            >
                {
                    Array.from(Object.entries(locations)).map(
                        ([key, value]): JSX.Element => (
                            <Option key={key} value={value}>
                                {value}
                            </Option>
                        ),
                    )
                }
            </Select>
        </Form.Item>
    );
}
