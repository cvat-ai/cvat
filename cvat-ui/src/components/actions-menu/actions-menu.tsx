// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useCallback } from 'react';
import Menu from 'antd/lib/menu';
import Modal from 'antd/lib/modal';
import { LoadingOutlined } from '@ant-design/icons';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import { DimensionType } from '../../reducers';

interface Props {
    taskID: number;
    taskMode: string;
    bugTracker: string;
    loaders: any[];
    dumpers: any[];
    inferenceIsActive: boolean;
    taskDimension: DimensionType;
    backupIsActive: boolean;
    onClickMenu: (params: MenuInfo) => void;
}

export enum Actions {
    LOAD_TASK_ANNO = 'load_task_anno',
    EXPORT_TASK_DATASET = 'export_task_dataset',
    DELETE_TASK = 'delete_task',
    RUN_AUTO_ANNOTATION = 'run_auto_annotation',
    MOVE_TASK_TO_PROJECT = 'move_task_to_project',
    OPEN_BUG_TRACKER = 'open_bug_tracker',
    BACKUP_TASK = 'backup_task',
}

function ActionsMenuComponent(props: Props): JSX.Element {
    const {
        taskID,
        bugTracker,
        inferenceIsActive,
        backupIsActive,
        onClickMenu,
    } = props;

    const onClickMenuWrapper = useCallback(
        (params: MenuInfo) => {
            if (!params) {
                return;
            }

            if (params.key === Actions.DELETE_TASK) {
                Modal.confirm({
                    title: `The task ${taskID} will be deleted`,
                    content: 'All related data (images, annotations) will be lost. Continue?',
                    className: 'cvat-modal-confirm-delete-task',
                    onOk: () => {
                        onClickMenu(params);
                    },
                    okButtonProps: {
                        type: 'primary',
                        danger: true,
                    },
                    okText: 'Delete',
                });
            } else {
                onClickMenu(params);
            }
        },
        [taskID],
    );

    return (
        <Menu selectable={false} className='cvat-actions-menu' onClick={onClickMenuWrapper}>
            <Menu.Item key={Actions.LOAD_TASK_ANNO}>Upload annotations</Menu.Item>
            <Menu.Item key={Actions.EXPORT_TASK_DATASET}>Export task dataset</Menu.Item>
            {!!bugTracker && <Menu.Item key={Actions.OPEN_BUG_TRACKER}>Open bug tracker</Menu.Item>}
            <Menu.Item disabled={inferenceIsActive} key={Actions.RUN_AUTO_ANNOTATION}>
                Automatic annotation
            </Menu.Item>
            <Menu.Item
                key={Actions.BACKUP_TASK}
                disabled={backupIsActive}
                icon={backupIsActive && <LoadingOutlined id='cvat-backup-task-loading' />}
            >
                Backup Task
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key={Actions.MOVE_TASK_TO_PROJECT}>Move to project</Menu.Item>
            <Menu.Item key={Actions.DELETE_TASK}>Delete</Menu.Item>
        </Menu>
    );
}

export default React.memo(ActionsMenuComponent);
