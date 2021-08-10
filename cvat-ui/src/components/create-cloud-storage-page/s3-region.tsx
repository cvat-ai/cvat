// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Divider from 'antd/lib/divider';
import Select from 'antd/lib/select';
import { PlusOutlined } from '@ant-design/icons';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import consts from '../../consts';

const { Option } = Select;
interface Props {
    onSelectRegion: any;
    internalCommonProps: any;
}

consts.DEFAULT_AWS_S3_REGIONS.map((v) => v);

function prepareDefaultRegions(): Map<string, string> {
    const temp = new Map<string, string>();
    for (const [key, value] of consts.DEFAULT_AWS_S3_REGIONS) {
        temp.set(key, value);
    }
    return temp;
}

export default function S3Region(props: Props): JSX.Element {
    const { onSelectRegion, internalCommonProps } = props;
    const [regions, setRegions] = useState<Map<string, string>>(prepareDefaultRegions());
    const [newRegionKey, setNewRegionKey] = useState<string>('');
    const [newRegionName, setNewRegionName] = useState<string>('');
    const [regionOptions, setRegionOptions] = useState<JSX.Element[]>([]);

    useEffect(() => {
        if (regions) {
            setRegionOptions(Array.from(regions.entries()).map(([key, value]): JSX.Element => (
                <Option key={key} value={value}>{value}</Option>
            )));
        } else {
            setRegionOptions([]);
        }
    }, [regions.size]);

    const handleAddingRegion = (): void => {
        if (!newRegionKey || !newRegionName) {
            notification.warning({
                message: 'Incorrect region',
                className: 'cvat-incorrect-add-region-notification',
            });
        } else if (!regions.has(newRegionKey)) {
            const regionsCopy = regions;
            setRegions(regionsCopy.set(newRegionKey, newRegionName));
            setNewRegionKey('');
            setNewRegionName('');
        }
    };

    return (
        <Form.Item
            label='Region'
            name='region'
            tooltip='https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions'
            {...internalCommonProps}
        >
            <Select
                placeholder='Select region'
                dropdownRender={(menu) => (
                    <div>
                        {menu}
                        <Divider style={{ margin: '4px 0' }} />
                        <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8 }}>
                            <Input
                                style={{ flex: 'auto' }}
                                value={newRegionKey}
                                onChange={(event: any) => setNewRegionKey(event.target.value)}
                                maxLength={14}
                                placeholder='key'
                            />
                            <Input
                                style={{ flex: 'auto' }}
                                value={newRegionName}
                                onChange={(event: any) => setNewRegionName(event.target.value)}
                                placeholder='name'
                            />
                            <Button
                                type='link'
                                style={
                                    {
                                        flex: 'none',
                                        padding: '8px',
                                        display: 'block',
                                        cursor: 'pointer',
                                    }
                                }
                                onClick={handleAddingRegion}
                            >
                                <PlusOutlined />
                                Add region
                            </Button>
                        </div>
                    </div>
                )}
                onSelect={(_, instance) => onSelectRegion(instance.key)}
            >
                {regionOptions}
            </Select>
        </Form.Item>
    );
}
