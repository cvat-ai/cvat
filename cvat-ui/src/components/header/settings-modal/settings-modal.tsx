// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Icon from 'antd/lib/icon';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal/Modal';

import WorkspaceSettingsContainer from 'containers/header/settings-modal/workspace-settings';
import PlayerSettingsContainer from 'containers/header/settings-modal/player-settings';
import Button from 'antd/lib/button';

interface SettingsModalProps {
    visible: boolean;
    onClose(): void;
}

const SettingsModal = (props: SettingsModalProps): JSX.Element => {
    const { visible, onClose } = props;

    return (
        <Modal
            title='Settings'
            visible={visible}
            onCancel={onClose}
            width={800}
            className='cvat-settings-modal'
            footer={
                <Button type='primary' onClick={onClose}>
                    Close
                </Button>
            }
        >
            <div className='cvat-settings-tabs'>
                <Tabs type='card' tabBarStyle={{ marginBottom: '0px', marginLeft: '-1px' }}>
                    <Tabs.TabPane
                        tab={
                            <span>
                                <Icon type='play-circle' />
                                <Text>Player</Text>
                            </span>
                        }
                        key='player'
                    >
                        <PlayerSettingsContainer />
                    </Tabs.TabPane>
                    <Tabs.TabPane
                        tab={
                            <span>
                                <Icon type='laptop' />
                                <Text>Workspace</Text>
                            </span>
                        }
                        key='workspace'
                    >
                        <WorkspaceSettingsContainer />
                    </Tabs.TabPane>
                </Tabs>
            </div>
        </Modal>
    );
};

export default SettingsModal;
