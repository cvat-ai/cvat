// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
    defaultRangeExtractor, elementScroll, useVirtualizer,
} from '@tanstack/react-virtual';
import useVirtualListScroll, {
    ScrollCompletion, VirtualListKey, VirtualListScrollTarget,
} from './use-virtual-list-scroll';
import VirtualScrollbar from './virtual-scrollbar';
import './virtual-list.scss';

export type { VirtualListScrollTarget } from './use-virtual-list-scroll';

export interface VirtualListHandle {
    scrollToKey(key: VirtualListKey, align?: VirtualListScrollTarget['align']): void;
    scrollToIndex(index: number, align?: VirtualListScrollTarget['align']): void;
    scrollToOffset(offset: number): void;
    getScrollElement(): HTMLDivElement | null;
}

interface Props<T> {
    data: readonly T[];
    itemKey(item: T): VirtualListKey;
    itemType?(item: T): string;
    estimateSize?(item: T): number;
    overscan?: number;
    /** Keep a small set mounted during operations such as dragging or editing an offscreen row. */
    keepMountedKeys?: readonly VirtualListKey[];
    className?: string;
    style?: React.CSSProperties;
    listRef?: React.Ref<VirtualListHandle>;
    scrollTarget?: VirtualListScrollTarget | null;
    onScrollTargetComplete?(target: VirtualListScrollTarget, reason: ScrollCompletion): void;
    children(item: T, index: number): React.ReactNode;
}

const DEFAULT_OVERSCAN = 8;
const defaultItemType = (): string => 'item';

/** Vertical, dynamically measured virtualization. Stable keys and row kinds are independent of any sidebar model. */
export default function VirtualList<T>(props: Props<T>): JSX.Element {
    const {
        data, itemKey, itemType = defaultItemType, estimateSize, overscan = DEFAULT_OVERSCAN,
        className = '', style, listRef, scrollTarget = null, keepMountedKeys, children,
    } = props;
    const viewportRef = useRef<HTMLDivElement>(null);
    const viewportID = useId();
    const contentRef = useRef<HTMLDivElement>(null);
    const expectedScrollRef = useRef<number | null>(null);
    const sampleRefs = useRef(new Map<number, HTMLDivElement>());
    const [typeSizes, setTypeSizes] = useState(new Map<string, number>());
    const [rect, setRect] = useState({ width: 0, height: 0 });
    const [requestedTarget, setRequestedTarget] = useState<VirtualListScrollTarget | null>(null);
    const [completedTarget, setCompletedTarget] = useState<VirtualListScrollTarget | null>(null);
    const target = scrollTarget && scrollTarget !== completedTarget ? scrollTarget : requestedTarget;
    const propsRef = useRef(props);
    propsRef.current = props;
    const samples = useMemo(() => {
        const firstByType = new Map<string, number>();
        data.forEach((item, index) => {
            const type = itemType(item);
            if (!firstByType.has(type)) firstByType.set(type, index);
        });
        return [...firstByType.values()];
    }, [data, itemType]);
    const calibrating = !estimateSize && samples.some((index) => !typeSizes.has(itemType(data[index])));
    const indexes = useMemo(() => new Map(data.map((item, index) => [itemKey(item), index])), [data, itemKey]);
    const getItemKey = useCallback((index: number): VirtualListKey => itemKey(data[index]), [data, itemKey]);
    const finish = useCallback((request: VirtualListScrollTarget, reason: ScrollCompletion): void => {
        setCompletedTarget(request);
        setRequestedTarget((current) => (current === request ? null : current));
        propsRef.current.onScrollTargetComplete?.(request, reason);
    }, []);
    const scrollActionsRef = useRef({ schedule: (): void => {}, cancel: (): void => {}, onScroll: (): void => {} });
    const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: data.length,
        enabled: !calibrating && rect.height > 0 && rect.width > 0,
        getScrollElement: () => viewportRef.current,
        getItemKey,
        estimateSize: (index) => estimateSize?.(data[index]) ?? typeSizes.get(itemType(data[index])) ?? 1,
        overscan,
        rangeExtractor: (range) => {
            const visible = defaultRangeExtractor(range);
            const index = target ? indexes.get(target.key) : undefined;
            // Mount the requested row before moving to its measured offset, including nearby buffer rows.
            if (index !== undefined) {
                for (let i = Math.max(0, index - overscan); i <= Math.min(data.length - 1, index + overscan); i++) {
                    visible.push(i);
                }
            }
            keepMountedKeys?.forEach((key) => {
                const pinnedIndex = indexes.get(key);
                if (pinnedIndex !== undefined) visible.push(pinnedIndex);
            });
            return [...new Set(visible)].sort((a, b) => a - b);
        },
        measureElement: (element, entry, instance) => {
            if (element.offsetParent === null) {
                const index = Number(element.dataset.index);
                return instance.itemSizeCache.get(instance.options.getItemKey(index)) ??
                    instance.options.estimateSize(index);
            }
            // Preserve fractional CSS pixels; rounding every row accumulates into gaps at the bottom.
            return entry?.borderBoxSize?.[0]?.blockSize ?? element.getBoundingClientRect().height;
        },
        directDomUpdates: true,
        directDomUpdatesMode: 'position',
        scrollToFn: (offset, options, instance) => {
            expectedScrollRef.current = offset + (options.adjustments || 0);
            elementScroll(offset, options, instance);
        },
        onChange: () => scrollActionsRef.current.schedule(),
    });
    scrollActionsRef.current = useVirtualListScroll({
        target, indexes, virtualizer, viewportRef, expectedScrollRef, onComplete: finish,
    });
    const setContentRef = useCallback((element: HTMLDivElement | null): void => {
        contentRef.current = element;
        virtualizer.containerRef(element);
    }, [virtualizer]);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return undefined;
        setRect({ width: viewport.clientWidth, height: viewport.clientHeight });
        const observer = new ResizeObserver(([entry]) => {
            setRect((previous) => (previous.width === entry.contentRect.width &&
                previous.height === entry.contentRect.height ? previous : {
                    width: entry.contentRect.width, height: entry.contentRect.height,
                }));
        });
        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        if (!calibrating || !rect.width || !rect.height) return undefined;
        const measureSamples = (): void => {
            const measured = new Map(typeSizes);
            samples.forEach((index) => {
                const element = sampleRefs.current.get(index);
                if (element && element.offsetParent !== null) {
                    const { height } = element.getBoundingClientRect();
                    if (height > 0) measured.set(itemType(data[index]), height);
                }
            });
            // A hidden viewport may not have delivered its resize notification yet; wait for it.
            if (measured.size > typeSizes.size) setTypeSizes(measured);
        };
        measureSamples();
        // Other consumers may render asynchronous content (for example, images) in their initial sample.
        const observer = new ResizeObserver(measureSamples);
        sampleRefs.current.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [calibrating, rect.width, rect.height, samples, data, itemType, typeSizes]);

    useImperativeHandle(listRef, () => ({
        scrollToKey: (key, align = 'start'): void => {
            scrollActionsRef.current.cancel();
            setRequestedTarget({ key, align });
        },
        scrollToIndex: (index, align = 'start'): void => {
            const item = propsRef.current.data[index];
            if (item !== undefined) {
                scrollActionsRef.current.cancel();
                setRequestedTarget({ key: propsRef.current.itemKey(item), align });
            }
        },
        scrollToOffset: (offset): void => {
            scrollActionsRef.current.cancel();
            if (viewportRef.current) viewportRef.current.scrollTop = offset;
        },
        getScrollElement: () => viewportRef.current,
    }), []);

    return (
        <div className={`cvat-virtual-list ${className}`} style={style}>
            <div
                ref={viewportRef}
                id={viewportID}
                className='cvat-virtual-list-viewport'
                data-virtual-list-viewport
                onScroll={() => scrollActionsRef.current.onScroll()}
            >
                <div ref={setContentRef} className='cvat-virtual-list-content'>
                    {virtualizer.getVirtualItems().map((item) => (
                        <div
                            key={`${typeof item.key}:${String(item.key)}`}
                            ref={virtualizer.measureElement}
                            data-index={item.index}
                            data-virtual-list-row
                            className='cvat-virtual-list-row'
                        >
                            {children(data[item.index], item.index)}
                        </div>
                    ))}
                </div>
                {calibrating && (
                    <div className='cvat-virtual-list-samples' aria-hidden='true'>
                        {samples.map((index) => (
                            <div
                                key={`${typeof itemKey(data[index])}:${String(itemKey(data[index]))}`}
                                style={{ display: 'flow-root' }}
                                ref={(element): void => {
                                    if (element) sampleRefs.current.set(index, element);
                                    else sampleRefs.current.delete(index);
                                }}
                            >
                                {children(data[index], index)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <VirtualScrollbar
                viewportRef={viewportRef}
                viewportID={viewportID}
                contentRef={contentRef}
                onInteraction={() => scrollActionsRef.current.cancel()}
            />
        </div>
    );
}
