// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef } from 'react';
import { ArrowUpOutlined } from '@ant-design/icons';
import { ReleaseNote } from './feed';

export default function ReleaseSummary({ release, isNew = false }: {
    release: ReleaseNote;
    isNew?: boolean;
}): JSX.Element {
    const highlights = release.highlights?.length ? release.highlights : [release.description];
    const highlightsRegion = useRef<HTMLDivElement>(null);

    return (
        <section className='cvat-updates-release-panel' aria-label={`Release notes for CVAT ${release.version}`}>
            <a
                className='cvat-updates-release'
                href={release.url}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`Read full release notes for CVAT ${release.version}`}
                draggable={false}
                onClick={(event) => {
                    const selection = window.getSelection();
                    if (event.detail > 0 && selection && !selection.isCollapsed &&
                        selection.containsNode(event.currentTarget, true)) {
                        event.preventDefault();
                    }
                }}
                onKeyDown={(event) => {
                    const region = highlightsRegion.current;
                    if (!region || region.scrollHeight <= region.clientHeight ||
                        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                    const offsets: Record<string, number> = {
                        ArrowDown: 40,
                        ArrowUp: -40,
                        PageDown: region.clientHeight,
                        PageUp: -region.clientHeight,
                        Home: -region.scrollHeight,
                        End: region.scrollHeight,
                    };
                    const offset = offsets[event.key];
                    if (offset !== undefined) {
                        event.preventDefault();
                        region.scrollBy({ top: offset });
                    }
                }}
            >
                <div className='cvat-updates-release-meta'>
                    <div className='cvat-updates-labels'>
                        <span className='cvat-updates-eyebrow'>Release notes</span>
                        {isNew && <span className='cvat-updates-new-badge'>New release</span>}
                    </div>
                    <h2>CVAT v.{release.version}</h2>
                    <time dateTime={release.publishedAt}>
                        {new Date(release.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
                        })}
                    </time>
                </div>
                <div
                    ref={highlightsRegion}
                    className='cvat-updates-release-highlights'
                    role='region'
                    aria-label='Release highlights'
                >
                    <ul>
                        {highlights.slice(0, 5).map((highlight, index) => (
                            <li key={`${index}:${highlight}`}>{highlight}</li>
                        ))}
                    </ul>
                </div>
                <span className='cvat-updates-release-link' aria-hidden='true'>
                    <ArrowUpOutlined rotate={45} />
                </span>
            </a>
        </section>
    );
}
