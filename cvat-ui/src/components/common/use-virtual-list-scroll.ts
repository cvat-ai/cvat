// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useLayoutEffect, useRef } from 'react';
import { VirtualItem, Virtualizer } from '@tanstack/react-virtual';

export type VirtualListKey = VirtualItem['key'];

export interface VirtualListScrollTarget {
    key: VirtualListKey;
    align?: 'start' | 'center' | 'end' | 'auto';
    getElement?(row: HTMLDivElement): HTMLElement | null;
}

export type ScrollCompletion = 'aligned' | 'boundary' | 'cancelled' | 'missing';

interface Props {
    target: VirtualListScrollTarget | null;
    indexes: Map<VirtualListKey, number>;
    virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>;
    viewportRef: React.RefObject<HTMLDivElement>;
    expectedScrollRef: React.MutableRefObject<number | null>;
    isViewportVisible(): boolean;
    onComplete(target: VirtualListScrollTarget, reason: ScrollCompletion): void;
}

export default function useVirtualListScroll(props: Props): {
    schedule(): void;
    cancel(): void;
    onScroll(): void;
} {
    const propsRef = useRef(props);
    propsRef.current = props;
    const scheduleRef = useRef<() => void>(() => {});
    const cancelRef = useRef<() => void>(() => {});
    const observedOffsetRef = useRef(0);

    useLayoutEffect(() => {
        const {
            target, indexes, virtualizer, viewportRef, expectedScrollRef, onComplete,
        } = props;
        if (!target) return undefined;
        const index = indexes.get(target.key);
        if (index === undefined) {
            onComplete(target, 'missing');
            return undefined;
        }
        const viewport = viewportRef.current;
        if (!viewport) return undefined;

        let disposed = false;
        let frame: number | null = null;
        let previousGeometry: string | null = null;
        let alignTarget: () => void;
        const finish = (reason: ScrollCompletion): void => {
            if (disposed || propsRef.current.target !== target) return;
            disposed = true;
            if (frame !== null) window.cancelAnimationFrame(frame);
            onComplete(target, reason);
        };
        const schedule = (): void => {
            if (!disposed && frame === null) {
                frame = window.requestAnimationFrame(() => {
                    frame = null;
                    alignTarget();
                });
            }
        };
        alignTarget = (): void => {
            if (!propsRef.current.isViewportVisible()) return;
            const row = virtualizer.elementsCache.get(target.key);
            if (!row?.isConnected) return;

            // Reconcile the mounted range before using its positions. This also measures a pinned far-away row.
            virtualizer.elementsCache.forEach((element, key) => {
                const itemIndex = indexes.get(key);
                if (itemIndex !== undefined && element.offsetParent !== null) {
                    virtualizer.resizeItem(itemIndex, element.getBoundingClientRect().height);
                }
            });

            const candidate = target.getElement?.(row);
            const element = candidate?.getClientRects().length ? candidate : row;
            const bounds = element.getBoundingClientRect();
            const viewportTop = viewport.getBoundingClientRect().top + viewport.clientTop;
            const styles = window.getComputedStyle(viewport);
            const start = viewportTop + (Number.parseFloat(styles.scrollPaddingTop) || 0);
            const end = viewportTop + viewport.clientHeight - (Number.parseFloat(styles.scrollPaddingBottom) || 0);
            const align = target.align || 'start';
            let delta = bounds.top - start;
            if (align === 'end') delta = bounds.bottom - end;
            if (align === 'center') delta = (bounds.top + bounds.bottom - start - end) / 2;
            if (align === 'auto') {
                if (bounds.top >= start && bounds.bottom <= end) delta = 0;
                else if (bounds.top >= start && bounds.height <= end - start) delta = bounds.bottom - end;
            }
            const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
            const offset = Math.max(0, Math.min(viewport.scrollTop + delta, max));
            const aligned = Math.abs(delta) <= 1;
            const atBoundary = Math.abs(offset - viewport.scrollTop) <= 1;
            const geometry = [
                bounds.top, bounds.width, bounds.height, viewport.clientWidth,
                viewport.scrollTop, viewport.scrollHeight, start, end,
            ].join(',');
            const animating = row.getAnimations({ subtree: true }).some((animation) => (
                animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity
            ));
            if ((aligned || atBoundary) && geometry === previousGeometry && !animating) {
                finish(aligned ? 'aligned' : 'boundary');
                return;
            }
            previousGeometry = geometry;
            if (!aligned && !atBoundary) {
                expectedScrollRef.current = offset;
                viewport.scrollTop = offset;
            }
            schedule();
        };

        const observer = new ResizeObserver(schedule);
        observer.observe(viewport);
        const content = viewport.firstElementChild;
        if (content) observer.observe(content);
        const mutations = new MutationObserver(schedule);
        mutations.observe(viewport, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['style'],
        });
        const cancel = (): void => finish('cancelled');
        const onKeyDown = (event: KeyboardEvent): void => {
            if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key) &&
                !(event.target as Element).closest('input, textarea, select, [contenteditable="true"]')) {
                cancel();
            }
        };
        viewport.addEventListener('wheel', cancel, { passive: true });
        viewport.addEventListener('touchmove', cancel, { passive: true });
        viewport.addEventListener('pointerdown', cancel);
        viewport.addEventListener('keydown', onKeyDown);
        observedOffsetRef.current = viewport.scrollTop;
        scheduleRef.current = schedule;
        cancelRef.current = cancel;
        schedule();
        return (): void => {
            disposed = true;
            if (frame !== null) window.cancelAnimationFrame(frame);
            observer.disconnect();
            mutations.disconnect();
            viewport.removeEventListener('wheel', cancel);
            viewport.removeEventListener('touchmove', cancel);
            viewport.removeEventListener('pointerdown', cancel);
            viewport.removeEventListener('keydown', onKeyDown);
            scheduleRef.current = () => {};
            cancelRef.current = () => {};
        };
    }, [props.target, props.indexes, props.virtualizer]);

    return {
        schedule: () => scheduleRef.current(),
        cancel: () => cancelRef.current(),
        onScroll: (): void => {
            const viewport = propsRef.current.viewportRef.current;
            if (!viewport || !propsRef.current.isViewportVisible()) return;
            const offset = viewport.scrollTop;
            const expected = propsRef.current.expectedScrollRef.current;
            const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
            if (propsRef.current.target && offset !== observedOffsetRef.current &&
                (expected === null || Math.abs(offset - Math.max(0, Math.min(expected, max))) > 1)) {
                cancelRef.current();
            }
            observedOffsetRef.current = offset;
            propsRef.current.expectedScrollRef.current = null;
        },
    };
}
