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
                                    <strong>移动并分离</strong>
                                    ：传输并从云存储取消链接。
                                </div>
                                <div>
                                    <strong>移动并自动匹配</strong>
                                    ：传输并尝试与目标工作区中的类似云存储自动链接。
                                     类似的云存储是通过比较除凭据
                                     和所有者之外的整个云存储配置来定义的。
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
                    取消
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
                    移动并分离
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
                        移动并自动匹配
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
                请选择你希望执行传输的方式。
            </p>
        </Modal>
    );
}

export default React.memo(SelectCSUpdatingSchemeModal);

