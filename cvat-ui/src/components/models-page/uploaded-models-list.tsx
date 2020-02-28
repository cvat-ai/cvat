// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import { Model } from 'reducers/interfaces';
import UploadedModelItem from './uploaded-model-item';


interface Props {
    registeredUsers: any[];
    models: Model[];
    deleteModel(id: number): void;
}

export default function UploadedModelsListComponent(props: Props): JSX.Element {
    const {
        models,
        registeredUsers,
        deleteModel,
    } = props;

    const items = models.map((model): JSX.Element => {
        const owner = registeredUsers.filter((user) => user.id === model.ownerID)[0];
        return (
            <UploadedModelItem
                key={model.id as number}
                owner={owner}
                model={model}
                onDelete={(): void => deleteModel(model.id as number)}
            />
        );
    });

    return (
        <>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Text className='cvat-text-color' strong>Uploaded by a user</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14} className='cvat-models-list'>
                    <Row type='flex' align='middle' style={{ padding: '10px' }}>
                        <Col span={4} xxl={3}>
                            <Text strong>Framework</Text>
                        </Col>
                        <Col span={5} xxl={7}>
                            <Text strong>Name</Text>
                        </Col>
                        <Col span={3}>
                            <Text strong>Owner</Text>
                        </Col>
                        <Col span={4}>
                            <Text strong>Uploaded</Text>
                        </Col>
                        <Col span={5}>
                            <Text strong>Labels</Text>
                        </Col>
                        <Col span={3} xxl={2} />
                    </Row>
                    { items }
                </Col>
            </Row>
        </>
    );
}
