// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import Form from 'antd/lib/form';
import Switch from 'antd/lib/switch';
import { Project, QualitySettings, Task } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import { Col, Row } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import { Link } from 'react-router-dom';
import Alert from 'antd/lib/alert';
import { ExclamationCircleFilled } from '@ant-design/icons/lib/icons';
import Modal from 'antd/lib/modal';
import QualitySettingsForm from './task-quality/quality-settings-form';

interface Props {
    instance: Task | Project;
    fetching: boolean;
    qualitySettings: {
        settings: QualitySettings | null;
        childrenSettings: QualitySettings[] | null;
    };
    setQualitySettings: (settingsList: QualitySettings[], onError?: () => void) => void;
}

function QualitySettingsTab(props: Readonly<Props>): JSX.Element | null {
    const {
        instance,
        fetching,
        qualitySettings: { settings, childrenSettings },
        setQualitySettings,
    } = props;

    const [form] = Form.useForm();

    const setupSettingsFromForm = useCallback(async (newSettings: QualitySettings) => {
        const values = await form.validateFields();

        newSettings.targetMetric = values.targetMetric;
        newSettings.targetMetricThreshold = values.targetMetricThreshold / 100;

        newSettings.maxValidationsPerJob = values.maxValidationsPerJob;

        newSettings.lowOverlapThreshold = values.lowOverlapThreshold / 100;
        newSettings.iouThreshold = values.iouThreshold / 100;
        newSettings.compareAttributes = values.compareAttributes;
        newSettings.emptyIsAnnotated = values.emptyIsAnnotated;

        newSettings.oksSigma = values.oksSigma / 100;
        newSettings.pointSizeBase = values.pointSizeBase;

        newSettings.lineThickness = values.lineThickness / 100;
        newSettings.lineOrientationThreshold = values.lineOrientationThreshold / 100;
        newSettings.orientedLines = values.orientedLines;

        newSettings.compareGroups = values.compareGroups;
        newSettings.groupMatchThreshold = values.groupMatchThreshold / 100;

        newSettings.checkCoveredAnnotations = values.checkCoveredAnnotations;
        newSettings.objectVisibilityThreshold = values.objectVisibilityThreshold / 100;

        newSettings.panopticComparison = values.panopticComparison;
        newSettings.jobFilter = values.jobFilter || '';
    }, [form]);

    const onSave = useCallback(async () => {
        if (settings) {
            await setupSettingsFromForm(settings);
            setQualitySettings([settings]);
        }
    }, [form, settings, setQualitySettings]);

    const onInheritChange = useCallback(async (value: boolean) => {
        if (settings) {
            settings.inherit = value;
            setQualitySettings([settings], () => {
                settings.inherit = !value;
            });
        }
    }, [form, settings, setQualitySettings]);

    const [nonInheritedChildSettings, setNonInheritedChildSettings] = useState<QualitySettings[]>([]);
    useEffect(() => {
        if (childrenSettings) {
            const filteredSettings = childrenSettings.filter((child) => !child.inherit);
            setNonInheritedChildSettings(filteredSettings);
        }
    }, [childrenSettings]);

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
                            <Text>{`Custom settings are used in ${nonInheritedChildSettings.length} tasks`}</Text>
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
                                    content: 'This action will override custom settings in all tasks.',
                                    okText: 'Yes',
                                    cancelText: 'No',
                                    onOk: async () => {
                                        const updatedSettings = nonInheritedChildSettings.map((child) => {
                                            child.inherit = true;
                                            return child;
                                        });
                                        setQualitySettings(updatedSettings);
                                    },
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

    return (
        <div className='cvat-quality-control-settings-tab'>
            { settings ? (
                <>
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
                        disabled={settings.inherit && instance instanceof Task && instance.projectId !== null}
                    />
                </>
            ) : <Text>No quality settings found</Text> }
        </div>
    );
}

export default React.memo(QualitySettingsTab);
