// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import Icon from '@ant-design/icons';
import Button from 'antd/lib/button';

import { CombinedState } from 'reducers';
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

function SaveAnnotationsButton() {
    const dispatch = useDispatch();
    const { isSaving, keyMap, normKeyMap } = useSelector((state: CombinedState) => ({
        isSaving: state.annotation.annotations.saving.uploading,
        keyMap: state.shortcuts.keyMap,
        normKeyMap: state.shortcuts.normalizedKeyMap,
    }), shallowEqual);

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        SAVE_JOB: (event: KeyboardEvent | undefined) => {
            event?.preventDefault();
            if (!isSaving) {
                dispatch(saveAnnotationsAsync());
            }
        },
    };

    return (
        <>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <CVATTooltip overlay={`Save current changes ${normKeyMap.SAVE_JOB}`}>
                <Button
                    type='link'
                    onClick={isSaving ? undefined : () => dispatch(saveAnnotationsAsync())}
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
