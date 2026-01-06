// Copyright (C) CVAT.ai Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form, { RuleObject } from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Notification from 'antd/lib/notification';
import message from 'antd/lib/message';
import Upload, { RcFile } from 'antd/lib/upload';
import { InboxOutlined } from '@ant-design/icons';
import { CombinedState } from 'reducers';
import { importActions, importBackupAsync } from 'actions/import-actions';
import SourceStorageField from 'components/storage/source-storage-field';
import Input from 'antd/lib/input/Input';

import { Storage, StorageData, StorageLocation } from 'cvat-core-wrapper';

type FormValues = {
    fileName?: string | undefined;
    sourceStorage: StorageData;
};

const initialValues: FormValues = {
    fileName: undefined,
    sourceStorage: {
        location: StorageLocation.LOCAL,
        cloudStorageId: undefined,
    },
};

function ImportBackupModal(): JSX.Element {
    const [form] = Form.useForm();
    const [file, setFile] = useState<File | null>(null);
    const { instanceType, modalVisible } = useSelector((state: CombinedState) => {
        const instanceT = state.import.instanceType;
        let visible = false;

        if (instanceT === 'project') {
            visible = state.import.projects.backup.modalVisible;
        }

        if (instanceT === 'task') {
            visible = state.import.tasks.backup.modalVisible;
        }

        return { instanceType: instanceT, modalVisible: visible };
    }, shallowEqual);

    const dispatch = useDispatch();
    const [selectedSourceStorage, setSelectedSourceStorage] = useState<StorageData>({
        location: StorageLocation.LOCAL,
    });

    const uploadLocalFile = (): JSX.Element => (
        <Form.Item
            getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                    return e;
                }
                return e?.fileList[0];
            }}
            name='dragger'
            rules={[{ required: true, message: '文件为必填项' }]}
        >
            <Upload.Dragger
                listType='text'
                fileList={file ? [file] : ([] as any[])}
                beforeUpload={(_file: RcFile): boolean => {
                    if (!['application/zip', 'application/x-zip-compressed'].includes(_file.type)) {
                        message.error('仅支持 ZIP 压缩包');
                    } else {
                        setFile(_file);
                    }
                    return false;
                }}
                onRemove={() => {
                    setFile(null);
                }}
            >
                <p className='ant-upload-drag-icon'>
                    <InboxOutlined />
                </p>
                <p className='ant-upload-text'>点击或拖拽文件到此区域</p>
            </Upload.Dragger>
        </Form.Item>
    );

    const validateFileName = (_: RuleObject, value: string): Promise<void> => {
        if (value) {
            const extension = value.toLowerCase().split('.')[1];
            if (extension !== 'zip') {
                return Promise.reject(new Error('仅支持 ZIP 压缩包'));
            }
        }

        return Promise.resolve();
    };

    const renderCustomName = (): JSX.Element => (
        <Form.Item
            label={<Text strong>文件名</Text>}
            name='fileName'
            rules={[{ validator: validateFileName }, { required: true, message: '请输入名称' }]}
        >
            <Input
                placeholder='备份文件名'
                className='cvat-modal-import-filename-input'
            />
        </Form.Item>
    );

    const closeModal = useCallback((): void => {
        setSelectedSourceStorage({
            location: StorageLocation.LOCAL,
        });
        setFile(null);
        dispatch(importActions.closeImportBackupModal(instanceType as 'project' | 'task'));
        form.resetFields();
    }, [form, instanceType]);

    const handleImport = useCallback(
        (values: FormValues): void => {
            if (file === null && !values.fileName) {
                Notification.error({
                    message: '未指定备份文件',
                });
                return;
            }
            const sourceStorage = new Storage({
                location: values.sourceStorage.location,
                cloudStorageId: values.sourceStorage?.cloudStorageId,
            });

            dispatch(importBackupAsync(instanceType, sourceStorage, file || (values.fileName) as string));

            Notification.info({
                message: `The ${instanceType} creating from the backup has been started`,
                className: 'cvat-notification-notice-import-backup-start',
            });
            closeModal();
        },
        [instanceType, file],
    );

    return (
        <Modal
            title={(
                <Text strong>
                    {`Create ${instanceType} from backup`}
                </Text>
            )}
            open={modalVisible}
            onCancel={closeModal}
            onOk={() => form.submit()}
            className='cvat-modal-import-backup'
        >
            <Form
                name={`Create ${instanceType} from backup file`}
                form={form}
                onFinish={handleImport}
                layout='vertical'
                initialValues={initialValues}
            >
                <SourceStorageField
                    instanceId={null}
                    storageDescription='Specify source storage with backup'
                    locationValue={selectedSourceStorage.location}
                    onChangeStorage={(value: StorageData) => setSelectedSourceStorage(new Storage(value))}
                    onChangeLocationValue={(value: StorageLocation) => {
                        setSelectedSourceStorage({
                            location: value,
                        });
                    }}

                />
                {selectedSourceStorage?.location === StorageLocation.CLOUD_STORAGE && renderCustomName()}
                {selectedSourceStorage?.location === StorageLocation.LOCAL && uploadLocalFile()}
            </Form>
        </Modal>
    );
}

export default React.memo(ImportBackupModal);


