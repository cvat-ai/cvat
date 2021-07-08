// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Modal from 'antd/lib/modal';
import { useSelector, useDispatch } from 'react-redux';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Checkbox from 'antd/lib/checkbox';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';

import { CombinedState } from 'reducers/interfaces';
import { exportActions, exportDatasetAsync } from 'actions/export-actions';
import getCore from 'cvat-core-wrapper';

const core = getCore();

type FormValues = {
    selectedFormat: string | undefined;
    saveImages: boolean;
    customName: string | undefined;
};

export default function ExportDatasetModal(): JSX.Element {
    let instanceType = '';
    let activities: string[] = [];
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const instance = useSelector((state: CombinedState) => state.export.instance);
    const modalVisible = useSelector((state: CombinedState) => state.export.modalVisible);
    const dumpers = useSelector((state: CombinedState) => state.formats.annotationFormats.dumpers);
    const {
        tasks: { datasets: taskExportActivities, annotation: taskDumpActivities },
        projects: { datasets: projectExportActivities, annotation: projectDumpActivities },
    } = useSelector((state: CombinedState) => state.export);

    if (instance instanceof core.classes.Project) {
        instanceType = 'project';
        activities = (form.getFieldValue('saveImages') ? projectExportActivities : projectDumpActivities)[instance.id];
    } else if (instance instanceof core.classes.Task) {
        instanceType = 'task';
        activities = (form.getFieldValue('saveImages') ? taskExportActivities : taskDumpActivities)[instance.id];
    }

    const closeModal = (): void => {
        form.resetFields();
        dispatch(exportActions.closeExportModal());
    };

    const handleExport = (values: FormValues): void => {
        // have to validate format before so it would not be undefined
        dispatch(
            exportDatasetAsync(instance, values.selectedFormat as string, values.customName || '', values.saveImages),
        );
        closeModal();
    };

    return (
        <Form
            name='Export dataset'
            form={form}
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            initialValues={
                {
                    selectedFormat: undefined,
                    saveImages: false,
                    customName: undefined,
                } as FormValues
            }
            onFinish={handleExport}
        >
            <Modal
                title={`Export ${instanceType} as a dataset`}
                visible={modalVisible}
                onCancel={closeModal}
                onOk={() => form.submit()}
            >
                <Form.Item
                    name='selectedFormat'
                    label='Export format'
                    rules={[{ required: true, message: 'Format must be selected' }]}
                >
                    <Select placeholder='Select dataset format' className='cvat-modal-export-select'>
                        {dumpers
                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                            .filter(
                                (dumper: any): boolean =>
                                    !(instance instanceof core.classes.Task && dumper.dimension !== instance.dimension),
                            )
                            .map(
                                (dumper: any): JSX.Element => {
                                    const pending = (activities || []).includes(dumper.name);
                                    const disabled = !dumper.enabled || pending;
                                    return (
                                        <Select.Option
                                            value={dumper.name}
                                            key={dumper.name}
                                            disabled={disabled}
                                            className='cvat-modal-export-option-item'
                                        >
                                            <DownloadOutlined />
                                            <Text disabled={disabled}>{dumper.name}</Text>
                                            {pending && <LoadingOutlined style={{ marginLeft: 10 }} />}
                                        </Select.Option>
                                    );
                                },
                            )}
                    </Select>
                </Form.Item>
                <Form.Item name='saveImages' valuePropName='checked' wrapperCol={{ offset: 8, span: 16 }}>
                    <Checkbox>Save images</Checkbox>
                </Form.Item>
                <Form.Item label='Custom name' name='customName'>
                    <Input placeholder='Custom name for dataset' />
                </Form.Item>
            </Modal>
        </Form>
    );
}
