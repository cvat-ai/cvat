// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import Text from 'antd/lib/typography/Text';
import Form from 'antd/lib/form';
import { QualitySettings } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import QualitySettingsForm from './task-quality/quality-settings-form';

interface Props {
    fetching: boolean;
    qualitySettings: QualitySettings | null;
    setQualitySettings: (settings: QualitySettings) => void;
}

export default function QualitySettingsComponent(props: Readonly<Props>): JSX.Element | null {
    const {
        fetching,
        qualitySettings: settings,
        setQualitySettings,
    } = props;

    const [form] = Form.useForm();
    const onSave = useCallback(async () => {
        const values = await form.validateFields();
        setQualitySettings(values);
    }, [form, setQualitySettings]);

    if (fetching) {
        return (
            <div className='cvat-quality-control-loading'>
                <CVATLoadingSpinner />
            </div>
        );
    }

    return settings ? (
        <QualitySettingsForm
            form={form}
            settings={settings}
            onSave={onSave}
        />
    ) : (
        <Text>No quality settings</Text>
    );
}
