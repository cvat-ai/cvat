// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import message from 'antd/lib/message';

import { CombinedState } from 'reducers';
import { rememberObject, updateAnnotationsAsync } from 'actions/annotation-actions';
import GlobalHotKeys from 'utils/mousetrap-react';
import LabelItem from './label-item';

function LabelsListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const activatedStateIDs = useSelector((state: CombinedState) => state.annotation.annotations.activatedStateIDs);
    const states = useSelector((state: CombinedState) => state.annotation.annotations.states);
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const labelShortcuts = useSelector((state: CombinedState) => state.annotation.job.labelShortcuts);

    const labelIDs = labels.map((label: any): number => label.id);

    // const [keyToLabelMapping, setKeyToLabelMapping] = useState<Record<string, number>>(
    //     Object.fromEntries(labelIDs.slice(0, 10).map((labelID: number, idx: number) => [(idx + 1) % 10, labelID])),
    // );

    const subKeyMap = {
        SWITCH_LABEL: keyMap.SWITCH_LABEL,
    };

    const handlers = {
        SWITCH_LABEL: (event: KeyboardEvent | undefined, shortcut: string) => {
            if (event) event.preventDefault();
            const labelID = labelShortcuts[shortcut.split('+')[1].trim()];
            const label = labels.filter((_label: any) => _label.id === labelID)[0];
            if (Number.isInteger(labelID) && label) {
                if (activatedStateIDs.length && Number.isInteger(activatedStateIDs[0])) {
                    const activatedStates = states.filter((state: any) => activatedStateIDs.includes(state.clientID));
                    if (activatedStates.length) {
                        for (const activatedState of activatedStates) {
                            activatedState.label = label;
                        }
                        dispatch(updateAnnotationsAsync(activatedStates));
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
        <div className='cvat-objects-sidebar-labels-list'>
            <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} />
            {labelIDs.map(
                (labelID: number): JSX.Element => (
                    <LabelItem key={labelID} labelID={labelID} />
                ),
            )}
        </div>
    );
}

export default React.memo(LabelsListComponent);
