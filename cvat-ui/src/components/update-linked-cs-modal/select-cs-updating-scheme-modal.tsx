// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState, useEffect } from 'react';
import Modal from 'antd/lib/modal';

import Button from 'antd/lib/button';

import { Storage, getCore } from 'cvat-core-wrapper';

import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';
import { updateProjectAsync, ProjectUpdateTypes } from 'actions/projects-actions';
import { updateTaskAsync, TaskUpdateTypes } from 'actions/tasks-actions';
import {
    closeLinkedCloudStorageUpdatingModal as closeTaskLinkedCloudStorageUpdatingModal,
} from '../../actions/tasks-actions';
import { projectActions } from '../../actions/projects-actions';

const core = getCore();

function SelectCSUpdatingSchemeModal(): JSX.Element {
    const task = useSelector((state: CombinedState) => state.tasks.updateWorkspace.instance);
    const project = useSelector((state: CombinedState) => state.projects.updateWorkspace.instance);

    const instance = task || project;
    const [instanceType, setInstanceType] = useState('');
    const dispatch = useDispatch();

    const saveInstance = useCallback(() => {
        if (instance instanceof core.classes.Project) {
            dispatch(updateProjectAsync(instance, ProjectUpdateTypes.UPDATE_ORGANIZATION));
        } else if (instance instanceof core.classes.Task) {
            dispatch(updateTaskAsync(instance, TaskUpdateTypes.UPDATE_ORGANIZATION));
        }
    }, [instance]);

    const closeModal = useCallback(() => {
        if (instance instanceof core.classes.Project) {
            dispatch(projectActions.closeLinkedCloudStorageUpdatingModal());
        } else if (instance instanceof core.classes.Task) {
            dispatch(closeTaskLinkedCloudStorageUpdatingModal());
        }
    }, [instance]);

    useEffect(() => {
        if (instance) {
            setInstanceType(instance.constructor.name.toLowerCase());
        }
    }, [instance]);

    return (
        <Modal
            title={`A ${instanceType} #${instance?.id} is linked with a cloud storage`}
            className='cvat-modal-choose-cloud-storage-change-scheme'
            open={!!instance}
            footer={[
                <Button key='cancel' onClick={() => closeModal()}>
                    Cancel
                </Button>,
                <Button
                    key='move_and_detach'
                    type='primary'
                    onClick={() => {
                        if (instance!.sourceStorage?.isCloudLinked()) {
                            instance!.sourceStorage = Storage.buildLocalStorage();
                        }
                        if (instance!.targetStorage?.isCloudLinked()) {
                            instance!.targetStorage = Storage.buildLocalStorage();
                        }
                        saveInstance();
                        closeModal();
                    }}
                >
                    Move & detach
                </Button>,
                <Button
                    key='move_and_auto_match'
                    type='primary'
                    onClick={() => {
                        saveInstance();
                        closeModal();
                    }}
                >
                    Move & auto match
                </Button>,
            ]}
        >
            This task is linked with cloud storage.
            Please choose how the transfer should be done.
        </Modal>
    );
}

export default React.memo(SelectCSUpdatingSchemeModal);
