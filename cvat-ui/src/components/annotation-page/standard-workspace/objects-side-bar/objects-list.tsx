// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Text from 'antd/lib/typography/Text';

import { StatesOrdering } from 'reducers';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { ObjectState } from 'cvat-core-wrapper';
import ObjectListHeader from './objects-list-header';

interface Props {
    readonly: boolean;
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
        readonly,
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

    let latestZOrder: number | null = null;
    return (
        <>
            <ObjectListHeader
                readonly={readonly}
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
                    (id: number): JSX.Element => {
                        const object = objectStates.find((state: ObjectState) => state.clientID === id);
                        const zOrder = object?.zOrder || latestZOrder;

                        const renderZLayer = latestZOrder !== zOrder && statesOrdering === StatesOrdering.Z_ORDER;
                        if (renderZLayer) {
                            latestZOrder = zOrder;
                        }

                        return (
                            <React.Fragment key={id}>
                                {renderZLayer && (
                                    <div className='cvat-objects-sidebar-z-layer-mark'>
                                        <Text strong>
                                            {`Layer ${zOrder}`}
                                        </Text>
                                    </div>
                                )}
                                <ObjectItemContainer
                                    readonly={readonly}
                                    objectStates={objectStates}
                                    clientID={id}
                                />
                            </React.Fragment>
                        );
                    },
                )}
            </div>
        </>
    );
}

export default React.memo(ObjectListComponent);
