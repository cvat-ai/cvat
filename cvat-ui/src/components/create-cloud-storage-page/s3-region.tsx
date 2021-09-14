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
import consts from '../../consts';

const { Option } = Select;
interface Props {
    selectedRegion: undefined | string;
    onSelectRegion: any;
    internalCommonProps: any;
}

function prepareDefaultRegions(): Map<string, string> {
    const temp = new Map<string, string>();
    for (const [key, value] of consts.DEFAULT_AWS_S3_REGIONS) {
        temp.set(key, value);
    }
    return temp;
}

export default function S3Region(props: Props): JSX.Element {
    const { selectedRegion, onSelectRegion, internalCommonProps } = props;
    const [regions, setRegions] = useState<Map<string, string>>(() => prepareDefaultRegions());
    const [newRegionKey, setNewRegionKey] = useState<string>('');
    const [newRegionName, setNewRegionName] = useState<string>('');

    const handleAddingRegion = (): void => {
        if (!newRegionKey || !newRegionName) {
            notification.warning({
                message: 'Incorrect region',
                className: 'cvat-incorrect-add-region-notification',
            });
        } else if (regions.has(newRegionKey)) {
            notification.warning({
                message: 'This region already exists',
                className: 'cvat-incorrect-add-region-notification',
            });
        } else {
            const regionsCopy = regions;
            setRegions(regionsCopy.set(newRegionKey, newRegionName));
            setNewRegionKey('');
            setNewRegionName('');
        }
    };

    return (
        <Form.Item
            label={(
                <>
                    Region
                    <Tooltip title='More information'>
                        <Button
                            className='cvat-cloud-storage-help-button'
                            type='link'
                            target='_blank'
                            href='https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions'
                        >
                            <QuestionCircleOutlined />
                        </Button>
                    </Tooltip>
                </>
            )}
            name='region'
            {...internalCommonProps}
        >
            <Select
                placeholder='Select region'
                defaultValue={selectedRegion ? regions.get(selectedRegion) : undefined}
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
                    Array.from(regions.entries()).map(
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
