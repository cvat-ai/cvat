// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import Form from 'antd/lib/form';
import { QualitySettings } from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import QualitySettingsForm from './task-quality/quality-settings-form';

interface Props {
    fetching: boolean;
    qualitySettings: QualitySettings | null;
    setQualitySettings: (settings: QualitySettings, fields: any) => void;
}

export default function QualitySettingsComponent(props: Props): JSX.Element | null {
    const {
        fetching,
        qualitySettings: settings,
        setQualitySettings,
    } = props;

    const [additionalSettings, setAdditinalSettings] = useState({});
    const onAdditionalValueChanged = (key: string, value: number): void => {
        setAdditinalSettings({ ...additionalSettings, [key]: value });
    };

    const [form] = Form.useForm();
    const onSave = useCallback(async () => {
        const values = await form.validateFields();
        setQualitySettings(values, additionalSettings);
    }, [form, additionalSettings]);

    if (fetching) {
        return (
            <div className='cvat-analytics-loading'>
                <CVATLoadingSpinner />
            </div>
        );
    }

    return settings ? (
        <QualitySettingsForm
            form={form}
            settings={settings}
            onSave={onSave}
            onAdditionalValueChanged={onAdditionalValueChanged}
        />
    ) : (
        <Text>No quality settings</Text>
    );
}
