// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import {
    ExportOutlined, LeftOutlined, NotificationOutlined, RightOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import { Announcement, announcementKey, contentURL } from './feed';

export default function AnnouncementCarousel({ items, newKeys }: {
    items: Announcement[];
    newKeys: Set<string>;
}): JSX.Element | null {
    const initialIndex = Math.max(0, items.findIndex((item) => newKeys.has(announcementKey(item))));
    const [index, setIndex] = useState(initialIndex);
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const [failedVideo, setFailedVideo] = useState<string | null>(null);
    useEffect(() => setIndex(initialIndex), [items, initialIndex]);
    if (!items.length) return null;

    const current = Math.min(index, items.length - 1);
    const item = items[current];
    const isNew = newKeys.has(announcementKey(item));
    const imageURL = contentURL(item.imageURL || '');
    const videoURL = contentURL(item.videoURL || '');
    const move = (step: number): void => setIndex((current + step + items.length) % items.length);
    const onNavigationKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (items.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
        }
    };
    const renderMedia = (): JSX.Element => {
        if (videoURL && failedVideo !== item.id) {
            return (
                <video
                    key={item.id}
                    controls
                    playsInline
                    muted
                    preload='none'
                    poster={imageURL}
                    aria-label={item.imageAlt || item.title}
                    onError={() => setFailedVideo(item.id)}
                >
                    <source src={videoURL} />
                </video>
            );
        }
        if (imageURL && failedImage !== item.id) {
            return (
                <img
                    src={imageURL}
                    alt={item.imageAlt || item.title}
                    onError={() => setFailedImage(item.id)}
                />
            );
        }
        return (
            <div className='cvat-updates-media-placeholder' aria-hidden='true'>
                <NotificationOutlined />
                <span>CVAT</span>
            </div>
        );
    };

    return (
        <section
            className='cvat-updates-announcements'
            aria-label='Latest announcements'
            aria-roledescription='carousel'
        >
            <article className='cvat-updates-announcement' key={announcementKey(item)}>
                <div className='cvat-updates-announcement-copy' aria-live='polite'>
                    <div className='cvat-updates-announcement-labels'>
                        <span className='cvat-updates-eyebrow'>{item.label || 'Announcement'}</span>
                        {isNew && <span className='cvat-updates-new-badge'>New</span>}
                    </div>
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <Button
                        className='cvat-updates-explore-button'
                        type='primary'
                        href={item.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label={`${item.cta || 'Read announcement'}: ${item.title}`}
                    >
                        {item.cta || 'Read announcement'} <ExportOutlined />
                    </Button>
                </div>
                <div className='cvat-updates-announcement-media'>
                    {renderMedia()}
                </div>
            </article>
            {items.length > 1 && (
                <div className='cvat-updates-carousel-navigation'>
                    <Button
                        type='text'
                        shape='circle'
                        size='small'
                        icon={<LeftOutlined />}
                        aria-label='Previous announcement'
                        onClick={() => move(-1)}
                        onKeyDown={onNavigationKeyDown}
                    />
                    <div className='cvat-updates-carousel-dots'>
                        {items.map((announcement, itemIndex) => (
                            <button
                                key={announcementKey(announcement)}
                                type='button'
                                className={[
                                    'cvat-updates-carousel-dot', itemIndex === current ? 'active' : '',
                                    newKeys.has(announcementKey(announcement)) ? 'new' : '',
                                ].filter(Boolean).join(' ')}
                                aria-label={`Show announcement ${itemIndex + 1}${newKeys.has(announcementKey(announcement)) ? ' — new' : ''}: ${announcement.title}`}
                                title={`${announcement.title}${newKeys.has(announcementKey(announcement)) ? ' — new' : ''}`}
                                aria-current={itemIndex === current ? 'true' : undefined}
                                onClick={() => setIndex(itemIndex)}
                                onKeyDown={onNavigationKeyDown}
                            />
                        ))}
                    </div>
                    <Button
                        type='text'
                        shape='circle'
                        size='small'
                        icon={<RightOutlined />}
                        aria-label='Next announcement'
                        onClick={() => move(1)}
                        onKeyDown={onNavigationKeyDown}
                    />
                </div>
            )}
        </section>
    );
}
