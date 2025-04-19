// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal/Modal';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { PlayCircleOutlined, LaptopOutlined, BuildOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import { restoreSettingsAsync, updateCachedSettings } from 'actions/settings-actions';
import WorkspaceSettingsContainer from 'containers/header/settings-modal/workspace-settings';
import PlayerSettingsContainer from 'containers/header/settings-modal/player-settings';
import ShortcutsSettingsContainer from 'containers/header/settings-modal/shortcuts-settings';
import { CombinedState } from 'reducers';

interface SettingsModalProps {
    visible: boolean;
    onClose(): void;
}

function SettingsModal(props: SettingsModalProps): JSX.Element {
    const { visible, onClose } = props;

    const settings = useSelector((state: CombinedState) => state.settings);
    const shortcuts = useSelector((state: CombinedState) => state.shortcuts);
    const [settingsInitialized, setSettingsInitialized] = useState(false);
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { t: tSettings } = useTranslation('header', { keyPrefix: 'settings' });

    useEffect(() => {
        if (!settingsInitialized) return;

        updateCachedSettings(settings, shortcuts);
    }, [settingsInitialized, settings, shortcuts]);

    useEffect(() => {
        try {
            dispatch(restoreSettingsAsync());
        } catch {
            notification.error({
                message: 'Failed to load settings from local storage',
                className: 'cvat-notification-notice-load-settings-fail',
            });
        } finally {
            setSettingsInitialized(true);
        }
    }, []);

    const tabItems = [
        {
            key: 'player',
            label: <Text>{tSettings('Player.label')}</Text>,
            icon: <PlayCircleOutlined />,
            children: <PlayerSettingsContainer />,
        },
        {
            key: 'workspace',
            label: <Text>{tSettings('Workspace.label')}</Text>,
            icon: <LaptopOutlined />,
            children: <WorkspaceSettingsContainer />,
        },
        {
            key: 'shortcuts',
            label: <Text>{tSettings('Shortcuts.label')}</Text>,
            icon: <BuildOutlined />,
            children: <ShortcutsSettingsContainer />,
        },
    ];

    return (
        <Modal
            title={tSettings('title')}
            open={visible}
            onCancel={onClose}
            width={800}
            className='cvat-settings-modal'
            footer={(
                <Button className='cvat-close-settings-button' type='default' onClick={onClose}>
                    {t('Close')}
                </Button>
            )}
        >
            <div className='cvat-settings-tabs'>
                <Tabs defaultActiveKey='player' type='card' items={tabItems} />
            </div>
        </Modal>
    );
}

export default React.memo(SettingsModal);
