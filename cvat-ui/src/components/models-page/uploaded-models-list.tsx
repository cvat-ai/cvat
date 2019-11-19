import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import UploadedModelsItem from './uploaded-model-item';
import { Model } from '../../reducers/interfaces';

interface Props {
    models: Model[];
}

export default function IntegratedModelsListComponent(props: Props) {
    const items = props.models.map((model) =>
        <UploadedModelsItem key={model.id as number} model={model}/>
    );

    return (
        <>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Text strong>{'Uploaded by a user'}</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14} className='cvat-task-list'>
                { items }
                </Col>
            </Row>
        </>
    );
}
