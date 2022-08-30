// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';
import { LoadingOutlined } from '@ant-design/icons';
import { CombinedState } from 'reducers';
import { deleteProjectAsync } from 'actions/projects-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';

interface Props {
    projectInstance: any;
}

export default function ProjectActionsMenuComponent(props: Props): JSX.Element {
    const { projectInstance } = props;

    const dispatch = useDispatch();
    const activeExports = useSelector((state: CombinedState) => state.export.projects);
    const exportBackupIsActive = projectInstance.id in activeExports && activeExports[projectInstance.id].backup;

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
            <Menu.Item key='export-dataset' onClick={() => dispatch(exportActions.openExportModal(projectInstance, 'dataset'))}>
                Export dataset
            </Menu.Item>
            <Menu.Item key='import-dataset' onClick={() => dispatch(importActions.openImportDatasetModal(projectInstance))}>
                Import dataset
            </Menu.Item>
            <Menu.Item
                disabled={exportBackupIsActive}
                onClick={() => dispatch(exportActions.openExportModal(projectInstance, 'backup'))}
                icon={exportBackupIsActive && <LoadingOutlined id='cvat-export-project-loading' />}
            >
                Backup Project
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key='delete' onClick={onDeleteProject}>
                Delete
            </Menu.Item>
        </Menu>
    );
}
