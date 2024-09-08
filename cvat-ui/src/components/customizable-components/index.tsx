// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import Icon from '@ant-design/icons';
import Button from 'antd/lib/button';
import { SaveIcon } from 'icons';
import GlobalHotKeys from 'utils/mousetrap-react';
import CVATTooltip from 'components/common/cvat-tooltip';
import PaidFeaturePlaceholder from 'components/customizable-components/paid-feature-placeholder/paid-feature-placeholder';
import AllocationTable from 'components/quality-control/task-quality/allocation-table';
import config from 'config';
import { CombinedState } from 'reducers';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';

const componentShortcuts = {
    SAVE_JOB: {
        name: 'Save the job',
        description: 'Send all changes of annotations to the server',
        sequences: ['ctrl+s'],
        scope: ShortcutScope.ANNOTATION_PAGE,
    },
};

registerComponentShortcuts(componentShortcuts);

const storage = {
    SAVE_ANNOTATION_BUTTON: (props: any & {
        isSaving: boolean;
    }) => {
        const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
        const normKeyMap = useSelector((state: CombinedState) => state.shortcuts.normalizedKeyMap);
        const { isSaving, shortcut, ...rest } = props;

        const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
            SAVE_JOB: (event: KeyboardEvent | undefined) => {
                const { onClick } = props;
                if (event) event.preventDefault();
                if (onClick) onClick();
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                <CVATTooltip overlay={`Save current changes ${normKeyMap.SAVE_JOB}`}>
                    <Button
                        {...rest}
                    >
                        <Icon component={SaveIcon} />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </CVATTooltip>
            </>
        );
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    QUALITY_CONTROL_OVERVIEW: (_: any) => (
        <PaidFeaturePlaceholder featureDescription={config.PAID_PLACEHOLDER_CONFIG.features.qualityControl} />
    ),

    QUALITY_CONTROL_ALLOCATION_TABLE: AllocationTable,
};

export default storage;
