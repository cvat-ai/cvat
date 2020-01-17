import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import {
    ExpandObjectsIcon,
} from 'icons';

export default function ObjectsList(): JSX.Element {
    return (
        <>
            <div className='cvat-side-bar-objects-header'>
                <Row>
                    <Col>
                        <Input
                            placeholder='Filter e.g. car[attr/model="mazda"]'
                            prefix={<Icon type='filter' />}
                        />
                    </Col>
                </Row>
                <Row type='flex' justify='space-between' align='middle'>
                    <Col span={2}>
                        <Icon type='lock' />
                    </Col>
                    <Col span={2}>
                        <Icon type='eye-invisible' />
                    </Col>
                    <Col span={2}>
                        <Icon component={ExpandObjectsIcon} />
                    </Col>
                    <Col span={16}>
                        <Text strong>Sort by</Text>
                        <Select defaultValue='id'>
                            <Select.Option key='id'> ID </Select.Option>
                            <Select.Option key='updated'> Updated </Select.Option>
                        </Select>
                    </Col>
                </Row>
            </div>
            <div className='cvat-side-bar-objects-list'>

            </div>
        </>
    );
}
