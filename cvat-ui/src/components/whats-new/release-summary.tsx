// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ArrowUpOutlined } from '@ant-design/icons';
import Typography from 'antd/lib/typography';
import { ReleaseNote } from './feed';

export default function ReleaseSummary({ release, isNew = false }: {
    release: ReleaseNote;
    isNew?: boolean;
}): JSX.Element {
    const highlights = release.highlights?.length ? release.highlights : [release.description];

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
            >
                <div className='cvat-updates-release-meta'>
                    <div className='cvat-updates-labels'>
                        <Typography.Text className='cvat-updates-eyebrow'>Release notes</Typography.Text>
                        {isNew && <Typography.Text className='cvat-updates-new-badge'>New release</Typography.Text>}
                    </div>
                    <Typography.Title level={2}>CVAT v.{release.version}</Typography.Title>
                    <Typography.Text>
                        <time dateTime={release.publishedAt}>
                            {new Date(release.publishedAt).toLocaleDateString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
                            })}
                        </time>
                    </Typography.Text>
                </div>
                <div
                    className='cvat-updates-release-highlights'
                    role='region'
                    aria-label='Release highlights'
                >
                    <ul>
                        {highlights.slice(0, 5).map((highlight, index) => (
                            <li key={`${index}:${highlight}`}><Typography.Text>{highlight}</Typography.Text></li>
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
