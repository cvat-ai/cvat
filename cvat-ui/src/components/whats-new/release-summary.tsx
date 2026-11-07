// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { ExportOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import { ReleaseNote } from './feed';

export default function ReleaseSummary({ release, isNew = false }: {
    release: ReleaseNote;
    isNew?: boolean;
}): JSX.Element {
    const highlights = release.highlights?.length ? release.highlights : [release.description];

    return (
        <section className='cvat-updates-release-panel' aria-label={`Release notes for CVAT ${release.version}`}>
            <div className='cvat-updates-release'>
                <div className='cvat-updates-release-icon' aria-hidden='true'><UnorderedListOutlined /></div>
                <div className='cvat-updates-release-meta'>
                    <span className='cvat-updates-release-label'>Release notes</span>
                    {isNew && <span className='cvat-updates-new-badge'>New release</span>}
                    <h2>v{release.version}</h2>
                    <time dateTime={release.publishedAt}>
                        {new Date(release.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
                        })}
                    </time>
                </div>
                <ul className='cvat-updates-release-highlights'>
                    {highlights.slice(0, 3).map((highlight, index) => (
                        <li key={`${index}:${highlight}`}>{highlight}</li>
                    ))}
                </ul>
                <Button
                    type='text'
                    shape='circle'
                    className='cvat-updates-release-link'
                    icon={<ExportOutlined />}
                    href={release.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`Read full release notes for CVAT ${release.version}`}
                    title='Read full release notes'
                />
            </div>
        </section>
    );
}
