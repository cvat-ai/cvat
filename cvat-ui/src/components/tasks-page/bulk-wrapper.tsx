// Copyright (C) 2020-2022 Intel Corporation
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectionActions,
} from 'actions/selection-actions';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';

export interface BulkSelectProps {
    selected: boolean;
    onClick: (event?: React.MouseEvent) => boolean;
}

interface BulkWrapperProps {
    currentResourceIDs: (number | string)[];
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
            dispatch(selectionActions.selectAllResources(currentResourceIDs));
        },
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent): void {
            const dropdown = (event.target as HTMLElement).closest('.ant-dropdown');
            if (dropdown) return;

            const virtualList = (event.target as HTMLElement).closest('.rc-virtual-list');
            if (virtualList) return;

            const modal = document.querySelector('.ant-modal');
            if (modal && (modal as HTMLElement).offsetParent !== null) return;

            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                dispatch(selectionActions.clearSelectedResources());
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dispatch]);

    // Track the last selected index for shift+click
    const lastSelectedIndexRef = useRef<number | null>(null);

    const selectProps = (
        resourceID: number | string,
        idx: number,
    ): BulkSelectProps => {
        const isSelected = selectedIds.includes(resourceID);
        const { currentResourceIDs } = props;
        return {
            selected: isSelected,
            onClick: (event?: React.MouseEvent) => {
                if (event?.shiftKey) {
                    // Shift+Click: select range
                    const allIDs = currentResourceIDs;
                    const clickedIndex = idx;
                    const lastIndex = lastSelectedIndexRef.current || idx;
                    const [start, end] = [lastIndex, clickedIndex].sort((a, b) => a - b);
                    const rangeIDs = allIDs.slice(start, end + 1);
                    dispatch(selectionActions.clearSelectedResources());
                    dispatch(selectionActions.selectAllResources(rangeIDs));
                    return true;
                }
                if (event?.ctrlKey) {
                    // Ctrl+Click: toggle selection without clearing
                    if (isSelected) {
                        dispatch(selectionActions.deselectResource(resourceID));
                    } else {
                        dispatch(selectionActions.selectResource(resourceID));
                    }
                    lastSelectedIndexRef.current = idx;
                    return true;
                }
                // Regular click: clear
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
