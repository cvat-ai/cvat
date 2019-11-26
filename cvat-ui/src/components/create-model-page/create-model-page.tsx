import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import CreateModelContent from './create-model-content';
import { ModelFiles } from '../../reducers/interfaces';

interface Props {
    createModel(name: string, files: ModelFiles, global: boolean): void;
    isAdmin: boolean;
    modelCreatingError: string;
    modelCreatingStatus: string;
}

export default function CreateModelPageComponent(props: Props) {
    return (
        <Row type='flex' justify='center' align='top' className='cvat-create-model-form-wrapper'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>{`Upload a new model`}</Text>
                <CreateModelContent
                    isAdmin={props.isAdmin}
                    modelCreatingError={props.modelCreatingError}
                    modelCreatingStatus={props.modelCreatingStatus}
                    createModel={props.createModel}
                />
            </Col>
        </Row>
    );
}