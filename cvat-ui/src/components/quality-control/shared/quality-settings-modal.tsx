// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import { QualitySettings } from 'cvat-core-wrapper';
import QualitySettingsForm from '../task-quality/quality-settings-form';

interface Props {
    fetching: boolean;
    qualitySettings: QualitySettings | null;
    visible: boolean;
    setVisible: (visible: boolean) => void;
    setQualitySettings: (settings: QualitySettings) => void;
}

export default function QualitySettingsModal(props: Props): JSX.Element | null {
    const {
        fetching,
        visible,
        qualitySettings: settings,
        setVisible,
        setQualitySettings,
    } = props;

    const [form] = Form.useForm();

    const onOk = useCallback(async () => {
        try {
            if (settings) {
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
            setVisible(false);
            return settings;
        } catch (e) {
            return false;
        }
    }, [settings]);

    const onCancel = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <Modal
            okType='primary'
            okText='Save'
            cancelText='Cancel'
            title={<Text strong>Annotation Quality Settings</Text>}
            open={visible}
            onOk={onOk}
            onCancel={onCancel}
            confirmLoading={fetching}
            destroyOnClose
            className='cvat-modal-quality-settings'
        >
            { settings ? (
                <QualitySettingsForm form={form} settings={settings} />
            ) : (
                <Text>No quality settings</Text>
            )}
        </Modal>
    );
}
