// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import message from 'antd/lib/message';

import { CombinedState } from 'reducers';
import {
    audioActions,
    updateAudioIntervalAsync,
    updateAudioIntervalsAsync,
} from 'actions/audio-actions';
import LabelItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/label-item';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';
import Text from 'antd/lib/typography/Text';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useResetShortcutsOnUnmount } from 'utils/hooks';
import { getCVATStore } from 'cvat-store';

const componentShortcuts: Record<string, KeyMapItem> = {};

const makeKey = (index: number): string => `SWITCH_LABEL_AUDIO_${index}`;

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

interface AudioLabelItemProps {
    labelID: number;
}

function AudioLabelItem(props: AudioLabelItemProps): JSX.Element | null {
    const { labelID } = props;
    const dispatch = useDispatch<ThunkDispatch>();
    const { label, audioIntervals } = useSelector((state: CombinedState) => ({
        label: state.annotation.job.labels.find((_label: any) => _label.id === labelID),
        audioIntervals: state.audio.player.intervals,
    }), shallowEqual);

    const {
        visible,
        statesHidden,
        statesLocked,
    } = useMemo(() => {
        const ownIntervals = audioIntervals.filter(
            (interval): boolean => interval.label.id === labelID,
        );
        const unlockedOwnIntervals = ownIntervals.filter((interval): boolean => !interval.lock);

        return {
            visible: !!ownIntervals.length,
            statesHidden: unlockedOwnIntervals.every((interval): boolean => !!interval.hidden),
            statesLocked: unlockedOwnIntervals.length === 0,
        };
    }, [audioIntervals, labelID]);

    const switchHidden = useCallback((value: boolean): void => {
        dispatch(updateAudioIntervalsAsync(
            audioIntervals.filter((interval) => interval.label.id === labelID && interval.clientID !== null)
                .map((interval) => interval.clientID as number),
            { hidden: value },
        ));
    }, [audioIntervals, dispatch, labelID]);

    const switchLock = useCallback((value: boolean): void => {
        dispatch(updateAudioIntervalsAsync(
            audioIntervals.filter((interval) => interval.label.id === labelID && interval.clientID !== null)
                .map((interval) => interval.clientID as number),
            { lock: value },
        ));
    }, [audioIntervals, dispatch, labelID]);

    const hideStates = useCallback((): void => {
        switchHidden(true);
    }, [switchHidden]);
    const showStates = useCallback((): void => {
        switchHidden(false);
    }, [switchHidden]);
    const lockStates = useCallback((): void => {
        switchLock(true);
    }, [switchLock]);
    const unlockStates = useCallback((): void => {
        switchLock(false);
    }, [switchLock]);

    if (!label) return null;

    return (
        <LabelItemComponent
            labelName={label.name}
            labelColor={label.color}
            visible={visible}
            statesHidden={statesHidden}
            statesLocked={statesLocked}
            hideStates={hideStates}
            showStates={showStates}
            lockStates={lockStates}
            unlockStates={unlockStates}
        />
    );
}

const MemoizedAudioLabelItem = React.memo(AudioLabelItem);

function AudioLabelsList(): JSX.Element {
    const dispatch = useDispatch<ThunkDispatch>();

    const { labels, keyMap } = useSelector((state: CombinedState) => ({
        labels: state.annotation.job.labels,
        keyMap: state.shortcuts.keyMap,
    }), shallowEqual);

    const labelIDs = useMemo(() => labels.map((label: any): number => label.id), [labels]);

    useResetShortcutsOnUnmount(componentShortcuts);

    const keyToLabelMapping = useMemo(() => Object.fromEntries(
        labelIDs.slice(0, 10).map((labelID: number, idx: number) => [(idx + 1) % 10, labelID]),
    ), [labelIDs]);

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

    const handleHelper = useCallback((event: KeyboardEvent, index: number): void => {
        if (event) event.preventDefault();
        const labelID = keyToLabelMapping[index];
        const label = labels.find((_label: any) => _label.id === labelID);
        if (!Number.isInteger(labelID) || !label) return;

        const relevantAppState = getCVATStore().getState();
        const { activeIntervalID } = relevantAppState.audio.player;

        if (activeIntervalID !== null) {
            const defaultAttrs: Record<number, string> = {};
            label.attributes.forEach((attr: any) => {
                defaultAttrs[attr.id] = attr.defaultValue;
            });
            dispatch(updateAudioIntervalAsync(activeIntervalID, {
                label,
                attributes: defaultAttrs,
            }));
        } else {
            dispatch(audioActions.setAudioActiveLabel(labelID));
            message.destroy();
            message.success(`Default label has been changed to "${label.name}"`);
        }
    }, [dispatch, keyToLabelMapping, labels]);

    const handlers = useMemo(() => {
        const result: Record<string, (event: KeyboardEvent) => void> = {};
        for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
            result[makeKey(index)] = (event: KeyboardEvent) => {
                handleHelper(event, index);
            };
        }
        return result;
    }, [handleHelper]);

    return (
        <div className='cvat-objects-sidebar-labels-list'>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <div className='cvat-objects-sidebar-labels-list-header'>
                <Text>{`Items: ${labels.length}`}</Text>
            </div>
            {labelIDs.map((labelID: number): JSX.Element => (
                <MemoizedAudioLabelItem key={labelID} labelID={labelID} />
            ))}
        </div>
    );
}

export default React.memo(AudioLabelsList);
