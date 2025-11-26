// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Row, Col } from 'antd/lib/grid';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import { MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Title from 'antd/lib/typography/Title';
import Meta from 'antd/lib/card/Meta';
import Divider from 'antd/lib/divider';
import Card from 'antd/lib/card';
import Button from 'antd/lib/button';

import Preview from 'components/common/preview';
import { useCardHeightHOC, useContextMenuClick, usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import ModelActionsComponent from './actions-menu';

interface Props {
    model: MLModel;
    selected: boolean;
    onClick: (event: React.MouseEvent) => boolean;
}

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-models-page',
    siblingClassNames: ['cvat-models-pagination', 'cvat-models-page-top-bar'],
    paddings: 72,
    minHeight: 200,
    numberOfRows: 3,
});

export default function DeployedModelItem(props: Readonly<Props>): JSX.Element {
    const { model, selected, onClick } = props;
    const [isModalShown, setIsModalShown] = useState(false);
    const height = useCardHeight();
    const { itemRef, handleContextMenuClick } = useContextMenuClick<HTMLDivElement>();
    const style: React.CSSProperties = { height };

    const systemModel = model.provider === ModelProviders.CVAT;
    const onOpenModel = (event: React.MouseEvent): void => {
        const cancel = !systemModel ? onClick(event) : false;
        if (!cancel) {
            setIsModalShown(true);
        }
    };
    const onCloseModel = (): void => {
        setIsModalShown(false);
    };

    const created = dayjs(model.createdDate).fromNow();
    const modelDescription = !systemModel ?
        <Text type='secondary'>{`Added ${created}`}</Text> :
        <Text type='secondary'>System model</Text>;

    const topBarItems: [JSX.Element, number][] = [];

    const topBarPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.modelsPage.modelItem.topBar.menu.items, props,
    );

    topBarItems.push(
        ...topBarPlugins.map(({ component: Component, weight }, index) => (
            [<Component key={index} targetProps={props} />, weight] as [JSX.Element, number]
        )),
    );
    const modelTopBar = (
        <div className='cvat-model-item-top-bar'>
            {topBarItems.sort((item1, item2) => item1[1] - item2[1])
                .map((item) => item[0])}
        </div>
    );

    const cardClassName = `cvat-models-item-card${selected ? ' cvat-item-selected' : ''}`;

    return (
        <>
            <Modal
                className='cvat-model-info-modal'
                title='Model'
                open={isModalShown}
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
                    <Title level={3}>
                        {model.provider !== ModelProviders.CVAT && `#${model.id}: `}
                        {model.name}
                    </Title>
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
                                {model.displayKind}
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
            <ModelActionsComponent
                model={model}
                dropdownTrigger={['contextMenu']}
                triggerElement={(menuItems) => (
                    <Card
                        ref={itemRef}
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
                        style={style}
                        size='small'
                        className={cardClassName}
                        hoverable
                    >
                        <Meta
                            title={(
                                <Text ellipsis={{ tooltip: model.name }} onClick={onOpenModel} className='cvat-models-item-title' aria-hidden>
                                    {model.provider !== ModelProviders.CVAT && `#${model.id}: `}
                                    {model.name}
                                </Text>
                            )}
                            description={(
                                <div className='cvat-models-item-description'>
                                    <Row onClick={onOpenModel} className='cvat-models-item-text-description'>
                                        {model.owner && (
                                            <>
                                                <Text type='secondary'>{`Created by ${model.owner}`}</Text>
                                                <br />
                                            </>
                                        )}
                                        {modelDescription}
                                    </Row>
                                    {
                                        (menuItems.length > 0) ? (
                                            <Button
                                                className='cvat-deployed-model-details-button cvat-actions-menu-button'
                                                type='link'
                                                size='large'
                                                icon={<MoreOutlined />}
                                                onClick={handleContextMenuClick}
                                            />
                                        ) : null
                                    }
                                </div>
                            )}
                        />
                        { modelTopBar }
                    </Card>
                )}
            />
        </>
    );
}
