// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { StatesOrdering } from 'reducers/interfaces';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import ObjectListHeader from './objects-list-header';

interface Props {
    listHeight: number;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    sortedStatesID: number[];
    objectStates: any[];
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    changeStatesOrdering(value: StatesOrdering): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        listHeight,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        statesOrdering,
        sortedStatesID,
        objectStates,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        changeStatesOrdering,
        lockAllStates,
        unlockAllStates,
        collapseAllStates,
        expandAllStates,
        hideAllStates,
        showAllStates,
    } = props;

    return (
        <div style={{ height: listHeight }}>
            <ObjectListHeader
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                statesCollapsed={statesCollapsedAll}
                statesOrdering={statesOrdering}
                switchLockAllShortcut={switchLockAllShortcut}
                switchHiddenAllShortcut={switchHiddenAllShortcut}
                changeStatesOrdering={changeStatesOrdering}
                lockAllStates={lockAllStates}
                unlockAllStates={unlockAllStates}
                collapseAllStates={collapseAllStates}
                expandAllStates={expandAllStates}
                hideAllStates={hideAllStates}
                showAllStates={showAllStates}
            />
            <div className='cvat-objects-sidebar-states-list'>
                {sortedStatesID.map(
                    (id: number): JSX.Element => (
                        <ObjectItemContainer
                            objectStates={objectStates}
                            key={id}
                            clientID={id}
                            initialCollapsed={statesCollapsedAll}
                        />
                    ),
                )}
            </div>
        </div>
    );
}

export default React.memo(ObjectListComponent);
