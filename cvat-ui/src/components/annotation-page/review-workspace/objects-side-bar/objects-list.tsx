// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { StatesOrdering } from 'reducers/interfaces';
import ObjectItemContainer from 'containers/annotation-page/review-workspace/objects-side-bar/object-item';
import ObjectListHeader from './objects-list-header';

interface Props {
    listHeight: number;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    sortedStatesID: number[];
    objectStates: any[];
    changeStatesOrdering(value: StatesOrdering): void;
    collapseAllStates(): void;
    expandAllStates(): void;
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        listHeight,
        statesCollapsedAll,
        statesOrdering,
        sortedStatesID,
        objectStates,
        changeStatesOrdering,
        collapseAllStates,
        expandAllStates,
    } = props;

    return (
        <div style={{ height: listHeight }}>
            <ObjectListHeader
                statesCollapsed={statesCollapsedAll}
                statesOrdering={statesOrdering}
                changeStatesOrdering={changeStatesOrdering}
                collapseAllStates={collapseAllStates}
                expandAllStates={expandAllStates}
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
