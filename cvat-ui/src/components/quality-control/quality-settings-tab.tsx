// Copyright (C) CVAT.ai Corporation
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

function QualitySettingsTab(props: Readonly<Props>): JSX.Element | null {
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
            <div className='cvat-quality-control-settings-tab'>
                <div className='cvat-quality-control-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className='cvat-quality-control-settings-tab'>
            { settings ? (
                <QualitySettingsForm
                    form={form}
                    settings={settings}
                    onSave={onSave}
                />
            ) : <Text>No quality settings found</Text> }
        </div>
    );
}

export default React.memo(QualitySettingsTab);
