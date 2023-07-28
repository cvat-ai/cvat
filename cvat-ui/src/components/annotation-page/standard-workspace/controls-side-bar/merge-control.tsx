// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Icon from '@ant-design/icons';

import { MergeIcon } from 'icons';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { ActiveControl } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import GlobalHotKeys, { KeyMapItem } from 'utils/mousetrap-react';

export interface Props {
    mergeObjects(enabled: boolean): void;
    canvasInstance: Canvas | Canvas3d;
    activeControl: ActiveControl;
    disabled?: boolean;
    shortcuts: {
        SWITCH_MERGE_MODE: {
            details: KeyMapItem;
            displayValue: string;
        }
    };
}

function MergeControl(props: Props): JSX.Element {
    const {
        shortcuts, activeControl, canvasInstance, mergeObjects, disabled,
    } = props;

    const shortcutHandlers = {
        SWITCH_MERGE_MODE: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            const merging = activeControl === ActiveControl.MERGE;
            if (!merging) {
                canvasInstance.cancel();
            }
            canvasInstance.merge({ enabled: !merging });
            mergeObjects(!merging);
        },
    };

    const dynamicIconProps =
        activeControl === ActiveControl.MERGE ?
            {
                className: 'cvat-merge-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.merge({ enabled: false });
                    mergeObjects(false);
                },
            } :
            {
                className: 'cvat-merge-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.merge({ enabled: true });
                    mergeObjects(true);
                },
            };

    return disabled ? (
        <Icon className='cvat-merge-control cvat-disabled-canvas-control' component={MergeIcon} />
    ) : (
        <>
            <GlobalHotKeys
                keyMap={{ SWITCH_MERGE_MODE: shortcuts.SWITCH_MERGE_MODE.details }}
                handlers={shortcutHandlers}
            />
            <CVATTooltip title={`Merge shapes/tracks ${shortcuts.SWITCH_MERGE_MODE.displayValue}`} placement='right'>
                <Icon {...dynamicIconProps} component={MergeIcon} />
            </CVATTooltip>
        </>
    );
}

export default React.memo(MergeControl);
