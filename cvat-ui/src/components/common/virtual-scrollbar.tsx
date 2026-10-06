// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useLayoutEffect, useRef } from 'react';

interface Props {
    viewportRef: React.RefObject<HTMLDivElement>;
    viewportID: string;
    contentRef: React.RefObject<HTMLDivElement>;
    onInteraction(): void;
}

// A native scrolling element with the same overlay-thumb appearance as the previous sidebar scrollbar.
export default function VirtualScrollbar({
    viewportRef, viewportID, contentRef, onInteraction,
}: Props): JSX.Element {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ y: number; offset: number } | null>(null);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!viewport || !track || !thumb) return undefined;
        let hideTimer: number;
        const reveal = (): void => {
            window.clearTimeout(hideTimer);
            track.dataset.visible = 'true';
            hideTimer = window.setTimeout(() => {
                if (dragRef.current) reveal();
                else delete track.dataset.visible;
            }, 3000);
        };
        const update = (): void => {
            const height = viewport.clientHeight;
            const max = Math.max(0, viewport.scrollHeight - height);
            const thumbHeight = Math.min(height, Math.max(20, (height * height) / Math.max(1, viewport.scrollHeight)));
            track.style.display = max > 0 ? '' : 'none';
            track.style.top = `${viewport.offsetTop}px`;
            track.style.height = `${height}px`;
            thumb.style.height = `${thumbHeight}px`;
            thumb.style.top = `${max ? (viewport.scrollTop / max) * (height - thumbHeight) : 0}px`;
            thumb.setAttribute('aria-valuemax', String(max));
            thumb.setAttribute('aria-valuenow', String(Math.round(viewport.scrollTop)));
        };
        const onScroll = (): void => { update(); reveal(); };
        const root = viewport.parentElement;
        viewport.addEventListener('scroll', onScroll, { passive: true });
        root?.addEventListener('pointerenter', reveal);
        const observer = new ResizeObserver(update);
        observer.observe(viewport);
        if (contentRef.current) observer.observe(contentRef.current);
        update();
        reveal();
        return (): void => {
            window.clearTimeout(hideTimer);
            viewport.removeEventListener('scroll', onScroll);
            root?.removeEventListener('pointerenter', reveal);
            observer.disconnect();
        };
    }, [viewportRef, contentRef]);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        const viewport = viewportRef.current;
        if (!viewport || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        onInteraction();
        dragRef.current = { y: event.clientY, offset: viewport.scrollTop };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        const viewport = viewportRef.current;
        const drag = dragRef.current;
        if (!viewport || !drag) return;
        const range = viewport.clientHeight - event.currentTarget.offsetHeight;
        if (range > 0) {
            viewport.scrollTop = drag.offset + ((event.clientY - drag.y) / range) *
                (viewport.scrollHeight - viewport.clientHeight);
        }
    };

    return (
        <div ref={trackRef} className='cvat-virtual-list-scrollbar'>
            <div
                ref={thumbRef}
                className='cvat-virtual-list-scrollbar-thumb'
                role='scrollbar'
                aria-orientation='vertical'
                aria-controls={viewportID}
                aria-valuemin={0}
                aria-valuemax={0}
                aria-valuenow={0}
                tabIndex={0}
                onWheel={(event): void => {
                    onInteraction();
                    const viewport = viewportRef.current;
                    if (viewport) viewport.scrollTop += event.deltaY;
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => { dragRef.current = null; }}
                onLostPointerCapture={() => { dragRef.current = null; }}
                onKeyDown={(event): void => {
                    const viewport = viewportRef.current;
                    if (!viewport) return;
                    const offsets: Record<string, number> = {
                        ArrowUp: viewport.scrollTop - 40,
                        ArrowDown: viewport.scrollTop + 40,
                        PageUp: viewport.scrollTop - viewport.clientHeight,
                        PageDown: viewport.scrollTop + viewport.clientHeight,
                        Home: 0,
                        End: viewport.scrollHeight - viewport.clientHeight,
                    };
                    if (event.key in offsets) {
                        event.preventDefault();
                        onInteraction();
                        viewport.scrollTop = offsets[event.key];
                    }
                }}
            />
        </div>
    );
}
