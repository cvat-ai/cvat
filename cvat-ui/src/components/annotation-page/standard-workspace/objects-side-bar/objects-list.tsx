// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { StatesOrdering } from 'reducers';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { SortedLabelGroup } from 'containers/annotation-page/standard-workspace/objects-side-bar/object-list-sorter';
import ObjectState from 'cvat-core/src/object-state';
import { Collapse } from 'antd';
import ObjectListHeader from './objects-list-header';
import LabelItem from './label-item';

interface Props {
    readonly: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    groupedObjects: SortedLabelGroup[];
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
        groupedObjects,
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
                {groupedObjects.map(
                    (group: SortedLabelGroup): JSX.Element => (
                        <Collapse
                            className='cvat-objects-sidebar-label-group-collapse'
                            bordered={false}
                            defaultActiveKey='details'
                        >
                            <Collapse.Panel header={<LabelItem labelID={group.label.id ?? 0} />} key='details'>
                                {group.objects.map(
                                    (state: ObjectState): JSX.Element => (
                                        <ObjectItemContainer
                                            readonly={readonly}
                                            activateOnClick
                                            objectStates={objectStates}
                                            key={state.clientID}
                                            clientID={state.clientID ?? 0}
                                        />
                                    ),
                                )}
                            </Collapse.Panel>
                        </Collapse>
                    ),
                )}
            </div>
        </>
    );
}

export default React.memo(ObjectListComponent);
