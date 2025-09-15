// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Action } from 'redux';
import {
    selectionActions,
    SelectionActionsTypes,
} from 'actions/selection-actions';
import { CombinedState, SelectedResourceType } from 'reducers';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { platformInfoV2 } from 'utils/platform-checker';

export interface BulkSelectProps {
    selected: boolean;
    onClick: (event?: React.MouseEvent) => boolean;
}

interface BulkWrapperProps {
    currentResourceIds: (number | string)[];
    resourceType: SelectedResourceType;
    parentToChildrenMap?: Record<number, number[]>;
    children: (selectProps: (id: number | string, idx: number) => BulkSelectProps) => React.ReactNode;
}

function BulkWrapper(props: Readonly<BulkWrapperProps>): JSX.Element {
    const {
        children,
        resourceType,
    } = props;

    const dispatch = useDispatch();
    const selectedIds = useSelector((state: CombinedState): (number | string)[] => {
        switch (resourceType) {
            case SelectedResourceType.PROJECTS:
                return state.projects.selected;
            case SelectedResourceType.TASKS:
                return state.tasks.selected;
            case SelectedResourceType.JOBS:
                return state.jobs.selected;
            case SelectedResourceType.REQUESTS:
                return state.requests.selected;
            case SelectedResourceType.MEMBERS:
                return state.organizations.selectedMembers;
            case SelectedResourceType.WEBHOOKS:
                return state.webhooks.selected;
            case SelectedResourceType.CLOUD_STORAGES:
                return state.cloudStorages.selected;
            case SelectedResourceType.MODELS:
                return state.models.selected;
            default:
                return [];
        }
    });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isShiftSelecting, setIsShiftSelecting] = React.useState(false);

    const isMac = platformInfoV2().toLowerCase().includes('mac');

    const keyMap: KeyMap = {
        SELECT_ALL: {
            name: 'Select all',
            description: 'Select all resources',
            sequences: ['ctrl+a', 'command+a'],
            scope: ShortcutScope.GENERAL,
        },
    };
    const handlers = {
        SELECT_ALL: (event?: KeyboardEvent) => {
            event?.preventDefault();
            const { currentResourceIds } = props;
            dispatch(selectionActions.selectResources(currentResourceIds, resourceType));
        },
    };

    // Track the last selected index for shift+click
    const lastSelectedIndexRef = useRef<number | null>(null);

    useEffect(() => {
        if (selectedIds.length === 0) {
            lastSelectedIndexRef.current = null;
        }
    }, [selectedIds]);

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
            ];
            const hasKeepClass = keepClasses.some((cls) => target.classList.contains(cls) || target.closest(`.${cls}`));
            if (hasKeepClass) {
                return;
            }

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
        action: (ids: (number | string)[]) => Action<SelectionActionsTypes>,
    ): void {
        const childrenIds = handleChildren(rangeIds);
        const allIds = rangeIds.concat(childrenIds);
        dispatch(action(allIds));
    }

    const selectProps = (
        resourceId: number | string,
        idx: number,
    ): BulkSelectProps => {
        const isSelected = selectedIds.includes(resourceId);
        const { currentResourceIds } = props;
        return {
            selected: isSelected,
            onClick: (event?: React.MouseEvent) => {
                if (event?.shiftKey) {
                    event.preventDefault();

                    // Shift+Click: select range
                    const allIds = currentResourceIds;
                    const clickedIndex = idx;
                    const lastIndex = lastSelectedIndexRef.current ?? idx;
                    const [start, end] = [lastIndex, clickedIndex].sort((a, b) => a - b);
                    const rangeIds = allIds.slice(start, end + 1);
                    updateResources(rangeIds, (ids) => selectionActions.selectResources(ids, resourceType));
                    lastSelectedIndexRef.current ??= idx;
                    return true;
                }

                const isModifierPressed = isMac ? event?.metaKey : event?.ctrlKey;
                if (isModifierPressed) {
                    updateResources(
                        [resourceId],
                        isSelected ?
                            (ids) => selectionActions.deselectResources(ids, resourceType) :
                            (ids) => selectionActions.selectResources(ids, resourceType),
                    );

                    lastSelectedIndexRef.current = idx;
                    return true;
                }

                // Watch for click on menu inside the card
                // Consider only selected items, if menu inside not selected card, selection will be reset
                if (event && isSelected) {
                    const keepParentClasses = [
                        'cvat-actions-menu-button',
                        'ant-dropdown-menu',
                        'ant-select-selector',
                    ];

                    let hasAllowedParentClass = false;
                    let parent = (event.target as HTMLElement);
                    let depth = 0;

                    const hasParentClass = (element: HTMLElement | null): boolean => (
                        !!element && keepParentClasses.some((cls) => element.classList.contains(cls))
                    );

                    while (parent && depth < 5) {
                        if (hasParentClass(parent)) {
                            hasAllowedParentClass = true;
                            break;
                        }
                        if (parent.parentElement) {
                            parent = parent.parentElement;
                        } else {
                            break;
                        }
                        depth += 1;
                    }

                    if (hasAllowedParentClass) {
                        return true;
                    }
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
