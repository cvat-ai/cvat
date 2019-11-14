import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import CreateTaskContent from './create-task-content';

export default function CreateTaskPage() {
    return (
        <Row type='flex' justify='center' align='top' className='cvat-create-task-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'> Create a new task</Text>
                <CreateTaskContent/>
            </Col>
        </Row>
    );
}
