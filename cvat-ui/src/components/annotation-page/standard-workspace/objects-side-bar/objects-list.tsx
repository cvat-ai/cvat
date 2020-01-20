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

import ObjectItem from './object-item';

interface Props {
    annotations: any[];
    onAnnotationsUpdated(annotations: any[]): void;
}

const Header = React.memo((): JSX.Element => (
    <div className='cvat-objects-sidebar-states-header'>
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
));


export default function ObjectsList(props: Props): JSX.Element {
    const {
        annotations,
        onAnnotationsUpdated,
    } = props;

    return (
        <>
            <Header />
            <div className='cvat-objects-sidebar-states-list'>
                { annotations.map((state: any) => (
                    <ObjectItem
                        key={state.clientID}
                        objectState={state}
                        onAnnotationsUpdated={onAnnotationsUpdated}
                        annotations={annotations}
                    />
                ))}
            </div>
        </>
    );
}
