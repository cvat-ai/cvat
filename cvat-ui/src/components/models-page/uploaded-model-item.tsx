import React from 'react';

import {
    Row,
    Col,
    Tag,
    Select,
    Menu,
    Dropdown,
    Button,
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

export default function UploadedModelItem(props: Props) {
    const subMenuIcon = () => (<img src='/assets/icon-sub-menu.svg'/>);

    return (
        <Row className='cvat-models-list-item' type='flex'>
            <Col span={4} xxl={3}>
                <Tag color='purple'>OpenVINO</Tag>
            </Col>
            <Col span={6} xxl={7}>
                <Text className='cvat-black-color'>
                    {props.model.name}
                </Text>
            </Col>
            <Col span={3}>
                <Text className='cvat-black-color'>
                    {props.owner ? props.owner.username : 'undefined'}
                </Text>
            </Col>
            <Col span={4}>
                <Text className='cvat-black-color'>
                    {moment(props.model.uploadDate).format('MMMM Do YYYY')}
                </Text>
            </Col>
            <Col span={5}>
                <Select
                    showSearch
                    placeholder='Supported labels'
                    style={{width: '90%'}}
                    value='Supported labels'
                >
                    {props.model.labels.map(
                        (label) => <Select.Option key={label}>
                            {label}
                        </Select.Option>)
                    }
                </Select>
            </Col>
            <Col span={2}>
                <Text className='cvat-black-color'>Actions</Text>
                <Dropdown overlay={
                        <Menu subMenuCloseDelay={0.15} className='cvat-task-item-menu'>
                            <Menu.Item onClick={() => {
                                props.onDelete();
                            }}key='delete'>Delete</Menu.Item>
                        </Menu>
                    }>
                    <Icon className='cvat-task-item-menu-icon' component={subMenuIcon}/>
                </Dropdown>
            </Col>
        </Row>
    );
}
