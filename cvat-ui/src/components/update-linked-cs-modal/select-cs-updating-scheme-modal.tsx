// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState, useEffect } from 'react';
import Modal from 'antd/lib/modal';

import Button from 'antd/lib/button';

import { Storage, getCore } from 'cvat-core-wrapper';

import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';
import { updateProjectAsync, projectActions } from 'actions/projects-actions';
import {
    updateTaskAsync, closeLinkedCloudStorageUpdatingModal as closeTaskLinkedCloudStorageUpdatingModal,
} from 'actions/tasks-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import Space from 'antd/lib/space';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { ResourceUpdateTypes } from 'utils/enums';

const core = getCore();

function SelectCSUpdatingSchemeModal(): JSX.Element {
    const task = useSelector((state: CombinedState) => state.tasks.activities.updates.current);
    const project = useSelector((state: CombinedState) => state.projects.activities.updates.current);

    const instance = task || project;
    const [instanceType, setInstanceType] = useState('');
    const dispatch = useDispatch();

    const saveInstance = useCallback(() => {
        if (instance instanceof core.classes.Project) {
            dispatch(updateProjectAsync(instance, ResourceUpdateTypes.UPDATE_ORGANIZATION));
        } else if (instance instanceof core.classes.Task) {
            dispatch(updateTaskAsync(instance, {}, ResourceUpdateTypes.UPDATE_ORGANIZATION));
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
            title={(
                <Space>
                    {`${instanceType.charAt(0).toUpperCase() + instanceType.slice(1)}
                        #${instance?.id} is linked to cloud storage`}
                    <CVATTooltip
                        title={(
                            <>
                                <div>
                                    <strong>Move & Detach</strong>
                                    : Transfer and unlink a resource from a cloud storage.
                                </div>
                                <div>
                                    <strong>Move & Auto-match</strong>
                                    : Transfer and attempt to auto-link with a similar cloud storage
                                     in the target workspace. A similar cloud storage is defined
                                     by comparing the whole cloud storage configuration except credentials
                                     and owner when resource is transferring into an organization.
                                </div>
                            </>
                        )}
                    >
                        <QuestionCircleOutlined className='cvat-choose-cloud-storage-change-scheme-help-button' />
                    </CVATTooltip>
                </Space>
            )}
            className='cvat-modal-choose-cloud-storage-change-scheme'
            open={!!instance}
            closable={false}
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
            <p>
                This
                {' '}
                {instanceType}
                {' '}
                is linked to cloud storage.
                Please choose how you would like the transfer to be done.
            </p>
        </Modal>
    );
}

export default React.memo(SelectCSUpdatingSchemeModal);
