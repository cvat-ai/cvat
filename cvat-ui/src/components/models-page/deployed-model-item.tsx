// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import dayjs from 'dayjs';
import Tag from 'antd/lib/tag';
import Text from 'antd/lib/typography/Text';
import { MoreOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Title from 'antd/lib/typography/Title';
import Divider from 'antd/lib/divider';
import Button from 'antd/lib/button';
import { MenuProps } from 'antd/lib/menu';

import Preview from 'components/common/preview';
import ResourceCard from 'components/common/resource-card';
import { useCardHeightHOC, useContextMenuClick } from 'utils/hooks';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import ModelActionsComponent from './actions-menu';

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-models-page',
    siblingClassNames: ['cvat-models-pagination', 'cvat-models-page-top-bar'],
    paddings: 72,
    minHeight: 200,
    numberOfRows: 3,
});

interface Props {
    model: MLModel;
    selected: boolean;
    onClick: (event: React.MouseEvent) => boolean;
}

function DeployedModelItem(props: Readonly<Props>): JSX.Element {
    const { model, selected, onClick } = props;
    const [isModalShown, setIsModalShown] = useState(false);
    const height = useCardHeight();
    const { itemRef, handleContextMenuClick, handleContextMenuCapture } = useContextMenuClick<HTMLDivElement>();

    const systemModel = model.provider === ModelProviders.CVAT;
    const onOpenModel = (event: React.MouseEvent): void => {
        const cancel = !systemModel && onClick(event);
        if (!cancel) {
            setIsModalShown(true);
        }
    };
    const onCloseModel = (): void => {
        setIsModalShown(false);
    };

    const created = dayjs(model.createdDate).fromNow();
    const providerName = systemModel ? 'CVAT' : model.provider;

    const card = (menuItems: NonNullable<MenuProps['items']>): JSX.Element => (
        <ResourceCard
            cardRef={itemRef}
            id={typeof model.id === 'number' ? model.id : undefined}
            preview={(
                <Preview
                    model={model}
                    loadingClassName='cvat-model-item-loading-preview'
                    emptyPreviewClassName='cvat-model-item-empty-preview'
                    previewWrapperClassName='cvat-models-item-card-preview-wrapper'
                    previewClassName='cvat-models-item-card-preview'
                />
            )}
            tags={[
                { key: 'provider', content: providerName },
                { key: 'kind', content: model.displayKind },
            ]}
            title={(
                <Text ellipsis={{ tooltip: model.name }} className='cvat-models-item-title'>
                    {model.name}
                </Text>
            )}
            contentClassName='cvat-models-item-description'
            menu={menuItems.length ? (
                <Button
                    className='cvat-deployed-model-details-button cvat-actions-menu-button'
                    type='text'
                    icon={<MoreOutlined />}
                    onClick={handleContextMenuClick}
                />
            ) : undefined}
            selected={!systemModel && selected}
            className='cvat-models-item-card'
            style={{ height }}
            onClick={onOpenModel}
            onContextMenuCapture={handleContextMenuCapture}
        />
    );

    return (
        <>
            <Modal
                className='cvat-model-info-modal'
                title={null}
                open={isModalShown}
                onCancel={onCloseModel}
                footer={null}
                width={720}
            >
                <div className='cvat-model-info-hero'>
                    <Preview
                        model={model}
                        loadingClassName='cvat-model-info-loading-preview'
                        emptyPreviewClassName='cvat-model-info-empty-preview'
                        previewWrapperClassName='cvat-model-info-preview-wrapper'
                        previewClassName='cvat-model-info-preview'
                    />
                    <div className='cvat-model-info-hero-content'>
                        <div className='cvat-model-info-hero-tags'>
                            <Tag>{providerName}</Tag>
                            <Tag>{model.displayKind}</Tag>
                        </div>
                        <Title level={2}>
                            {model.name}
                        </Title>
                    </div>
                </div>
                <div className='cvat-model-info-content'>
                    <Text className='cvat-model-info-description'>
                        {model.description || 'No description is available for this model.'}
                    </Text>
                    {
                        !systemModel && (
                            <div className='cvat-model-info-external-meta'>
                                {model.owner && (
                                    <Text
                                        type='secondary'
                                        ellipsis={{ tooltip: `Created by ${model.owner}` }}
                                        className='cvat-model-info-owner'
                                    >
                                        {`Created by ${model.owner}`}
                                    </Text>
                                )}
                                {model.owner && <span />}
                                <Text type='secondary'>{`Added ${created}`}</Text>
                            </div>
                        )
                    }
                    {
                        model.labels?.length ? (
                            <>
                                <Divider />
                                <div className='cvat-model-info-labels-heading'>
                                    <Text strong>Labels</Text>
                                    <Text type='secondary'>{model.labels.length}</Text>
                                </div>
                                <div className='cvat-model-info-modal-labels-list'>
                                    {model.labels.map((label) => <Tag key={label.name}>{label.name}</Tag>)}
                                </div>
                            </>
                        ) : null
                    }
                </div>
            </Modal>
            <ModelActionsComponent
                model={model}
                dropdownTrigger={['contextMenu']}
                triggerElement={card}
            />
        </>
    );
}

export default React.memo(DeployedModelItem);
