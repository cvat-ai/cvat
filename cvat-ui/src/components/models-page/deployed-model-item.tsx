// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import Icon, { MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import { MLModel } from 'cvat-core-wrapper';
import {
    Card, Dropdown, Button, Divider,
} from 'antd';
import Title from 'antd/lib/typography/Title';
import { RoboflowIcon, HuggingFaceIcon } from 'icons';
import Meta from 'antd/lib/card/Meta';
import Preview from 'components/common/preview';
import moment from 'moment';
import ModelActionsMenuComponent from './models-action-menu';

interface Props {
    model: MLModel;
}

export default function DeployedModelItem(props: Props): JSX.Element {
    const { model } = props;
    const { provider } = model;
    const [isRemoved, setIsRemoved] = useState(false);
    const [isModalShown, setIsModalShown] = useState(false);

    const onOpenModel = () => {
        setIsModalShown(true);
    };
    const onCloseModel = () => {
        setIsModalShown(false);
    };

    const onDelete = useCallback(() => {
        setIsRemoved(true);
    }, []);

    const created = moment(model.createdDate).fromNow();
    // TODO tmp solution, need to get it from server
    let icon: JSX.Element | null = null;
    if (provider === 'roboflow') {
        icon = <Icon component={RoboflowIcon} />;
    }
    if (provider === 'huggingface') {
        icon = <Icon component={HuggingFaceIcon} />;
    }
    return (
        <>
            <Modal
                className='cvat-model-info-modal'
                title='Model'
                visible={isModalShown}
                onCancel={onCloseModel}
                footer={null}
            >
                <Preview
                    model={model}
                    loadingClassName='cvat-model-item-loading-preview'
                    emptyPreviewClassName='cvat-model-item-empty-preview'
                    previewWrapperClassName='cvat-models-item-card-preview-wrapper'
                    previewClassName='cvat-models-item-card-preview'
                />
                {icon ? <div className='cvat-model-item-provider-inner'>{icon}</div> : null}
                <div className='cvat-model-info-container'>
                    <Title level={3}>{model.name}</Title>
                    <Text type='secondary'>{`Added ${created}`}</Text>
                </div>
                <Divider />
                {
                    model.labels.length ? (
                        <>
                            <div className='cvat-model-info-container'>
                                <Text className='cvat-model-info-modal-labels-title'>Labels:</Text>
                            </div>
                            <div className='cvat-model-info-container cvat-model-info-modal-labels-list'>
                                {model.labels.map((label) => <Tag>{label}</Tag>)}
                            </div>
                            <Divider />
                        </>
                    ) : null
                }
                <Row justify='space-between' className='cvat-model-info-container'>
                    <Col span={15}>
                        <Row>
                            <Col span={8}>
                                <Text strong>Provider</Text>
                            </Col>
                            <Col>
                                <Text strong>Type</Text>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8}>
                                {model.provider}
                            </Col>
                            <Col>
                                {model.type}
                            </Col>
                        </Row>
                    </Col>
                    <Col>
                        <Row>
                            <Col>
                                <Text strong>Owner</Text>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                {model.owner}
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Modal>
            <Card
                cover={(
                    <Preview
                        model={model}
                        loadingClassName='cvat-model-item-loading-preview'
                        emptyPreviewClassName='cvat-model-item-empty-preview'
                        previewWrapperClassName='cvat-models-item-card-preview-wrapper'
                        previewClassName='cvat-models-item-card-preview'
                        onClick={onOpenModel}
                    />
                )}
                size='small'
                className={`cvat-models-item-card ${isRemoved ? 'cvat-models-item-card-removed' : ''} `}
            >
                <Meta
                    title={(
                        <span onClick={onOpenModel} className='cvat-models-item-title' aria-hidden>
                            {model.name}
                        </span>
                    )}
                    description={(
                        <div className='cvat-models-item-description'>
                            <Row onClick={onOpenModel} className='cvat-models-item-text-description'>
                                <Text strong>{model.owner}</Text>
                                <Text type='secondary'>{` Added ${created}`}</Text>
                            </Row>
                            <Dropdown overlay={<ModelActionsMenuComponent model={model} onDelete={onDelete} />}>
                                <Button type='link' size='large' icon={<MoreOutlined />} />
                            </Dropdown>
                        </div>
                    )}
                />
                {
                    icon ? <div className='cvat-model-item-provider'>{icon}</div> : null
                }
            </Card>
        </>
    );
}
