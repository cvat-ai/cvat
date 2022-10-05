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
import { useHistory } from 'react-router';

interface Props {
    projectInstance: any;
}

export default function ProjectActionsMenuComponent(props: Props): JSX.Element {
    const { projectInstance } = props;

    const history = useHistory();
    const dispatch = useDispatch();
    const exportBackupIsActive = useSelector((state: CombinedState) => (
        state.export.projects.backup.current[projectInstance.id]
    ));

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
            <Menu.Item key='export-dataset' onClick={() => dispatch(exportActions.openExportDatasetModal(projectInstance))}>
                Export dataset
            </Menu.Item>
            <Menu.Item key='import-dataset' onClick={() => dispatch(importActions.openImportDatasetModal(projectInstance))}>
                Import dataset
            </Menu.Item>
            <Menu.Item
                disabled={exportBackupIsActive}
                onClick={() => dispatch(exportActions.openExportBackupModal(projectInstance))}
                icon={exportBackupIsActive && <LoadingOutlined id='cvat-export-project-loading' />}
            >
                Backup Project
            </Menu.Item>
            <Menu.Item key='set-webhooks'>
                <a
                    href={`/projects/${projectInstance.id}/webhooks`}
                    onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        history.push({
                            pathname: `/projects/${projectInstance.id}/webhooks`,
                        });
                        return false;
                    }}
                >
                    Setup webhooks
                </a>
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key='delete' onClick={onDeleteProject}>
                Delete
            </Menu.Item>
        </Menu>
    );
}
