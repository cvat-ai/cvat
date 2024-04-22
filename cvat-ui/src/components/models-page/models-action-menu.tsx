// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import { deleteModelAsync } from 'actions/models-actions';

interface Props {
    model: MLModel;
    onDelete: () => void;
}

export default function ModelActionsMenuComponent(props: Props): JSX.Element {
    const { model, onDelete } = props;
    const { provider } = model;
    const cvatProvider = provider === ModelProviders.CVAT;

    const dispatch = useDispatch();

    const onDeleteModel = useCallback((): void => {
        Modal.confirm({
            title: `The model ${model.name} will be deleted`,
            content: 'You will not be able to use it anymore. Continue?',
            className: 'cvat-modal-confirm-remove-model',
            onOk: () => {
                dispatch(deleteModelAsync(model));
                onDelete();
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, []);

    const onOpenUrl = useCallback((): void => {
        window.open(model.url, '_blank');
    }, []);

    return (
        <Menu selectable={false} className='cvat-project-actions-menu'>
            {
                !cvatProvider && (
                    <Menu.Item key='open' onClick={onOpenUrl}>
                        Open model URL
                    </Menu.Item>
                )
            }
            {
                !cvatProvider && (
                    <>
                        <Menu.Divider />
                        <Menu.Item key='delete' onClick={onDeleteModel}>
                            Delete
                        </Menu.Item>
                    </>
                )
            }
        </Menu>
    );
}
