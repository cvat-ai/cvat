// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import _ from 'lodash';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal/Modal';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { PlayCircleOutlined, LaptopOutlined, BuildOutlined } from '@ant-design/icons';

import { setSettings } from 'actions/settings-actions';
import { shortcutsActions } from 'actions/shortcuts-actions';
import WorkspaceSettingsContainer from 'containers/header/settings-modal/workspace-settings';
import PlayerSettingsContainer from 'containers/header/settings-modal/player-settings';
import ShortcutsSettingsContainer from 'containers/header/settings-modal/shortcuts-settings';
import { CombinedState } from 'reducers';
import { conflict, conflictDetector } from 'utils/conflict-detector';
import { ImageFilter, ImageFilterAlias } from 'utils/image-processing';
import GammaCorrection, { GammaFilterOptions } from 'utils/fabric-wrapper/gamma-correciton';

interface SettingsModalProps {
    visible: boolean;
    onClose(): void;
}

const SAVE_SETTINGS_DELAY = 2000;

function SettingsModal(props: SettingsModalProps): JSX.Element {
    const { visible, onClose } = props;

    const settings = useSelector((state: CombinedState) => state.settings);
    const shortcuts = useSelector((state: CombinedState) => state.shortcuts);
    const dispatch = useDispatch();

    useEffect(() => {
        const handler = setTimeout(() => {
            const settingsForSaving: any = {
                shortcuts: {
                    keyMap: {},
                },
                imageFilters: [],
            };
            for (const [key, value] of Object.entries(settings)) {
                if (['player', 'workspace'].includes(key)) {
                    settingsForSaving[key] = value;
                }
                if (key === 'imageFilters') {
                    const filters = [];
                    for (const filter of value) {
                        filters.push({
                            alias: filter.alias,
                            params: filter.modifier.serialize(),
                        });
                    }
                    settingsForSaving.imageFilters = filters;
                }
            }
            for (const [key] of Object.entries(shortcuts.keyMap)) {
                if (key in shortcuts.defaultState) {
                    settingsForSaving.shortcuts.keyMap[key] = {
                        sequences: shortcuts.keyMap[key].sequences,
                    };
                }
            }

            localStorage.setItem('clientSettings', JSON.stringify(settingsForSaving));
        }, SAVE_SETTINGS_DELAY);

        return () => {
            clearTimeout(handler);
        };
    }, [settings, shortcuts]);

    useEffect(() => {
        try {
            dispatch(shortcutsActions.setDefaultShortcuts(structuredClone(shortcuts.keyMap)));
            const newSettings = { ..._.pick(settings, 'player', 'workspace'), imageFilters: [] as ImageFilter[] };
            const settingsString = localStorage.getItem('clientSettings') as string;
            if (!settingsString) return;
            const loadedSettings = JSON.parse(settingsString);
            for (const [sectionKey, section] of Object.entries(newSettings)) {
                for (const [key, value] of Object.entries(section)) {
                    let settedValue = value;
                    if (sectionKey in loadedSettings && key in loadedSettings[sectionKey]) {
                        settedValue = loadedSettings[sectionKey][key];
                        Object.defineProperty(newSettings[(sectionKey as 'player' | 'workspace')], key, { value: settedValue });
                    }
                }
            }

            newSettings.imageFilters = [];
            if ('imageFilters' in loadedSettings) {
                for (const filter of loadedSettings.imageFilters) {
                    switch (filter.alias) {
                        case ImageFilterAlias.GAMMA_CORRECTION: {
                            const modifier = new GammaCorrection(filter.params as GammaFilterOptions);
                            newSettings.imageFilters.push({
                                modifier,
                                alias: ImageFilterAlias.GAMMA_CORRECTION,
                            });
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
            }

            dispatch(setSettings(newSettings));
            if ('shortcuts' in loadedSettings) {
                const updateKeyMap = structuredClone(shortcuts.keyMap);
                for (const key of Object.keys(loadedSettings.shortcuts.keyMap)) {
                    const value = loadedSettings.shortcuts.keyMap[key];
                    if (key in updateKeyMap) {
                        updateKeyMap[key].sequences = value.sequences;
                    }
                }
                for (const key of Object.keys(updateKeyMap)) {
                    const currValue = {
                        [key]: { ...updateKeyMap[key] },
                    };
                    const conflictingShortcuts = conflictDetector(currValue, shortcuts.keyMap);
                    if (conflictingShortcuts) {
                        for (const conflictingShortcut of Object.keys(conflictingShortcuts)) {
                            for (const sequence of currValue[key].sequences) {
                                for (const conflictingSequence of conflictingShortcuts[conflictingShortcut].sequences) {
                                    if (conflict(sequence, conflictingSequence)) {
                                        updateKeyMap[conflictingShortcut].sequences = [
                                            ...updateKeyMap[conflictingShortcut].sequences.filter(
                                                (s: string) => s !== conflictingSequence,
                                            ),
                                        ];
                                    }
                                }
                            }
                        }
                    }
                }
                dispatch(shortcutsActions.registerShortcuts(updateKeyMap));
            }
        } catch {
            notification.error({
                message: 'Failed to load settings from local storage',
                className: 'cvat-notification-notice-load-settings-fail',
            });
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
