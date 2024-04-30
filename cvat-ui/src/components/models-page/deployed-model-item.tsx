// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { Row, Col } from 'antd/lib/grid';

import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import { MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Title from 'antd/lib/typography/Title';
import Meta from 'antd/lib/card/Meta';
import moment from 'moment';
import Divider from 'antd/lib/divider';
import Card from 'antd/lib/card';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';

import Menu from 'components/dropdown-menu';
import Preview from 'components/common/preview';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';

interface Props {
    model: MLModel;
}

export default function DeployedModelItem(props: Props): JSX.Element {
    const { model } = props;
    const [isModalShown, setIsModalShown] = useState(false);

    const onOpenModel = (): void => {
        setIsModalShown(true);
    };
    const onCloseModel = (): void => {
        setIsModalShown(false);
    };

    const created = moment(model.createdDate).fromNow();
    const modelDescription = model.provider !== ModelProviders.CVAT ?
        <Text type='secondary'>{`Added ${created}`}</Text> :
        <Text type='secondary'>System model</Text>;

    const menuItems: [JSX.Element, number][] = [];
    const topBarItems: [JSX.Element, number][] = [];

    const menuPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.modelsPage.modelItem.menu.items, props,
    );
    menuItems.push(
        ...menuPlugins.map(({ component: Component, weight }, index) => (
            [<Component key={index} targetProps={props} />, weight] as [JSX.Element, number]
        )),
    );
    const modelMenu = (
        <Menu selectable={false} className='cvat-project-actions-menu'>
            {menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1])
                .map((menuItem) => menuItem[0])}
        </Menu>
    );

    const topBarProps = {
        provider: model.provider,
    };
    const topBarPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.modelsPage.modelItem.topBar.menu.items, topBarProps,
    );
    topBarItems.push(
        ...topBarPlugins.map(({ component: Component, weight }, index) => (
            [<Component key={index} targetProps={topBarProps} />, weight] as [JSX.Element, number]
        )),
    );
    const modelTopBar = (
        <div className='cvat-model-item-top-bar'>
            {topBarItems.sort((item1, item2) => item1[1] - item2[1])
                .map((item) => item[0])}
        </div>
    );

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
                { modelTopBar }
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
                                {model.labels.map((label) => <Tag key={label.name}>{label.name}</Tag>)}
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
                className='cvat-models-item-card'
            >
                <Meta
                    title={(
                        <Text ellipsis={{ tooltip: model.name }} onClick={onOpenModel} className='cvat-models-item-title' aria-hidden>
                            {model.name}
                        </Text>
                    )}
                    description={(
                        <div className='cvat-models-item-description'>
                            <Row onClick={onOpenModel} className='cvat-models-item-text-description'>
                                {model.owner && (<Text strong>{model.owner}</Text>)}
                                {modelDescription}
                            </Row>
                            {
                                menuItems.length !== 0 && (
                                    <Dropdown
                                        trigger={['click']}
                                        destroyPopupOnHide
                                        overlay={modelMenu}
                                    >
                                        <Button className='cvat-deployed-model-details-button' type='link' size='large' icon={<MoreOutlined />} />
                                    </Dropdown>
                                )
                            }
                        </div>
                    )}
                />
                { modelTopBar }
            </Card>
        </>
    );
}
