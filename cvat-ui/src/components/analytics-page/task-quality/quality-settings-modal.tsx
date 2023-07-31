// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import { QualitySettings, Task } from 'cvat-core-wrapper';
import QualitySettingsForm from './quality-settings-form';

interface Props {
    task: Task;
    qualitySettings: QualitySettings | null;
    qualitySettingsVisible: boolean;
    fetching: boolean;
    setQualitySettingsVisible: (visible: boolean) => void;
    setQualitySettings: (settings: QualitySettings) => void;
}

export default function QualitySettingsModal(props: Props): JSX.Element | null {
    const {
        task,
        fetching,
        qualitySettingsVisible,
        qualitySettings: settings,
        setQualitySettingsVisible,
        setQualitySettings,
    } = props;

    const formEnabled = !task.projectId;
    const [form] = Form.useForm();

    const onOk = useCallback(async () => {
        try {
            if (settings && formEnabled) {
                const values = await form.validateFields();
                settings.lowOverlapThreshold = values.lowOverlapThreshold / 100;
                settings.iouThreshold = values.iouThreshold / 100;
                settings.compareAttributes = values.compareAttributes;

                settings.oksSigma = values.oksSigma / 100;

                settings.lineThickness = values.lineThickness / 100;
                settings.lineOrientationThreshold = values.lineOrientationThreshold / 100;
                settings.orientedLines = values.orientedLines;

                settings.compareGroups = values.compareGroups;
                settings.groupMatchThreshold = values.groupMatchThreshold / 100;

                settings.checkCoveredAnnotations = values.checkCoveredAnnotations;
                settings.objectVisibilityThreshold = values.objectVisibilityThreshold / 100;

                settings.panopticComparison = values.panopticComparison;

                try {
                    const responseSettings = await settings.save();
                    setQualitySettings(responseSettings);
                } catch (error: unknown) {
                    notification.error({
                        message: 'Could not save quality settings',
                        description: typeof Error === 'object' ? (error as object).toString() : '',
                    });
                    throw error;
                }
                await settings.save();
            }
            setQualitySettingsVisible(false);
            return settings;
        } catch (e) {
            return false;
        }
    }, [settings]);

    const onCancel = useCallback(() => {
        setQualitySettingsVisible(false);
    }, []);

    return (
        <Modal
            okType='primary'
            okText='Save'
            cancelText={formEnabled ? 'Cancel' : 'Ok'}
            title={<Text strong>Annotation Quality Settings</Text>}
            visible={qualitySettingsVisible}
            onOk={onOk}
            onCancel={onCancel}
            confirmLoading={fetching}
            destroyOnClose
            className='cvat-modal-quality-settings'
            okButtonProps={{
                style: { ...(!formEnabled ? { display: 'none' } : {}) },
                disabled: !formEnabled,
            }}
        >
            {
                settings && formEnabled ? (
                    <QualitySettingsForm form={form} settings={settings} />
                ) : null
            }
            {
                (settings && !formEnabled && task.projectId) ? (
                    <>
                        <Text>The task is in a project, please check </Text>
                        <Link
                            to={`/projects/${task.projectId}/analytics`}
                            onClick={onCancel}
                        >
                            the&nbsp;project&nbsp;quality&nbsp;settings
                        </Link>
                        <Text> instead.</Text>
                    </>
                ) : (
                    <Text>No quality settings</Text>
                )
            }
        </Modal>
    );
}
