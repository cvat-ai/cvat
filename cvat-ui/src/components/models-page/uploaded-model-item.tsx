import React from 'react';

import {
    Row,
    Col,
    Tag,
    Select,
    Menu,
    Dropdown,
    Icon,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import moment from 'moment';

import { Model } from '../../reducers/interfaces';

interface Props {
    model: Model;
    owner: any;
    onDelete(): void;
}

export default function UploadedModelItem(props: Props): JSX.Element {
    const subMenuIcon = (): JSX.Element => (<img alt='' src='/assets/icon-sub-menu.svg' />);
    const {
        model,
        owner,
        onDelete,
    } = props;

    return (
        <Row className='cvat-models-list-item' type='flex'>
            <Col span={4} xxl={3}>
                <Tag color='purple'>OpenVINO</Tag>
            </Col>
            <Col span={6} xxl={7}>
                <Text className='cvat-black-color'>
                    {model.name}
                </Text>
            </Col>
            <Col span={3}>
                <Text className='cvat-black-color'>
                    {owner ? owner.username : 'undefined'}
                </Text>
            </Col>
            <Col span={4}>
                <Text className='cvat-black-color'>
                    {moment(model.uploadDate).format('MMMM Do YYYY')}
                </Text>
            </Col>
            <Col span={5}>
                <Select
                    showSearch
                    placeholder='Supported labels'
                    style={{ width: '90%' }}
                    value='Supported labels'
                >
                    {model.labels.map(
                        (label): JSX.Element => (
                            <Select.Option key={label}>
                                {label}
                            </Select.Option>
                        ),
                    )}
                </Select>
            </Col>
            <Col span={2}>
                <Text className='cvat-black-color'>Actions</Text>
                <Dropdown overlay={
                    (
                        <Menu className='cvat-task-item-menu'>
                            <Menu.Item
                                onClick={(): void => {
                                    onDelete();
                                }}
                                key='delete'
                            >
                                    Delete
                            </Menu.Item>
                        </Menu>
                    )}
                >
                    <Icon className='cvat-task-item-menu-icon' component={subMenuIcon} />
                </Dropdown>
            </Col>
        </Row>
    );
}
