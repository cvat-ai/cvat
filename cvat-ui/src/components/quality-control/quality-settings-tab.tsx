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
}

function QualitySettingsTab(props: Readonly<Props>): JSX.Element | null {
    const {
        instance,
        fetching,
        qualitySettings: { settings, childrenSettings },
        setQualitySettings,
    } = props;

    const [form] = Form.useForm();

    const onSave = useCallback(async () => {
        if (settings) {
            const values = await form.validateFields();
            const fields: QualitySettingsSaveFields = {
                targetMetric: values.targetMetric,
                targetMetricThreshold: values.targetMetricThreshold / 100,
                maxValidationsPerJob: values.maxValidationsPerJob,
                lowOverlapThreshold: values.lowOverlapThreshold / 100,
                iouThreshold: values.iouThreshold / 100,
                compareAttributes: values.compareAttributes,
                emptyIsAnnotated: values.emptyIsAnnotated,
                oksSigma: values.oksSigma / 100,
                pointSizeBase: values.pointSizeBase,
                lineThickness: values.lineThickness / 100,
                lineOrientationThreshold: values.lineOrientationThreshold / 100,
                compareLineOrientation: values.compareLineOrientation,
                compareGroups: values.compareGroups,
                groupMatchThreshold: values.groupMatchThreshold / 100,
                checkCoveredAnnotations: values.checkCoveredAnnotations,
                objectVisibilityThreshold: values.objectVisibilityThreshold / 100,
                panopticComparison: values.panopticComparison,
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
                <Text>使用</Text>
                <Link to={`/projects/${instance.projectId}/quality-control#settings`}>&nbsp;项目设置</Link>
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
                            <Text>{`${nonInheritedChildSettings.length} 个任务正在使用自有设置`}</Text>
                        </div>
                    )}
                    action={(
                        <Button
                            type='primary'
                            danger
                            onClick={() => {
                                Modal.confirm({
                                    title: '确定要强制使用项目设置吗？',
                                    icon: <ExclamationCircleFilled />,
                                    content: '此操作将覆盖所有任务中的自有设置。',
                                    okText: '是',
                                    cancelText: '否',
                                    onOk: onChildInheritChange,
                                });
                            }}
                        >
                            强制使用项目设置
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
                            保存
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
            </div>
        );
    }

    return null;
}

export default React.memo(QualitySettingsTab);


