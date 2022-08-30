// Copyright (c) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'antd/lib/modal';
import Notification from 'antd/lib/notification';
import { useSelector, useDispatch } from 'react-redux';
import { LoadingOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';

import { CombinedState, StorageLocation } from 'reducers';
import { exportActions, exportBackupAsync } from 'actions/export-actions';
import { getCore, Storage, StorageData } from 'cvat-core-wrapper';

import TargetStorageField from 'components/storage/target-storage-field';

const core = getCore();

type FormValues = {
    customName: string | undefined;
    targetStorage: StorageData;
    useProjectTargetStorage: boolean;
};

const initialValues: FormValues = {
    customName: undefined,
    targetStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
    useProjectTargetStorage: true,
}

function ExportBackupModal(): JSX.Element | null {
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    const [instanceType, setInstanceType] = useState('');
    const [useDefaultStorage, setUseDefaultStorage] = useState(true);
    const [storageLocation, setStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageLocation, setDefaultStorageLocation] = useState(StorageLocation.LOCAL);
    const [defaultStorageCloudId, setDefaultStorageCloudId] = useState<number | null>(null);
    const [helpMessage, setHelpMessage] = useState('');
    const resource = useSelector((state: CombinedState) => state.export.resource);
    const instance = useSelector((state: CombinedState) => state.export.instance);
    const modalVisible = useSelector((state: CombinedState) => state.export.modalVisible);
    const {
        tasks: taskExportActivities,
        projects: projectExportActivities,
    } = useSelector((state: CombinedState) => state.export);

    const initActivities = (): void => {
        if (resource === 'backup') {
            let activity = false;
            if (instance instanceof core.classes.Project) {
                setInstanceType(`project #${instance.id}`);
                if (projectExportActivities[instance?.id]) {
                    activity = projectExportActivities[instance?.id].backup;
                }
            } else if (instance instanceof core.classes.Task) {
                setInstanceType(`task #${instance.id}`);
                if (taskExportActivities[instance?.id]) {
                    activity = taskExportActivities[instance?.id].backup;
                }
            }
        }
    };

    useEffect(() => {
        initActivities();
    }, [instance?.id, resource, instance instanceof core.classes.Project, taskExportActivities, projectExportActivities]);


    useEffect(() => {
        if (instance && resource === 'backup') {
            setDefaultStorageLocation(instance.targetStorage?.location || StorageLocation.LOCAL);
            setDefaultStorageCloudId(instance.targetStorage?.cloudStorageId || null);
        }
    }, [instance?.id, resource, instance?.targetStorage]);

    useEffect(() => {
        setHelpMessage(
            `Export backup to ${(defaultStorageLocation) ? defaultStorageLocation.split('_')[0] : 'local'} ` +
            `storage ${(defaultStorageCloudId) ? '№' + defaultStorageCloudId : ''}`);
    }, [defaultStorageLocation, defaultStorageCloudId]);

    const closeModal = (): void => {
        setUseDefaultStorage(true);
        setStorageLocation(StorageLocation.LOCAL);
        form.resetFields();
        dispatch(exportActions.closeExportModal());
    };

    const handleExport = useCallback(
        (values: FormValues): void => {
            dispatch(
                exportBackupAsync(
                    instance,
                    new Storage({
                        location: useDefaultStorage ? defaultStorageLocation : values.targetStorage?.location,
                        cloudStorageId: useDefaultStorage ? defaultStorageCloudId : values.targetStorage?.cloudStorageId,
                    }),
                    useDefaultStorage,
                    values.customName ? `${values.customName}.zip` : undefined
                ),
            );
            closeModal();
            Notification.info({
                message: 'Backup export started',
                description:
                    `Backup export was started. ` +
                    'Download will start automatically as soon as the file is ready.',
                className: `cvat-notification-notice-export-backup-start`,
            });
        },
        [instance, instanceType, useDefaultStorage],
    );

    if (resource !== 'backup') return null;

    return (
        // TODO add pending on submit button
        <Modal
            title={<Text strong>{`Export ${instanceType}`}</Text>}
            visible={modalVisible}
            onCancel={closeModal}
            onOk={() => form.submit()}
            className={`cvat-modal-export-${instanceType.split(' ')[0]}`}
            destroyOnClose
        >
            <Form
                name={`Export ${instanceType}`}
                form={form}
                layout='vertical'
                initialValues={initialValues}
                onFinish={handleExport}
            >
                <Form.Item label={<Text strong>Custom name</Text>} name='customName'>
                    <Input
                        placeholder='Custom name for a backup file'
                        suffix='.zip'
                        className='cvat-modal-export-filename-input'
                    />
                </Form.Item>
                <TargetStorageField
                    instanceId={instance?.id}
                    switchDescription='Use default settings'
                    switchHelpMessage={helpMessage}
                    useDefaultStorage={useDefaultStorage}
                    storageDescription={`Specify target storage for export ${instanceType}`}
                    locationValue={storageLocation}
                    onChangeUseDefaultStorage={(value: boolean) => setUseDefaultStorage(value)}
                    onChangeLocationValue={(value: StorageLocation) => setStorageLocation(value)}
                />
            </Form>
        </Modal>
    );
}

export default React.memo(ExportBackupModal);
