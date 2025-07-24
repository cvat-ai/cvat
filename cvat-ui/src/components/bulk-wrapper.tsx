// Copyright (C) 2020-2022 Intel Corporation
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectionActions,
    SelectionActionsTypes,
} from 'actions/selection-actions';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { Action } from 'redux';

export interface BulkSelectProps {
    selected: boolean;
    onClick: (event?: React.MouseEvent) => boolean;
}

interface BulkWrapperProps {
    currentResourceIDs: (number | string)[];
    parentToChildrenMap?: Record<number, number[]>;
    children: (selectProps: (id: number | string, idx: number) => BulkSelectProps) => React.ReactNode;
}

function BulkWrapper(props: Readonly<BulkWrapperProps>): JSX.Element {
    const {
        children,
    } = props;

    const dispatch = useDispatch();
    const selectedIds = useSelector((state: any) => state.selection.selected);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const keyMap: KeyMap = {
        SELECT_ALL: {
            name: 'Select all',
            description: 'Select all resources',
            sequences: ['ctrl+a'],
            scope: ShortcutScope.ANNOTATION_PAGE, // or a more appropriate scope for your context
        },
    };
    const handlers = {
        SELECT_ALL: (event?: KeyboardEvent) => {
            event?.preventDefault();
            const { currentResourceIDs } = props;
            dispatch(selectionActions.selectResources(currentResourceIDs));
        },
    };

    // Track the last selected index for shift+click
    const lastSelectedIndexRef = useRef<number | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent): void {
            const target = event.target as HTMLElement;

            const dropdown = target.closest('.ant-dropdown');
            if (dropdown) return;

            const virtualList = target.closest('.rc-virtual-list');
            if (virtualList) return;

            const modal = document.querySelector('.ant-modal');
            if (modal && (modal as HTMLElement).offsetParent !== null) return;

            const resetClasses = [
                'cvat-bulk-wrapper',
                'cvat-cloud-storages-list-row',
                'cvat-jobs-list-row',
                'cvat-models-list-row',
                'cvat-projects-list-row',
            ];
            const hasResetClass = resetClasses.some((cls) => target.classList.contains(cls));

            if (hasResetClass ||
                (wrapperRef.current && !wrapperRef.current.contains(event.target as Node))
            ) {
                dispatch(selectionActions.clearSelectedResources());
                lastSelectedIndexRef.current = null;
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dispatch]);

    const { parentToChildrenMap = {} } = props;

    function handleChildren(rangeIds: (number | string)[]): (number | string)[] {
        const childIds = [];
        for (const resourceId of rangeIds) {
            if (parentToChildrenMap[resourceId as number]) {
                const childrenIDs = parentToChildrenMap[resourceId as number];
                childIds.push(...childrenIDs);
            }
        }
        return childIds;
    }

    function updateResources(
        rangeIds: (number | string)[],
        action: (ids: (number | string)[], appendSelection: boolean) => Action<SelectionActionsTypes>,
        reset = true,
        appendSelection = false,
    ): void {
        if (reset) {
            dispatch(selectionActions.clearSelectedResources());
        }
        const childrenIds = handleChildren(rangeIds);
        const allIds = rangeIds.concat(childrenIds);
        dispatch(action(allIds, appendSelection));
    }

    const selectProps = (
        resourceId: number | string,
        idx: number,
    ): BulkSelectProps => {
        const isSelected = selectedIds.includes(resourceId);
        const { currentResourceIDs } = props;
        return {
            selected: isSelected,
            onClick: (event?: React.MouseEvent) => {
                if (event?.shiftKey) {
                    // Shift+Click: select range
                    const allIds = currentResourceIDs;
                    const clickedIndex = idx;
                    const lastIndex = lastSelectedIndexRef.current ?? idx;
                    const [start, end] = [lastIndex, clickedIndex].sort((a, b) => a - b);
                    const rangeIds = allIds.slice(start, end + 1);
                    updateResources(rangeIds, selectionActions.selectResources);
                    lastSelectedIndexRef.current ??= idx;
                    return true;
                }
                if (event?.ctrlKey) {
                    // Ctrl+Click: toggle selection without clearing
                    updateResources(
                        [resourceId],
                        isSelected ? selectionActions.deselectResources : selectionActions.selectResources,
                        false,
                        true,
                    );

                    lastSelectedIndexRef.current = idx;
                    return true;
                }

                // Regular click: reset selection
                dispatch(selectionActions.clearSelectedResources());
                lastSelectedIndexRef.current = null;
                return false;
            },
        };
    };

    return (
        <div
            className={`cvat-bulk-wrapper${selectedIds.length > 1 ? ' cvat-item-list-selected' : ''}`}
            ref={wrapperRef}
        >
            <GlobalHotKeys keyMap={keyMap} handlers={handlers} />
            {children(selectProps)}
        </div>
    );
}

export default BulkWrapper;
