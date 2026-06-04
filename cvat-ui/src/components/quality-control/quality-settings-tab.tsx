// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import Form from 'antd/lib/form';
import Switch from 'antd/lib/switch';
import { Col, Row } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Alert from 'antd/lib/alert';
import { ExclamationCircleFilled } from '@ant-design/icons/lib/icons';
import Modal from 'antd/lib/modal';
import {
    Project, QualitySettings, QualitySettingsSaveFields, Task,
} from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import QualitySettingsForm from './task-quality/quality-settings-form';

export type UpdateSettingsData = Record<number, { settings: QualitySettings, fields: QualitySettingsSaveFields }>;

interface Props {
    instance: Task | Project;
    fetching: boolean;
    qualitySettings: {
        settings: QualitySettings | null;
        childrenSettings: QualitySettings[] | null;
    };
    setQualitySettings: (updatedSettingsData: UpdateSettingsData) => void;
    refreshQualitySettings: () => Promise<void>;
}

function QualitySettingsTab(props: Readonly<Props>): JSX.Element | null {
    const {
        instance,
        fetching,
        qualitySettings: { settings, childrenSettings },
        setQualitySettings,
        refreshQualitySettings,
    } = props;

    const [form] = Form.useForm();

    const onSave = useCallback(async () => {
        if (settings) {
            const values = await form.validateFields();
            const fields: QualitySettingsSaveFields = {
                targetMetric: values.targetMetric ?? settings.targetMetric,
                targetMetricThreshold: (values.targetMetricThreshold ?? settings.targetMetricThreshold * 100) / 100,
                maxValidationsPerJob: values.maxValidationsPerJob ?? settings.maxValidationsPerJob,
                iouThreshold: (values.iouThreshold ?? settings.iouThreshold * 100) / 100,
                compareAttributes: values.compareAttributes ?? settings.compareAttributes,
                emptyIsAnnotated: values.emptyIsAnnotated ?? settings.emptyIsAnnotated,
                oksSigma: (values.oksSigma ?? settings.oksSigma * 100) / 100,
                pointSizeBase: values.pointSizeBase ?? settings.pointSizeBase,
                lineThickness: (values.lineThickness ?? settings.lineThickness * 100) / 100,
                lineOrientationThreshold: (
                    values.lineOrientationThreshold ?? settings.lineOrientationThreshold * 100
                ) / 100,
                compareLineOrientation: values.compareLineOrientation ?? settings.compareLineOrientation,
                compareGroups: values.compareGroups ?? settings.compareGroups,
                groupMatchThreshold: (values.groupMatchThreshold ?? settings.groupMatchThreshold * 100) / 100,
                checkCoveredAnnotations: values.checkCoveredAnnotations ?? settings.checkCoveredAnnotations,
                objectVisibilityThreshold: (
                    values.objectVisibilityThreshold ?? settings.objectVisibilityThreshold * 100
                ) / 100,
                panopticComparison: values.panopticComparison ?? settings.panopticComparison,
                jobFilter: values.jobFilter ?? '',
            };
            setQualitySettings({ [settings.id]: { settings, fields } });
        }
    }, [form, settings, setQualitySettings]);

    const onInheritChange = useCallback((value: boolean) => {
        if (settings) {
            setQualitySettings({ [settings.id]: { settings, fields: { inherit: value } } });
        }
    }, [settings, setQualitySettings]);

    const nonInheritedChildSettings = childrenSettings ? childrenSettings.filter((child) => !child.inherit) : [];
    const onChildInheritChange = useCallback(() => {
        const updatedSettings = nonInheritedChildSettings.reduce<UpdateSettingsData>((acc, child) => {
            acc[child.id] = {
                settings: child,
                fields: { inherit: true },
            };
            return acc;
        }, {});
        setQualitySettings(updatedSettings);
    }, [nonInheritedChildSettings, setQualitySettings]);

    if (fetching) {
        return (
            <div className='cvat-quality-control-settings-tab'>
                <div className='cvat-quality-control-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    let header: JSX.Element | null = null;
    if (instance instanceof Task && instance.projectId !== null) {
        header = (
            <div className='cvat-quality-control-settings-header'>
                <Switch checked={settings?.inherit} onChange={onInheritChange} />
                <Text>Use</Text>
                <Link to={`/projects/${instance.projectId}/quality-control#settings`}>&nbsp;project settings</Link>
            </div>
        );
    } else if (instance instanceof Project && nonInheritedChildSettings.length !== 0) {
        header = (
            <div className='cvat-quality-control-settings-header'>
                <Alert
                    type='warning'
                    message={(
                        <div>
                            <ExclamationCircleFilled className='ant-alert-icon' />
                            <Text>{`Own settings are used in ${nonInheritedChildSettings.length} tasks`}</Text>
                        </div>
                    )}
                    action={(
                        <Button
                            type='primary'
                            danger
                            onClick={() => {
                                Modal.confirm({
                                    title: 'Are you sure you want to force project settings?',
                                    icon: <ExclamationCircleFilled />,
                                    content: 'This action will override own settings in all tasks.',
                                    okText: 'Yes',
                                    cancelText: 'No',
                                    onOk: onChildInheritChange,
                                });
                            }}
                        >
                            Force project settings
                        </Button>
                    )}
                />
            </div>
        );
    }

    if (settings) {
        return (
            <div className='cvat-quality-control-settings-tab'>
                <Row justify='end' className='cvat-quality-settings-save-btn'>
                    <Col>
                        <Button onClick={onSave} type='primary'>
                            Save
                        </Button>
                    </Col>
                </Row>
                {header}
                <QualitySettingsForm
                    form={form}
                    settings={settings}
                    onSave={onSave}
                    onReload={refreshQualitySettings}
                    disabled={settings.inherit && instance instanceof Task && instance.projectId !== null}
                />
            </div>
        );
    }

    return null;
}

export default React.memo(QualitySettingsTab);
