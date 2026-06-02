// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import Icon from '@ant-design/icons';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';

import { AudioRegion, CombinedState } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import { saveAnnotationsAsync } from 'actions/annotation-actions';
import { SaveIcon } from 'icons';

const componentShortcuts = {
    SAVE_JOB_AUDIO: {
        name: 'Save the job (audio)',
        description: 'Submit unsaved changes of audio annotations to the server',
        sequences: ['ctrl+s'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function formatRegionTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showNoneLabelModal(noneRegions: AudioRegion[], allRegions: AudioRegion[]): void {
    Modal.warning({
        title: 'Cannot save: regions with label "None"',
        width: 480,
        content: (
            <div>
                <p>
                    The following regions have no label assigned.
                    Please assign a label to each region before saving.
                </p>
                <ul style={{ maxHeight: 200, overflow: 'auto', paddingLeft: 20 }}>
                    {noneRegions.map((region) => {
                        const index = allRegions.indexOf(region) + 1;
                        const startTime = formatRegionTime(region.start);
                        const endTime = formatRegionTime(region.end);
                        return (
                            <li key={region.id}>
                                {`Region #${index}: ${startTime} – ${endTime}`}
                            </li>
                        );
                    })}
                </ul>
            </div>
        ),
    });
}

function AudioSaveAnnotationsButton(): JSX.Element {
    const dispatch = useDispatch();
    const {
        isSaving, keyMap, normKeyMap, regions,
    } = useSelector((state: CombinedState) => ({
        isSaving: state.annotation.annotations.saving.uploading,
        keyMap: state.shortcuts.keyMap,
        normKeyMap: state.shortcuts.normalizedKeyMap,
        regions: state.audio.player.regions,
    }), shallowEqual);

    const trySave = useCallback(() => {
        if (isSaving) return;
        const noneRegions = regions.filter((r: AudioRegion) => r.labelId === null);
        if (noneRegions.length > 0) {
            showNoneLabelModal(noneRegions, regions);
            return;
        }
        dispatch(saveAnnotationsAsync());
    }, [isSaving, regions, dispatch]);

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SAVE_JOB_AUDIO: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            trySave();
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <CVATTooltip overlay={`Save current changes ${normKeyMap.SAVE_JOB_AUDIO ?? ''}`}>
                <Button
                    type='link'
                    onClick={trySave}
                    className={isSaving ? 'cvat-annotation-header-save-button cvat-annotation-disabled-header-button' :
                        'cvat-annotation-header-save-button cvat-annotation-header-button'}
                >
                    <Icon component={SaveIcon} />
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </CVATTooltip>
        </>
    );
}

export default React.memo(AudioSaveAnnotationsButton);
