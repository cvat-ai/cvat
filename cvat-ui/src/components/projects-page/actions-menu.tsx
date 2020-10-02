// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';

import { deleteProjectAsync } from 'actions/projects-actions';

interface Props {
    projectInstance: any;
}

export default function ProjectActionsMenuComponent(props: Props): JSX.Element {
    const { projectInstance: instance } = props;

    const dispatch = useDispatch();

    const onDeleteProject = (): void => {
        Modal.confirm({
            title: `The project ${instance.id} will be deleted`,
            content: 'All related data (images, annotations) will be lost. Continue?',
            onOk: () => {
                dispatch(deleteProjectAsync(instance));
            },
            okButtonProps: {
                type: 'danger',
            },
            okText: 'Delete',
        });
    };

    return (
        <Menu className='cvat-project-actions-menu'>
            <hr />
            <Menu.Item onClick={onDeleteProject}>
                Delete
            </Menu.Item>
        </Menu>
    );
}
