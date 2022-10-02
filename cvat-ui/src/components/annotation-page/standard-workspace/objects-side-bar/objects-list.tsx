// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import React, { useRef } from 'react';

import { StatesOrdering } from 'reducers';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import ObjectState from 'cvat-core/src/object-state';
import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList as List } from 'react-window';
import { Label } from 'cvat-core/src/labels';
import { getRowSize } from 'containers/annotation-page/standard-workspace/objects-side-bar/object-list-sorter';
import ObjectListHeader from './objects-list-header';
import LabelItem from './label-item';

interface Props {
    readonly: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    collapsedStates: Record<number, boolean>;
    collapsedLabelStates: Record<number, boolean>;
    statesOrdering: StatesOrdering;
    groupedObjects: (Label | ObjectState)[];
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
    collapseLabelGroup(labelID: number, value: boolean): void;
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        readonly,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        collapsedStates,
        collapsedLabelStates,
        statesOrdering,
        groupedObjects,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        changeStatesOrdering,
        lockAllStates,
        unlockAllStates,
        collapseAllStates,
        expandAllStates,
        collapseLabelGroup,
        hideAllStates,
        showAllStates,
    } = props;

    const listRef = useRef();

    if (listRef?.current) {
        listRef.current.resetAfterIndex(0, false);
    }

    const renderLabel = (label: Label) => (
        <div
            onClick={() => {
                const labelId = label.id ?? 0;
                collapseLabelGroup(labelId, !collapsedLabelStates[labelId]);
                listRef.current.resetAfterIndex(0, false);
            }}
        >
            <LabelItem labelID={label.id ?? 0} />
        </div>
    );
    const renderObject = (object: ObjectState) => (
        <ObjectItemContainer
            readonly={readonly}
            activateOnClick
            objectState={object}
            key={object.clientID}
        />
    );

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
            <AutoSizer className='cvat-objects-sidebar-states-list'>
                {({ height, width }) => (
                    <List
                        itemCount={groupedObjects.length}
                        itemSize={(index: number) => getRowSize(groupedObjects, collapsedStates, index)}
                        height={height - 50}
                        width={width}
                        ref={listRef}
                    >
                        {({ index, style }): JSX.Element => (
                            <div style={style}>
                                {groupedObjects[index] instanceof Label ?
                                    renderLabel(groupedObjects[index] as Label) :
                                    renderObject(groupedObjects[index] as ObjectState)}
                            </div>
                        )}
                    </List>
                )}
            </AutoSizer>
        </>
    );
}

export default React.memo(ObjectListComponent);
