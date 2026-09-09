// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import createElement from 'wavesurfer.js/dist/dom';
import TimelinePlugin, { type TimelinePluginOptions } from 'wavesurfer.js/dist/plugins/timeline';

const VISIBLE_RANGE_OVERSCAN_VIEWPORTS = 1;

interface TimelinePluginInternals {
    timelineWrapper: HTMLElement;
    defaultTimeInterval(pixelsPerSecond: number): number;
    defaultPrimaryLabelInterval(pixelsPerSecond: number): number;
    defaultSecondaryLabelInterval(pixelsPerSecond: number): number;
}

/**
 * Keeps the stock TimelinePlugin API and markup while only creating ticks near the viewport.
 * WaveSurfer's TimelinePlugin keeps all notches in memory and rebuilds them on each redraw.
 */
export default class OptimizedTimelinePlugin extends TimelinePlugin {
    private renderHandle: number | null = null;
    private timeline: HTMLElement | null = null;
    private mountedNotches = new Map<number, HTMLElement>();

    public static create(options?: TimelinePluginOptions): OptimizedTimelinePlugin {
        return new OptimizedTimelinePlugin(options);
    }

    private getTimelinePlugin(): TimelinePluginInternals {
        return this as unknown as TimelinePluginInternals;
    }

    /**
     * Override the onInit method to avoid re-creating all notches on every redraw.
     * Instead only create notches that are visible in the viewport.
     * Must not call super.onInit().
     * Called by WaveSurfer when the plugin is initialized.
     */
    public onInit(): void {
        const { wavesurfer } = this;
        if (!wavesurfer) {
            throw new Error('Timeline plugin cannot initialize without a WaveSurfer instance');
        }

        const { timelineWrapper } = this.getTimelinePlugin();
        let container = wavesurfer.getWrapper();
        if (this.options.container instanceof HTMLElement) {
            container = this.options.container;
        } else if (typeof this.options.container === 'string') {
            const element = document.querySelector(this.options.container);
            if (!element) {
                throw new Error(`No Timeline container found matching ${this.options.container}`);
            }
            container = element as HTMLElement;
        }

        if (this.options.insertPosition) {
            (container.firstElementChild || container).insertAdjacentElement(
                this.options.insertPosition,
                timelineWrapper,
            );
        } else {
            container.appendChild(timelineWrapper);
        }

        this.subscriptions.push(
            wavesurfer.on('redraw', this.scheduleRender),
            wavesurfer.on('scroll', this.scheduleRender),
        );
        this.scheduleRender();
    }

    public destroy(): void {
        if (this.renderHandle !== null) {
            cancelAnimationFrame(this.renderHandle);
            this.renderHandle = null;
        }
        this.mountedNotches.clear();
        this.timeline = null;
        super.destroy();
    }

    private scheduleRender = (): void => {
        if (this.renderHandle !== null) return;

        this.renderHandle = requestAnimationFrame(() => {
            this.renderHandle = null;
            this.renderVisibleNotches();
        });
    };

    private renderVisibleNotches(): void {
        const { wavesurfer } = this;
        if (!wavesurfer) return;

        const timelinePlugin = this.getTimelinePlugin();
        const duration = wavesurfer.getDuration() ?? this.options.duration ?? 0;
        // WaveSurfer's wrapper can retain a previous canvas extent during resize.
        const trackWidth = timelinePlugin.timelineWrapper.scrollWidth || wavesurfer.getWrapper().scrollWidth;
        const viewportWidth = wavesurfer.getWidth();
        if (duration <= 0 || trackWidth <= 0 || viewportWidth <= 0) return;

        const pixelsPerSecond = trackWidth / duration;
        const timeInterval = this.options.timeInterval ?? timelinePlugin.defaultTimeInterval(pixelsPerSecond);
        const primaryLabelInterval = this.options.primaryLabelInterval ??
            timelinePlugin.defaultPrimaryLabelInterval(pixelsPerSecond);
        const secondaryLabelInterval = this.options.secondaryLabelInterval ??
            timelinePlugin.defaultSecondaryLabelInterval(pixelsPerSecond);
        const { primaryLabelSpacing, secondaryLabelSpacing, timeOffset } = this.options;
        const isTop = this.options.insertPosition === 'beforebegin';
        if (timeInterval <= 0) return;

        const timeline = this.getOrCreateTimeline();
        const notchEl = createElement('div', {
            style: {
                width: '0',
                height: '50%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isTop ? 'flex-start' : 'flex-end',
                top: isTop ? '0' : 'auto',
                bottom: isTop ? 'auto' : '0',
                overflow: 'visible',
                borderLeft: '1px solid currentColor',
                opacity: `${this.options.secondaryLabelOpacity ?? 0.25}`,
                position: 'absolute',
                zIndex: '1',
            },
        });

        const scrollLeft = wavesurfer.getScroll();
        const overscan = viewportWidth * VISIBLE_RANGE_OVERSCAN_VIEWPORTS;
        const startTime = Math.max(0, (scrollLeft - overscan) / pixelsPerSecond - timeOffset);
        const endTime = Math.min(
            duration,
            (scrollLeft + viewportWidth + overscan) / pixelsPerSecond - timeOffset,
        );
        const firstIndex = Math.max(0, Math.floor(startTime / timeInterval) - 1);
        const lastIndex = Math.ceil(endTime / timeInterval) + 1;

        this.mountedNotches.forEach((notch, index) => {
            if (index >= firstIndex && index <= lastIndex) return;

            notch.remove();
            this.mountedNotches.delete(index);
        });

        for (let index = firstIndex; index <= lastIndex; index++) {
            const time = index * timeInterval;
            if (time >= duration || this.mountedNotches.has(index)) continue;

            const notch = notchEl.cloneNode() as HTMLElement;
            const isPrimary =
                Math.round(time * 100) % Math.round(primaryLabelInterval * 100) === 0 ||
                (primaryLabelSpacing && index % primaryLabelSpacing === 0);
            const isSecondary =
                Math.round(time * 100) % Math.round(secondaryLabelInterval * 100) === 0 ||
                (secondaryLabelSpacing && index % secondaryLabelSpacing === 0);

            if (isPrimary || isSecondary) {
                notch.style.height = '100%';
                notch.style.textIndent = '3px';
                notch.textContent = this.options.formatTimeCallback(time);
                if (isPrimary) {
                    notch.style.opacity = '1';
                }
            }

            let mode = 'tick';
            if (isPrimary) {
                mode = 'primary';
            } else if (isSecondary) {
                mode = 'secondary';
            }
            notch.setAttribute('part', `timeline-notch timeline-notch-${mode}`);

            // Keep the notch aligned after a redraw changes the waveform width without rebuilding it.
            const offset = ((time + this.options.timeOffset) / duration) * 100;
            notch.style.left = `${offset}%`;

            timeline.appendChild(notch);
            this.mountedNotches.set(index, notch);
        }
    }

    /**
     * Duplicates the portion of the TimelinePlugin that creates the timeline element
     * as it's not separable from the rendering all notches logic.
     */
    private getOrCreateTimeline(): HTMLElement {
        if (this.timeline) {
            return this.timeline;
        }

        const { timelineWrapper } = this.getTimelinePlugin();
        const isTop = this.options.insertPosition === 'beforebegin';
        const timeline = createElement('div', {
            style: {
                height: `${this.options.height}px`,
                overflow: 'hidden',
                fontSize: `${this.options.height / 2}px`,
                whiteSpace: 'nowrap',
                ...(isTop ? {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    zIndex: '2',
                } : {
                    position: 'relative',
                }),
            },
        });
        timeline.setAttribute('part', 'timeline');

        if (typeof this.options.style === 'string') {
            timeline.setAttribute('style', timeline.getAttribute('style') + this.options.style);
        } else if (typeof this.options.style === 'object') {
            Object.assign(timeline.style, this.options.style);
        }

        timelineWrapper.innerHTML = '';
        timelineWrapper.appendChild(timeline);
        this.timeline = timeline;
        return timeline;
    }
}
