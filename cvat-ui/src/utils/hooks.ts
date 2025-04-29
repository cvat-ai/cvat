// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import {
    useRef, useEffect, useState, useCallback,
    EffectCallback, DependencyList,
} from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router';
import { CombinedState, PluginComponent, InstanceType } from 'reducers';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { authQuery } from './auth-query';
import { KeyMap, KeyMapItem } from './mousetrap-react';

// eslint-disable-next-line import/prefer-default-export
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
    component: CallableFunction;
    weight: number;
};

export function usePlugins(
    getState: (state: CombinedState) => PluginComponent[],
    props: object = {}, state: object = {},
): Plugin[] {
    const components = useSelector(getState);
    const filteredComponents = components.filter((component) => component.data.shouldBeRendered(props, state));
    const mappedComponents = filteredComponents
        .map(({ component, data }): {
            component: CallableFunction;
            weight: number;
        } => ({
            component,
            weight: data.weight,
        }));
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
    const {
        numberOfRows, minHeight, paddings, containerClassName, siblingClassNames,
    } = params;

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

    useEffect(() => () => {
        const revertedShortcuts = Object.entries(componentShortcuts).reduce((acc: KeyMap, [key, value]) => {
            acc[key] = {
                ...value,
                sequences: keyMapRef.current[key]?.sequences ?? [],
            };
            return acc;
        }, {});
        registerComponentShortcuts(revertedShortcuts);
    }, []);
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
        pid?: string,
        jid?: string,
        tid?: string,
    }>();

    if (type === InstanceType.PROJECT) return +(params.pid as string);
    if (type === InstanceType.JOB) return +(params.jid as string);
    return +(params.tid as string);
}
