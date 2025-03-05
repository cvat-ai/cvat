// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
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
    qualitySettings: QualitySettings | null;
    setQualitySettings: (settings: QualitySettings) => void;
}

function QualitySettingsTab(props: Readonly<Props>): JSX.Element | null {
    const {
        instance,
        fetching,
        qualitySettings: settings,
        setQualitySettings,
    } = props;

    const [form] = Form.useForm();
    const onSave = useCallback(async () => {
        const values = await form.validateFields();
        setQualitySettings(values);
    }, [form, setQualitySettings]);

    const onInheritChange = useCallback(async (value: boolean) => {
        const values = await form.validateFields();
        values.inherit = value;
        setQualitySettings(values);
    }, [form, setQualitySettings]);

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
    } else if (instance instanceof Project) {
        header = (
            <div className='cvat-quality-control-settings-header'>
                <Alert
                    type='warning'
                    message={(
                        <div>
                            <ExclamationCircleFilled className='ant-alert-icon' />
                            <Text>Custom settings are used in 4 tasks</Text>
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
                                    onOk: async () => {},
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
