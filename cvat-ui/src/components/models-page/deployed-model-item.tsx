// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import { MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import Title from 'antd/lib/typography/Title';
import Meta from 'antd/lib/card/Meta';
import Preview from 'components/common/preview';
import moment from 'moment';
import Divider from 'antd/lib/divider';
import Card from 'antd/lib/card';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import ModelActionsMenuComponent from './models-action-menu';
import ModelProviderIcon from './model-provider-icon';

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
    const icon = <ModelProviderIcon providerName={provider} />;
    const modelDescription = model.provider !== ModelProviders.CVAT ?
        <Text type='secondary'>{`Added ${created}`}</Text> :
        <Text type='secondary'>System model</Text>;
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
                    {modelDescription}
                </div>
                <Divider />
                {
                    model.labels?.length ? (
                        <>
                            <div className='cvat-model-info-container'>
                                <Text className='cvat-model-info-modal-labels-title'>Labels:</Text>
                            </div>
                            <div className='cvat-model-info-container cvat-model-info-modal-labels-list'>
                                {model.labels.map((label) => <Tag key={label}>{label}</Tag>)}
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
                                {model.kind}
                            </Col>
                        </Row>
                    </Col>
                    {model.owner && (
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
                    )}
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
                                {model.owner && (<Text strong>{model.owner}</Text>)}
                                {modelDescription}
                            </Row>
                            {
                                model.provider !== ModelProviders.CVAT && (
                                    <Dropdown overlay={<ModelActionsMenuComponent model={model} onDelete={onDelete} />}>
                                        <Button className='cvat-deployed-model-details-button' type='link' size='large' icon={<MoreOutlined />} />
                                    </Dropdown>
                                )
                            }
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
