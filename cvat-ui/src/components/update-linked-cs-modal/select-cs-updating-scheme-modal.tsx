// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import Space from 'antd/lib/space';
import Button from 'antd/lib/button';
import Alert from 'antd/lib/alert';

import { CombinedState } from 'reducers';
import { Storage, Task } from 'cvat-core-wrapper';
import { cloudStoragesActions } from 'actions/cloud-storage-actions';
import CVATTooltip from 'components/common/cvat-tooltip';

function SelectCSUpdatingSchemeModal(): JSX.Element | null {
    const {
        instances,
        onUpdate,
    } = useSelector((state: CombinedState) => ({
        instances: state.cloudStorages.updateWorkspace.instances,
        onUpdate: state.cloudStorages.updateWorkspace.onUpdate!,
    }), shallowEqual);

    const [instanceType, setInstanceType] = useState('');
    const dispatch = useDispatch();

    const closeModal = () => {
        dispatch(cloudStoragesActions.closeLinkedCloudStorageUpdatingModal());
    };

    useEffect(() => {
        if (instances?.length) {
            setInstanceType(instances[0] instanceof Task ? 'task' : 'project');
        }
    }, [instances]);

    if (!instances) {
        return null;
    }

    const capitalizedInstanceType = instanceType.charAt(0).toUpperCase() + instanceType.slice(1);
    const alert = 'Data-linked storage will only be reset during the transfer and must be updated manually afterward';
    const message = instances.length > 1 ?
        'Some resources are linked to a cloud storage' :
        `${capitalizedInstanceType} #${instances[0].id} is linked to a cloud storage`;

    return (
        <Modal
            title={(
                <Space>
                    {message}
                    <CVATTooltip
                        title={(
                            <>
                                <div>
                                    <strong>Move & Detach</strong>
                                    : Transfer and unlink from a cloud storage.
                                </div>
                                <div>
                                    <strong>Move & Auto Match</strong>
                                    : Transfer and attempt to auto-link with a similar cloud storage
                                     in the target workspace. A similar cloud storage is defined
                                     by comparing the whole cloud storage configuration except credentials
                                     and owner.
                                </div>
                            </>
                        )}
                    >
                        <QuestionCircleOutlined className='cvat-choose-cloud-storage-change-scheme-help-button' />
                    </CVATTooltip>
                </Space>
            )}
            className='cvat-modal-choose-cloud-storage-change-scheme'
            closable={false}
            open
            footer={[
                <Button key='cancel' onClick={() => closeModal()}>
                    Cancel
                </Button>,
                <Button
                    key='move_and_detach'
                    type='primary'
                    onClick={() => {
                        instances.forEach((instance) => {
                            if (instance.sourceStorage.isCloudLinked()) {
                                instance.sourceStorage = Storage.buildLocalStorage();
                            }

                            if (instance.targetStorage.isCloudLinked()) {
                                instance.targetStorage = Storage.buildLocalStorage();
                            }
                        });

                        closeModal();
                        onUpdate();
                    }}
                >
                    Move & detach
                </Button>,
                // do not show option "move and auto match" when only data storage is linked
                (
                    instances.some((instance) => (
                        instance.sourceStorage.isCloudLinked() || instance.targetStorage.isCloudLinked()
                    ))
                ) && (
                    <Button
                        key='move_and_auto_match'
                        type='primary'
                        onClick={() => {
                            closeModal();
                            onUpdate();
                        }}
                    >
                        Move & Auto match
                    </Button>
                ),
            ]}
        >
            {
                (
                    instances.some((instance) => (
                        instance instanceof Task && instance.cloudStorageId &&
                        (instance.sourceStorage.isCloudLinked() || instance.targetStorage.isCloudLinked())
                    ))
                ) && (
                    <Alert
                        message={alert}
                        type='warning'
                    />
                )
            }

            <p>
                Please choose how you would like the transfer to be done.
            </p>
        </Modal>
    );
}

export default React.memo(SelectCSUpdatingSchemeModal);
