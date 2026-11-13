// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './resource-card.scss';
import React from 'react';
import Card from 'antd/lib/card';
import Tag, { TagProps } from 'antd/lib/tag';

export interface ResourceCardTag {
    key: React.Key;
    content: React.ReactNode;
    color?: TagProps['color'];
    className?: string;
}

interface ResourceCardDescription {
    label: string;
    value?: React.ReactNode;
}

interface Props {
    cardRef?: React.Ref<HTMLDivElement>;
    id?: string | number;
    idClassName?: string;
    preview: React.ReactNode;
    tags?: ResourceCardTag[];
    title?: React.ReactNode;
    descriptions?: ResourceCardDescription[];
    contentClassName?: string;
    menu?: React.ReactNode;
    mediaOverlay?: React.ReactNode;
    selected?: boolean;
    isDisabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onOpenInNewTab?: () => void;
    onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
    onContextMenuCapture?: React.MouseEventHandler<HTMLDivElement>;
}

function ResourceCard(props: Readonly<Props>): JSX.Element {
    const {
        cardRef,
        id,
        idClassName = '',
        preview,
        tags = [],
        title,
        descriptions = [],
        contentClassName = '',
        menu,
        mediaOverlay,
        selected = false,
        isDisabled = false,
        className = '',
        style,
        onClick,
        onOpenInNewTab,
        onContextMenu,
        onContextMenuCapture,
    } = props;

    const classes = [
        'cvat-resource-card',
        style?.height ? 'cvat-resource-card-fixed-height' : '',
        selected ? 'cvat-item-selected' : '',
        isDisabled ? 'cvat-resource-card-disabled' : '',
        className,
    ].filter(Boolean).join(' ');

    const cardStyle: React.CSSProperties = isDisabled ? {
        ...style,
        pointerEvents: 'none',
        opacity: 0.5,
    } : style || {};

    const hasSelectedText = (event: React.MouseEvent<HTMLDivElement>): boolean => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return false;
        }

        const { currentTarget } = event;
        return [selection.anchorNode, selection.focusNode].some((node) => node && currentTarget.contains(node));
    };

    return (
        <Card
            ref={cardRef}
            cover={(
                <div className='cvat-resource-card-media'>
                    <div className='cvat-resource-card-preview'>{preview}</div>
                    {typeof id !== 'undefined' && (
                        <div
                            className={`cvat-resource-card-id ${idClassName}`.trim()}
                            title={`ID: ${id}`}
                        >
                            {`ID: ${id}`}
                        </div>
                    )}
                    {!!tags.length && (
                        <div className='cvat-resource-card-tags'>
                            {tags.map((tag) => (
                                <Tag key={tag.key} color={tag.color} className={tag.className}>{tag.content}</Tag>
                            ))}
                        </div>
                    )}
                    {mediaOverlay && <div className='cvat-resource-card-media-overlay'>{mediaOverlay}</div>}
                </div>
            )}
            size='small'
            style={cardStyle}
            className={classes}
            hoverable
            aria-disabled={isDisabled}
            onClick={isDisabled ? undefined : (event) => {
                const target = event.target as Element;
                if (!target.closest('.cvat-resource-card-menu') && !hasSelectedText(event)) {
                    onClick?.(event);
                }
            }}
            onMouseDown={isDisabled ? undefined : (event) => {
                if (event.button === 1 && onOpenInNewTab) {
                    event.preventDefault();
                }
            }}
            onAuxClick={isDisabled ? undefined : (event) => {
                const target = event.target as Element;
                if (event.button === 1 && !target.closest('.cvat-resource-card-menu')) {
                    onOpenInNewTab?.();
                }
            }}
            onContextMenu={isDisabled ? undefined : onContextMenu}
            onContextMenuCapture={isDisabled ? undefined : onContextMenuCapture}
        >
            {(title || descriptions.length || menu) && (
                <div className={`cvat-resource-card-content ${contentClassName}`.trim()}>
                    {title && <div className='cvat-resource-card-title'>{title}</div>}
                    {menu && <div className='cvat-resource-card-menu'>{menu}</div>}
                    {!!descriptions.length && (
                        <div className={`cvat-resource-card-descriptions${title ? ' cvat-resource-card-descriptions-spaced' : ''}`}>
                            {descriptions.map(({ label, value }) => (
                                <div className='cvat-resource-card-description' key={label}>
                                    <span className='cvat-resource-card-description-label'>{`${label}:`}</span>
                                    <span className='cvat-resource-card-description-value'>{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default React.memo(ResourceCard);
