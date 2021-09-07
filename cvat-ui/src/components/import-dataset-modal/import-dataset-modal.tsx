// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Notification from 'antd/lib/notification';
import message from 'antd/lib/message';
import Upload, { RcFile } from 'antd/lib/upload';

import {
    DownloadOutlined,
    InboxOutlined,
    LoadingOutlined,
    QuestionCircleFilled,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers/interfaces';
import { importActions, importDatasetAsync } from 'actions/import-actions';

type FormValues = {
    selectedFormat: string | undefined;
};

function ImportDatasetModal(): JSX.Element {
    const [form] = Form.useForm();
    const [file, setFile] = useState<File | null>(null);
    const modalVisible = useSelector((state: CombinedState) => state.import.modalVisible);
    const instance = useSelector((state: CombinedState) => state.import.instance);
    const projects = useSelector((state: CombinedState) => state.import.projects);
    const importers = useSelector((state: CombinedState) => state.formats.annotationFormats.loaders);
    const dispatch = useDispatch();

    const closeModal = (): void => {
        form.resetFields();
        setFile(null);
        dispatch(importActions.closeImportModal());
    };

    const handleImport = useCallback(
        (values: FormValues): void => {
            if (file === null) {
                Notification.error({
                    message: 'No dataset file selected',
                });
                return;
            }
            dispatch(importDatasetAsync(instance, values.selectedFormat as string, file));
            closeModal();
            Notification.info({
                message: 'Dataset export started',
                description: `Dataset import was started for project #${instance?.id}. `,
                className: 'cvat-notification-notice-import-project-start',
            });
        },
        [instance?.id, file],
    );

    return (
        <Modal
            title={(
                <>
                    <Text>Import dataset to project</Text>
                    <CVATTooltip title={
                        instance && !instance.labels.length ?
                            'Labels will be imported from dataset' :
                            'Labels from project will be used'
                    }
                    >
                        <QuestionCircleFilled />
                    </CVATTooltip>
                </>
            )}
            visible={modalVisible}
            onCancel={closeModal}
            onOk={() => form.submit()}
            className='cvat-modal-import-project'
        >
            <Form
                name='Import dataset'
                form={form}
                initialValues={{ selectedFormat: undefined } as FormValues}
                onFinish={handleImport}
            >
                <Form.Item
                    name='selectedFormat'
                    label='Export format'
                    rules={[{ required: true, message: 'Format must be selected' }]}
                >
                    <Select placeholder='Select dataset format' className='cvat-modal-import-select'>
                        {importers
                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                            .filter((importer: any): boolean =>
                                instance !== null && (!instance?.dimension ||
                                    importer.dimension === instance.dimension
                                ))
                            .map(
                                (importer: any): JSX.Element => {
                                    const pending = !!projects[instance.id];
                                    const disabled = !importer.enabled || pending;
                                    return (
                                        <Select.Option
                                            value={importer.name}
                                            key={importer.name}
                                            disabled={disabled}
                                            className='cvat-modal-import-option-item'
                                        >
                                            <DownloadOutlined />
                                            <Text disabled={disabled}>{importer.name}</Text>
                                            {pending && <LoadingOutlined style={{ marginLeft: 10 }} />}
                                        </Select.Option>
                                    );
                                },
                            )}
                    </Select>
                </Form.Item>
                <Upload.Dragger
                    listType='text'
                    fileList={file ? [file] : ([] as any[])}
                    beforeUpload={(_file: RcFile): boolean => {
                        if (!['application/zip', 'application/x-zip-compressed'].includes(_file.type)) {
                            message.error('Only ZIP archive is supported');
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
                    <p className='ant-upload-text'>Click or drag file to this area</p>
                </Upload.Dragger>
            </Form>
        </Modal>
    );
}

export default ImportDatasetModal;
