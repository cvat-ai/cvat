import React from 'react';

import {
    Row,
    Col,
    Tag,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { Model } from '../../reducers/interfaces';

interface Props {
    model: Model;
}

export default function (props: Props) {
    return (
        <Row className='cvat-models-list-item' type='flex'>
            <Col span={18}>
                <Tag color='orange'>Tensorflow</Tag>
                <Text className='cvat-black-color'>
                    {props.model.name}
                </Text>
            </Col>
            <Col span={6}>
                <Text type='secondary' className='cvat-black-color'>Labels:</Text>
                <Select
                    showSearch
                    placeholder='Supported labels'
                    style={{width: '200px'}}
                    value='Supported labels'
                >
                    {props.model.labels.map(
                        (label) => <Select.Option key={label}>
                            {label}
                        </Select.Option>)
                    }
                </Select>
            </Col>
        </Row>
    );
}
