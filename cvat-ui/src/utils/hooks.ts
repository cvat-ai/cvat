// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import React, { useRef, useEffect, useState } from 'react';

// eslint-disable-next-line import/prefer-default-export
export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export function useDidUpdateEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
    const didMountRef = useRef(false);
    useEffect(() => {
        if (didMountRef.current) {
            effect();
        } else {
            didMountRef.current = true;
        }
    }, deps);
}

export interface ICardHeightHOC {
    numberOfRows: number;
    paddings: number;
    containerClassName: string;
    siblingClassNames: string[];
}

export function useCardHeightHOC(params: ICardHeightHOC): () => string {
    const {
        numberOfRows, paddings, containerClassName, siblingClassNames,
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
                    setHeight(`${Math.round(cardHeight)}px`);
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
