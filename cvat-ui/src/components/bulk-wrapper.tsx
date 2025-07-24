// Copyright (C) CVAT.ai Corporation
//
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
    const [isShiftSelecting, setIsShiftSelecting] = React.useState(false);

    const keyMap: KeyMap = {
        SELECT_ALL: {
            name: 'Select all',
            description: 'Select all resources',
            sequences: ['ctrl+a', 'command+a'],
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
        function handleKeyDown(event: KeyboardEvent): void {
            if (event.shiftKey && !isShiftSelecting) {
                setIsShiftSelecting(true);
            }
        }

        function handleKeyUp(event: KeyboardEvent): void {
            if (!event.shiftKey && isShiftSelecting) {
                setIsShiftSelecting(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [isShiftSelecting]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent): void {
            const target = event.target as HTMLElement;

            const keepClasses = [
                'ant-dropdown',
                'rc-virtual-list',
                'cvat-resource-select-all-button',
            ];
            const hasKeepClass = keepClasses.some((cls) => target.classList.contains(cls) || target.closest(`.${cls}`));
            if (hasKeepClass) return;

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
                    event.preventDefault();

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

                if (event?.metaKey || event?.ctrlKey) {
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
            className={`cvat-bulk-wrapper${isShiftSelecting ? ' cvat-shift-selecting' : ''}`}
            ref={wrapperRef}
        >
            <GlobalHotKeys keyMap={keyMap} handlers={handlers} />
            {children(selectProps)}
        </div>
    );
}

export default BulkWrapper;
