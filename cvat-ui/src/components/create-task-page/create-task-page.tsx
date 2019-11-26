import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import CreateTaskContent, { CreateTaskData } from './create-task-content';

interface Props {
    onCreate: (data: CreateTaskData) => void;
    error: string;
    status: string;
    installedGit: boolean;
}

export default function CreateTaskPage(props: Props) {
    return (
        <Row type='flex' justify='center' align='top' className='cvat-create-task-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>{'Create a new task'}</Text>
                <CreateTaskContent
                    status={props.status}
                    error={props.error}
                    onCreate={props.onCreate}
                    installedGit={props.installedGit}
                />
            </Col>
        </Row>
    );
}
