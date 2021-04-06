// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import message from 'antd/lib/message';

import { CombinedState } from 'reducers/interfaces';
import { rememberObject, updateAnnotationsAsync } from 'actions/annotation-actions';
import LabelItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/label-item';
import GlobalHotKeys from 'utils/mousetrap-react';

function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const {
        annotation: {
            job: { labels },
            tabContentHeight: listHeight,
            annotations: { activatedStateID, states },
        },
        shortcuts: { keyMap },
    } = useSelector((state: CombinedState) => state);

    const labelIDs = labels.map((label: any): number => label.id);

    const [keyMapping] = useState<Record<number, number>>(
        Object.fromEntries(
            labelIDs.slice(0, 10).map((labelID: number, idx: number) => [idx + 1 > 9 ? 0 : idx + 1, labelID]),
        ),
    );

    const subKeyMap = {
        SWITCH_LABEL: keyMap.SWITCH_LABEL,
    };

    const handlers = {
        SWITCH_LABEL: (event: KeyboardEvent | undefined, shortcut: string) => {
            if (event) event.preventDefault();
            const key = +shortcut.split('+')[1];
            const labelID = keyMapping[key];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                if (Number.isInteger(activatedStateID)) {
                    const activatedState = states.filter((state: any) => state.clientID === activatedStateID)[0];
                    if (activatedState) {
                        activatedState.label = label;
                        dispatch(updateAnnotationsAsync([activatedState]));
                    }
                } else {
                    dispatch(rememberObject({ activeLabelID: labelID }));
                    message.destroy();
                    message.success(`Default label was changed to "${label.name}"`);
                }
            }
        },
    };

    return (
        <div style={{ height: listHeight }} className='cvat-objects-sidebar-labels-list'>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            {labelIDs.map(
                (labelID: number): JSX.Element => (
                    <LabelItemContainer key={labelID} labelID={labelID} />
                ),
            )}
        </div>
    );
}

export default React.memo(LabelsListComponent);
