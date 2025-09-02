// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal/Modal';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { PlayCircleOutlined, LaptopOutlined, BuildOutlined } from '@ant-design/icons';

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

    const { settings, shortcuts } = useSelector((state: CombinedState) => ({
        settings: state.settings,
        shortcuts: state.shortcuts,
    }), shallowEqual);
    const [settingsInitialized, setSettingsInitialized] = useState(false);
    const dispatch = useDispatch();

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
            label: <Text>Player</Text>,
            icon: <PlayCircleOutlined />,
            children: <PlayerSettingsContainer />,
        },
        {
            key: 'workspace',
            label: <Text>Workspace</Text>,
            icon: <LaptopOutlined />,
            children: <WorkspaceSettingsContainer />,
        },
        {
            key: 'shortcuts',
            label: <Text>Shortcuts</Text>,
            icon: <BuildOutlined />,
            children: <ShortcutsSettingsContainer />,
        },
    ];

    return (
        <Modal
            title='Settings'
            open={visible}
            onCancel={onClose}
            width={800}
            className='cvat-settings-modal'
            footer={(
                <Button className='cvat-close-settings-button' type='default' onClick={onClose}>
                    Close
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
