// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';

import { deleteProjectAsync } from 'actions/projects-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';

interface Props {
    projectInstance: any;
}

export default function ProjectActionsMenuComponent(props: Props): JSX.Element {
    const { projectInstance } = props;

    const dispatch = useDispatch();

    const onDeleteProject = useCallback((): void => {
        Modal.confirm({
            title: `The project ${projectInstance.id} will be deleted`,
            content: 'All related data (images, annotations) will be lost. Continue?',
            className: 'cvat-modal-confirm-remove-project',
            onOk: () => {
                dispatch(deleteProjectAsync(projectInstance));
            },
            okButtonProps: {
                type: 'primary',
                danger: true,
            },
            okText: 'Delete',
        });
    }, []);

    return (
        <Menu selectable={false} className='cvat-project-actions-menu'>
            <Menu.Item key='export-dataset' onClick={() => dispatch(exportActions.openExportModal(projectInstance))}>
                Export dataset
            </Menu.Item>
            <Menu.Item key='import-dataset' onClick={() => dispatch(importActions.openImportModal(projectInstance))}>
                Import dataset
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key='delete' onClick={onDeleteProject}>
                Delete
            </Menu.Item>
        </Menu>
    );
}
