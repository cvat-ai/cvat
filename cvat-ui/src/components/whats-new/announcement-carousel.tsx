// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpOutlined, NotificationOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Carousel, { CarouselRef } from 'antd/lib/carousel';
import Typography from 'antd/lib/typography';
import { Announcement, announcementKey } from './feed';

function CarouselArrow({
    label, className, style, onClick,
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
}): JSX.Element {
    return <button type='button' aria-label={label} className={className} style={style} onClick={onClick} />;
}

export default function AnnouncementCarousel({ items, newKeys }: {
    items: Announcement[];
    newKeys: Set<string>;
}): JSX.Element | null {
    const initialIndex = Math.max(0, items.findIndex((item) => newKeys.has(announcementKey(item))));
    const carousel = useRef<CarouselRef | null>(null);
    const container = useRef<HTMLElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const [failedImages, setFailedImages] = useState(new Set<string>());
    const [failedVideos, setFailedVideos] = useState(new Set<string>());

    useEffect(() => {
        carousel.current?.goTo(initialIndex, true);
        setActiveIndex(initialIndex);
    }, [items, initialIndex]);

    if (!items.length) return null;

    const renderMedia = (item: Announcement, active: boolean): JSX.Element => {
        const { imageURL, videoURL } = item;
        if (active && videoURL && !failedVideos.has(videoURL)) {
            return (
                <video
                    controls
                    playsInline
                    muted
                    preload='none'
                    poster={imageURL}
                    aria-label={item.imageAlt || item.title}
                    onKeyDown={(event) => event.stopPropagation()}
                    onError={() => setFailedVideos((previous) => new Set(previous).add(videoURL))}
                >
                    <source src={videoURL} />
                </video>
            );
        }
        if (imageURL && !failedImages.has(imageURL)) {
            return (
                <img
                    src={imageURL}
                    alt={item.imageAlt || item.title}
                    loading='lazy'
                    onError={() => setFailedImages((previous) => new Set(previous).add(imageURL))}
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
            ref={container}
        >
            <Carousel
                ref={carousel}
                rootClassName='cvat-updates-carousel'
                initialSlide={initialIndex}
                autoplay={false}
                accessibility
                infinite={items.length > 1}
                arrows={items.length > 1}
                prevArrow={<CarouselArrow label='Previous announcement' />}
                nextArrow={<CarouselArrow label='Next announcement' />}
                dots={items.length > 1 ? { className: 'cvat-updates-carousel-dots' } : false}
                beforeChange={() => container.current?.querySelectorAll('video').forEach((video) => video.pause())}
                afterChange={setActiveIndex}
                customPaging={(index) => {
                    const item = items[index];
                    const isNew = !!item && newKeys.has(announcementKey(item));
                    const label = `Show announcement ${index + 1}${isNew ? ' — new' : ''}: ${item?.title || ''}`;
                    return (
                        <button
                            type='button'
                            className={isNew ? 'cvat-updates-carousel-dot new' : 'cvat-updates-carousel-dot'}
                            aria-label={label}
                            title={label}
                            aria-current={index === activeIndex ? 'true' : undefined}
                        />
                    );
                }}
            >
                {items.map((item, index) => (
                    <div key={announcementKey(item)}>
                        <article className='cvat-updates-announcement'>
                            <div
                                className='cvat-updates-announcement-copy'
                                role='region'
                                aria-label={`Announcement preview: ${item.title}`}
                                aria-live={index === activeIndex ? 'polite' : undefined}
                                tabIndex={index === activeIndex ? 0 : -1}
                            >
                                <div className='cvat-updates-labels'>
                                    <Typography.Text className='cvat-updates-eyebrow'>
                                        {item.label || 'Announcement'}
                                    </Typography.Text>
                                    {newKeys.has(announcementKey(item)) && (
                                        <Typography.Text className='cvat-updates-new-badge'>New</Typography.Text>
                                    )}
                                </div>
                                <Typography.Title level={2}>{item.title}</Typography.Title>
                                <Typography.Paragraph className='cvat-updates-announcement-description'>
                                    {item.description}
                                </Typography.Paragraph>
                                <Button
                                    className='cvat-updates-action cvat-updates-explore-button'
                                    type='primary'
                                    href={item.url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    tabIndex={index === activeIndex ? 0 : -1}
                                    aria-label={`${item.cta || 'Read announcement'}: ${item.title}`}
                                >
                                    {item.cta || 'Read announcement'} <ArrowUpOutlined rotate={45} />
                                </Button>
                            </div>
                            <div className='cvat-updates-announcement-media'>
                                {renderMedia(item, index === activeIndex)}
                            </div>
                        </article>
                    </div>
                ))}
            </Carousel>
        </section>
    );
}
