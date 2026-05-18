// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { shallowEqual } from 'utils/redux';
import Icon from '@ant-design/icons';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';

import { AudioRegion, CombinedState, Workspace } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { subKeyMap } from 'utils/component-subkeymap';
import { saveAnnotationsAsync } from 'actions/annotation-actions';
import { SaveIcon } from 'icons';

const componentShortcuts = {
    SAVE_JOB: {
        name: 'Save the job',
        description: 'Submit unsaved changes of annotations to the server',
        sequences: ['ctrl+s'],
        scope: ShortcutScope.ANNOTATION_PAGE,
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
                        return (
                            <li key={region.id}>
                                {`Region #${index}: ${formatRegionTime(region.start)} – ${formatRegionTime(region.end)}`}
                            </li>
                        );
                    })}
                </ul>
            </div>
        ),
    });
}

function SaveAnnotationsButton() {
    const dispatch = useDispatch();
    const {
        isSaving, keyMap, normKeyMap, workspace, regions,
    } = useSelector((state: CombinedState) => ({
        isSaving: state.annotation.annotations.saving.uploading,
        keyMap: state.shortcuts.keyMap,
        normKeyMap: state.shortcuts.normalizedKeyMap,
        workspace: state.annotation.workspace,
        regions: state.audio.player.regions,
    }), shallowEqual);

    const trySave = useCallback(() => {
        if (isSaving) return;
        if (workspace === Workspace.AUDIO) {
            const noneRegions = regions.filter((r: AudioRegion) => r.labelId === null);
            if (noneRegions.length > 0) {
                showNoneLabelModal(noneRegions, regions);
                return;
            }
        }
        dispatch(saveAnnotationsAsync());
    }, [isSaving, workspace, regions, dispatch]);

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SAVE_JOB: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            trySave();
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <CVATTooltip overlay={`Save current changes ${normKeyMap.SAVE_JOB}`}>
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

function SaveAnnotationsButtonWrap(): JSX.Element {
    const overrides = useSelector(
        (state: CombinedState) => state.plugins.overridableComponents.annotationPage.header.saveAnnotationButton,
    );

    if (overrides.length) {
        const [Component] = overrides.slice(-1);
        return <Component />;
    }

    return <SaveAnnotationsButton />;
}

export default React.memo(SaveAnnotationsButtonWrap);
