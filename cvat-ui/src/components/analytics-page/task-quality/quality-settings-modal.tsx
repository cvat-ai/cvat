// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CombinedState } from 'reducers';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import {
    analyticsActions, createQualitySettingsAsync, updateQualitySettingsAsync,
} from 'actions/analytics-actions';
import Form from 'antd/lib/form';
import { Task } from 'cvat-core-wrapper';
import { Link } from 'react-router-dom';
import QualitySettingsForm from './quality-settings-form';

interface Props {
    task: Task;
}

export default function QualitySettingsModal(props: Props): JSX.Element | null {
    const { task } = props;
    const visible = useSelector((state: CombinedState) => state.analytics.quality.settings.modalVisible);
    const loading = useSelector((state: CombinedState) => state.analytics.quality.settings.fetching);
    const settings = useSelector((state: CombinedState) => state.analytics.quality.settings.current);
    const settingsInitialized = !!(settings?.id);
    const formEnabled = !task.projectId;
    const [form] = Form.useForm();

    const dispatch = useDispatch();

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

                if (!settingsInitialized) {
                    await dispatch(createQualitySettingsAsync(settings));
                } else {
                    await dispatch(updateQualitySettingsAsync(settings));
                }
                await dispatch(analyticsActions.switchQualitySettingsVisible(false));
            }
            return settings;
        } catch (e) {
            return false;
        }
    }, [settings, settingsInitialized]);

    const onCancel = useCallback(() => {
        dispatch(analyticsActions.switchQualitySettingsVisible(false));
    }, []);

    return (
        <Modal
            okType='primary'
            okText='Save'
            cancelText='Cancel'
            title={<Text strong>Annotation Quality Settings</Text>}
            visible={visible}
            onOk={onOk}
            onCancel={onCancel}
            confirmLoading={loading}
            className='cvat-modal-quality-settings'
            okButtonProps={{ disabled: !formEnabled }}
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
