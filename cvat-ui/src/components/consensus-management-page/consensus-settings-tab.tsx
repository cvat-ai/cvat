// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import Text from 'antd/lib/typography/Text';
import Form from 'antd/lib/form';
import notification from 'antd/lib/notification';
import { ConsensusSettings } from 'cvat-core-wrapper';
import { formFieldsError } from 'utils/validation';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import ConsensusSettingsForm from './task-consensus/consensus-settings-form';

interface Props {
    fetching: boolean;
    settings: ConsensusSettings | null;
    setSettings: (settings: ConsensusSettings) => void;
}

function ConsensusSettingsTab(props: Readonly<Props>): JSX.Element | null {
    const {
        fetching,
        settings,
        setSettings,
    } = props;

    const [form] = Form.useForm();
    const onSave = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setSettings(values);
        } catch (error) {
            notification.error({
                message: 'Could not save consensus settings',
                description: formFieldsError(error).map((text: string): JSX.Element => <div>{text}</div>),
                className: 'cvat-notification-save-consensus-settings-failed',
            });
        }
    }, [form, setSettings]);

    if (fetching) {
        return (
            <div className='cvat-consensus-management-settings-tab'>
                <div className='cvat-consensus-management-loading'>
                    <CVATLoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className='cvat-consensus-management-settings-tab'>
            { settings ? (
                <ConsensusSettingsForm
                    form={form}
                    settings={settings}
                    onSave={onSave}
                />
            ) : <Text>No consensus settings found</Text> }
        </div>
    );
}

export default React.memo(ConsensusSettingsTab);
