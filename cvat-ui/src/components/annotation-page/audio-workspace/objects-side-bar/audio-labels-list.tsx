// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import message from 'antd/lib/message';

import { CombinedState } from 'reducers';
import { setAudioActiveLabel, setAudioRegions } from 'actions/annotation-actions';
import AudioLabelItemContainer from 'containers/annotation-page/audio-workspace/objects-side-bar/audio-label-item';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import Text from 'antd/lib/typography/Text';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useResetShortcutsOnUnmount } from 'utils/hooks';
import { getCVATStore } from 'cvat-store';

const componentShortcuts: Record<string, KeyMapItem> = {};

const makeKey = (index: number) => `SWITCH_LABEL_AUDIO_${index}`;

for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
    componentShortcuts[makeKey(index)] = {
        name: 'Switch label (audio)',
        description: 'Change label of selected audio region, or default label for next created region',
        sequences: [`ctrl+${index}`],
        nonActive: true,
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    };
}

registerComponentShortcuts(componentShortcuts);

function AudioLabelsList(): JSX.Element {
    const dispatch = useDispatch();

    const { labels, keyMap } = useSelector((state: CombinedState) => ({
        labels: state.annotation.job.labels,
        keyMap: state.shortcuts.keyMap,
    }), shallowEqual);

    const labelIDs = labels.map((label: any): number => label.id);

    useResetShortcutsOnUnmount(componentShortcuts);

    const keyToLabelMapping = Object.fromEntries(
        labelIDs.slice(0, 10).map((labelID: number, idx: number) => [(idx + 1) % 10, labelID]),
    );

    useEffect(() => {
        const updated = JSON.parse(JSON.stringify(componentShortcuts));
        for (const [index, labelID] of Object.entries(keyToLabelMapping)) {
            if (labelID) {
                const labelName = labels.find((label: any) => label.id === labelID)?.name;
                const key = makeKey(+index);
                updated[key] = {
                    ...updated[key],
                    nonActive: false,
                    name: `Switch audio label to ${labelName}`,
                    description: `Change the label to ${labelName} for the active audio region,
                        or set it as default for the next created region`,
                };
            }
        }
        registerComponentShortcuts(updated);
    }, [labels]);

    const handleHelper = (event: KeyboardEvent, index: number): void => {
        if (event) event.preventDefault();
        const labelID = keyToLabelMapping[index];
        const label = labels.find((_label: any) => _label.id === labelID);
        if (!Number.isInteger(labelID) || !label) return;

        const relevantAppState = getCVATStore().getState();
        const { regions, activeRegionId } = relevantAppState.audio.player;

        if (activeRegionId) {
            const defaultAttrs: Record<number, string> = {};
            label.attributes.forEach((attr: any) => {
                defaultAttrs[attr.id] = attr.defaultValue;
            });
            const next = regions.map((r) => (
                r.id === activeRegionId ? { ...r, labelId: labelID, attributes: defaultAttrs } : r
            ));
            dispatch(setAudioRegions(next));
        } else {
            dispatch(setAudioActiveLabel(labelID));
            message.destroy();
            message.success(`Default label has been changed to "${label.name}"`);
        }
    };

    const handlers: Record<string, (event: KeyboardEvent) => void> = {};
    for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        handlers[makeKey(index)] = (event: KeyboardEvent) => {
            handleHelper(event, index);
        };
    }

    return (
        <div className='cvat-objects-sidebar-labels-list'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <div className='cvat-objects-sidebar-labels-list-header'>
                <Text>{`Items: ${labels.length}`}</Text>
            </div>
            {labelIDs.map((labelID: number): JSX.Element => (
                <AudioLabelItemContainer key={labelID} labelID={labelID} />
            ))}
        </div>
    );
}

export default React.memo(AudioLabelsList);
