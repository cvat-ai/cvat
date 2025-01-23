// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import { CombinedState } from 'reducers';
import { deleteProjectAsync } from 'actions/projects-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';
import { useHistory } from 'react-router';
import Menu from 'components/dropdown-menu';

import { usePlugins } from 'utils/hooks';

interface Props {
    projectInstance: any;
}

function ProjectActionsMenuComponent(props: Props): JSX.Element {
    const { projectInstance } = props;

    const history = useHistory();
    const dispatch = useDispatch();
    const plugins = usePlugins((state: CombinedState) => state.plugins.components.projectActions.items, props);

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

    const menuItems: [JSX.Element, number][] = [];
    menuItems.push([(
        <Menu.Item key='export-dataset' onClick={() => dispatch(exportActions.openExportDatasetModal(projectInstance))}>
            Export dataset
        </Menu.Item>
    ), 0]);

    menuItems.push([(
        <Menu.Item key='import-dataset' onClick={() => dispatch(importActions.openImportDatasetModal(projectInstance))}>
            Import dataset
        </Menu.Item>
    ), 10]);

    menuItems.push([(
        <Menu.Item
            key='backup-project'
            onClick={() => dispatch(exportActions.openExportBackupModal(projectInstance))}
        >
            Backup Project
        </Menu.Item>
    ), 20]);

    menuItems.push([(
        <Menu.Item key='view-analytics'>
            <a
                href={`/projects/${projectInstance.id}/analytics`}
                onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    history.push({
                        pathname: `/projects/${projectInstance.id}/analytics`,
                    });
                    return false;
                }}
            >
                View analytics
            </a>
        </Menu.Item>
    ), 30]);

    menuItems.push([(
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
    ), 40]);

    menuItems.push([(
        <React.Fragment key='delete'>
            <Menu.Divider />
            <Menu.Item key='delete' onClick={onDeleteProject}>
                Delete
            </Menu.Item>
        </React.Fragment>
    ), 50]);

    menuItems.push(
        ...plugins.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: props });
            return [menuItem, weight] as [JSX.Element, number];
        }),
    );

    return (
        <Menu selectable={false} className='cvat-project-actions-menu'>
            { menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1])
                .map((menuItem) => menuItem[0]) }
        </Menu>
    );
}

export default React.memo(ProjectActionsMenuComponent);
