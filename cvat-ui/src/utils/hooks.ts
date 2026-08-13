// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import { useRef, useEffect, useState, useCallback, useLayoutEffect, EffectCallback, DependencyList } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router';
import { CombinedState, PluginComponent, InstanceType } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { authQuery } from './auth-query';
import { KeyMap, KeyMapItem } from './mousetrap-react';
import { dispatchContextMenuEvent } from './context-menu-helper';

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export function useIsMounted(): () => boolean {
    const ref = useRef(false);

    useEffect(() => {
        ref.current = true;
        return () => {
            ref.current = false;
        };
    }, []);

    return useCallback(() => ref.current, []);
}

export type Plugin = {
    component: any; // TODO: research which type should be here
    weight: number;
};

export function usePlugins(
    getState: (state: CombinedState) => PluginComponent[],
    props: object = {},
    state: object = {},
): Plugin[] {
    const components = useSelector(getState);
    const filteredComponents = components.filter((component) => component.data.shouldBeRendered(props, state));
    const mappedComponents = filteredComponents
        .map(({ component, data }): {
            component: any; // TODO: research which type should be here
            weight: number;
        } => ({
            component,
            weight: data.weight,
        }),
    );
    const ref = useRef<Plugin[]>(mappedComponents);

    if (!_.isEqual(ref.current, mappedComponents)) {
        ref.current = mappedComponents;
    }

    return ref.current;
}

export function useGoBack(): () => void {
    const history = useHistory();
    const prevLocation = useSelector((state: CombinedState) => state.navigation.prevLocation) ?? '/tasks';
    const goBack = useCallback(() => {
        history.push(prevLocation);
    }, [prevLocation]);

    return goBack;
}

export interface ICardHeightHOC {
    numberOfRows: number;
    minHeight: number;
    paddings: number;
    containerClassName: string;
    siblingClassNames: string[];
}

export function useCardHeightHOC(params: ICardHeightHOC): () => string {
    const { numberOfRows, minHeight, paddings, containerClassName, siblingClassNames } = params;

    return (): string => {
        const [height, setHeight] = useState('auto');
        useEffect(() => {
            const resize = (): void => {
                const container = window.document.getElementsByClassName(containerClassName)[0];
                const siblings = siblingClassNames.map(
                    (classname: string): Element | undefined => window.document.getElementsByClassName(classname)[0],
                );

                if (container) {
                    const { clientHeight: containerHeight } = container;
                    const othersHeight = siblings.reduce<number>((acc: number, el: Element | undefined): number => {
                        if (el) {
                            return acc + el.clientHeight;
                        }

                        return acc;
                    }, 0);

                    const cardHeight = (containerHeight - (othersHeight + paddings)) / numberOfRows;
                    setHeight(`${Math.max(Math.round(cardHeight), minHeight)}px`);
                }
            };

            resize();
            window.addEventListener('resize', resize);

            return () => {
                window.removeEventListener('resize', resize);
            };
        }, []);

        return height;
    };
}

export function useAuthQuery(): Record<string, string> | null {
    const history = useHistory();

    const queryParams = new URLSearchParams(history.location.search);
    return authQuery(queryParams);
}

export function useResetShortcutsOnUnmount(componentShortcuts: Record<string, KeyMapItem>): void {
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const keyMapRef = useRef(keyMap);

    useEffect(() => {
        keyMapRef.current = keyMap;
    }, [keyMap]);

    useEffect(
        () => () => {
            const revertedShortcuts = Object.entries(componentShortcuts).reduce((acc: KeyMap, [key, value]) => {
                acc[key] = {
                    ...value,
                    sequences: keyMapRef.current[key]?.sequences ?? [],
                };
                return acc;
            }, {});
            registerComponentShortcuts(revertedShortcuts);
        },
        [],
    );
}

export function usePageSizeData(ref: any): any {
    const [pageSizeData, setPageSizeData] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const resize = (): void => {
            if (ref?.current) {
                const { clientWidth, clientHeight } = ref.current;
                setPageSizeData({ width: clientWidth, height: clientHeight });
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, []);

    return pageSizeData;
}

export function useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void {
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return () => {};
        }

        return effect();
    }, deps);
}

export function useInstanceType(): InstanceType {
    const location = useLocation();
    const { pathname } = location;
    if (pathname.includes('projects')) return InstanceType.PROJECT;
    if (pathname.includes('jobs')) return InstanceType.JOB;
    return InstanceType.TASK;
}

export function useInstanceId(type: InstanceType): number {
    const params = useParams<{
        pid?: string;
        jid?: string;
        tid?: string;
    }>();

    if (type === InstanceType.PROJECT) return +(params.pid as string);
    if (type === InstanceType.JOB) return +(params.jid as string);
    return +(params.tid as string);
}

export type DropdownEditField = {
    dropdownOpen: boolean;
    editField: string | null;
    startEditField: (key: string) => void;
    stopEditField: () => void;
    onOpenChange: (open: boolean, options: { source: 'trigger' | 'menu' }) => void;
    onMenuClick: (options: { key: string }) => void;
};

export function useDropdownEditField(): DropdownEditField {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [editField, setEditField] = useState<string | null>(null);
    const startEditField = useCallback((field: string) => setEditField(field), []);
    const stopEditField = useCallback(() => {
        setEditField(null);
        setDropdownOpen(false);
    }, []);

    const onOpenChange = useCallback(
        (
            open: boolean,
            {
                source,
            }: {
                source: 'trigger' | 'menu';
            },
        ) => {
            if (source === 'trigger') {
                setDropdownOpen(open);
            }
            if (!open && editField) {
                stopEditField();
            }
        },
        [editField, stopEditField],
    );

    const onMenuClick = useCallback(({ key }: { key: string }) => {
        if (!key.startsWith('edit') && !key.endsWith('selector')) {
            setDropdownOpen(false);
        }
    }, []);

    return {
        dropdownOpen,
        editField,
        startEditField,
        stopEditField,
        onOpenChange,
        onMenuClick,
    };
}

interface ResourceQueryDefaultParams {
    page?: number;
    pageSize?: number;
    filter?: string | null;
}

export function useResourceQuery<
    QueryType extends {
        page: number;
        pageSize: number;
        filter?: string;
    },
>(query: QueryType, defaultParams: ResourceQueryDefaultParams = {}): QueryType {
    const { page = 1, pageSize = 10, filter = null } = defaultParams;

    const history = useHistory();

    const queryParams = new URLSearchParams(history.location.search);
    const updatedQuery = { ...query };
    for (const key of Object.keys(updatedQuery)) {
        (updatedQuery as Record<string, any>)[key] = queryParams.get(key) || null;
        if (key === 'page') {
            updatedQuery.page = updatedQuery.page ? +updatedQuery.page : page;
        }
        if (key === 'pageSize') {
            updatedQuery.pageSize = updatedQuery.pageSize ? +updatedQuery.pageSize : pageSize;
        }
        if (key === 'filter') {
            updatedQuery.filter = updatedQuery.filter ? updatedQuery.filter : filter;
        }
    }
    return updatedQuery;
}

export interface ContextMenuClick<T extends HTMLElement = HTMLElement> {
    itemRef: React.RefObject<T>;
    handleContextMenuClick: (e: React.MouseEvent) => void;
    handleContextMenuCapture: (e: React.MouseEvent) => void;
}

export function useContextMenuClick<T extends HTMLElement = HTMLElement>(
    preventSelectors: string[] = [
        'a',
        'input',
        '.ant-dropdown-menu-item',
        '.ant-select-item-option',
        '.ant-select-selector',
    ],
): ContextMenuClick<T> {
    const itemRef = useRef<T>(null);

    const handleContextMenuClick = useCallback((e: React.MouseEvent) => {
        if (itemRef.current) {
            dispatchContextMenuEvent(itemRef.current, e);
        }
    }, []);

    const shouldPreventContextMenu = useCallback(
        (target: EventTarget | null): boolean => {
            if (!target || !(target instanceof Element)) return false;
            return preventSelectors.some((selector) => target.closest(selector) !== null);
        },
        [preventSelectors],
    );

    const handleContextMenuCapture = useCallback(
        (e: React.MouseEvent) => {
            if (shouldPreventContextMenu(e.target)) {
                e.stopPropagation();
            }
        },
        [shouldPreventContextMenu],
    );

    return { itemRef, handleContextMenuClick, handleContextMenuCapture };
}

export interface UsePageQuerySyncParams<QueryType> {
    query: QueryType;
    updatedQuery: QueryType;
    onFetch: (query: QueryType) => void;
    updateHistoryFromQuery: (query: QueryType) => string;
    getFilterSortSearch?: (query: QueryType) => {
        filter?: string | null;
        sort?: string | null;
        search?: string | null;
    };
}

export function usePageQuerySync<QueryType extends { page: number; pageSize: number }>({
    query,
    updatedQuery,
    onFetch,
    updateHistoryFromQuery,
    getFilterSortSearch,
}: UsePageQuerySyncParams<QueryType>): {
    isMounted: boolean;
    setQuery: (nextQuery: QueryType) => void;
} {
    const history = useHistory();
    const [isMounted, setIsMountedState] = useState(false);
    const isMountedRef = useRef(false);

    useEffect(() => {
        // Initial fetch on mount
        onFetch({ ...updatedQuery });
        isMountedRef.current = true;
        setIsMountedState(true);
    }, []);

    useEffect(() => {
        // Fetch when query changes (but not on initial mount)
        if (isMountedRef.current && !_.isEqual(query, updatedQuery)) {
            onFetch({ ...updatedQuery });
        }
    }, [updatedQuery, query]);

    const setQuery = useCallback(
        (nextQuery: QueryType) => {
            if (isMountedRef.current) {
                const nextSearch = updateHistoryFromQuery(nextQuery);

                // Don't update history if search string hasn't changed
                if (nextSearch === (history.location.search || '')) return;

                // Check if only page changed (for pagination)
                const queryInfo = getFilterSortSearch ? getFilterSortSearch(nextQuery) : nextQuery;
                const updatedQueryInfo = getFilterSortSearch ? getFilterSortSearch(updatedQuery) : updatedQuery;

                if (_.isEqual(queryInfo, updatedQueryInfo)) {
                    // Only pagination changed, use replace
                    history.replace({ search: nextSearch });
                } else {
                    // Filter/sort/search changed, use push
                    history.push({ ...history.location, search: nextSearch });
                }
            }
        },
        [history.location, updatedQuery, updateHistoryFromQuery, getFilterSortSearch],
    );

    return { isMounted, setQuery };
}
