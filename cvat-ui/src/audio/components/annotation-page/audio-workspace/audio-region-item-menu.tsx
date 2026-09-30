// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import { MenuProps } from 'antd/lib/menu';
import Icon, {
    LinkOutlined, CopyOutlined, DeleteOutlined, ArrowsAltOutlined,
} from '@ant-design/icons';

import { ColorizeIcon } from 'icons';
import { ColorBy } from 'reducers';

interface Props {
    serverID: number | undefined;
    locked: boolean;
    colorBy: ColorBy;
    onCreateURL(): void;
    onCopy(): void;
    onRemove(): void;
    onChangeColorClick(): void;
    onFitInterval(): void;
}

function CreateURLItem({ onCreateURL, serverID }: Pick<Props, 'onCreateURL' | 'serverID'>): JSX.Element {
    return (
        <Button
            className='cvat-audio-region-menu-create-url'
            disabled={!Number.isInteger(serverID)}
            type='link'
            icon={<LinkOutlined />}
            onClick={onCreateURL}
        >
            Copy interval URL
        </Button>
    );
}

function MakeCopyItem({ onCopy }: Pick<Props, 'onCopy'>): JSX.Element {
    return (
        <Button
            className='cvat-audio-region-menu-make-copy'
            type='link'
            icon={<CopyOutlined />}
            onClick={onCopy}
        >
            Duplicate interval
        </Button>
    );
}

function RemoveItem({ onRemove, locked }: Pick<Props, 'onRemove' | 'locked'>): JSX.Element {
    return (
        <Button
            type='link'
            icon={<DeleteOutlined />}
            disabled={locked}
            onClick={onRemove}
            className='cvat-audio-region-menu-remove'
        >
            Delete interval
        </Button>
    );
}

function ChangeColorItem({
    colorBy, onChangeColorClick,
}: Pick<Props, 'colorBy' | 'onChangeColorClick'>): JSX.Element {
    return (
        <Button
            type='link'
            icon={<Icon component={ColorizeIcon} />}
            onClick={onChangeColorClick}
            className='cvat-audio-region-menu-change-color'
        >
            {`Change ${colorBy.toLowerCase()} color`}
        </Button>
    );
}

enum MenuKeys {
    FIT_INTERVAL = 'fit_interval',
    CREATE_URL = 'create_url',
    COPY = 'copy',
    CHANGE_COLOR = 'change_color',
    REMOVE = 'remove',
}

export default function AudioRegionItemMenu(props: Props): MenuProps {
    const { locked, colorBy } = props;

    const items: NonNullable<MenuProps['items']> = [];

    items.push(
        {
            key: MenuKeys.FIT_INTERVAL,
            label: <Button type='link' icon={<ArrowsAltOutlined />} onClick={props.onFitInterval}>Fit interval</Button>,
        },
        { type: 'divider' },
        {
            key: MenuKeys.CREATE_URL,
            label: <CreateURLItem serverID={props.serverID} onCreateURL={props.onCreateURL} />,
        },
        {
            key: MenuKeys.COPY,
            label: <MakeCopyItem onCopy={props.onCopy} />,
        },
    );

    if (!locked && colorBy === ColorBy.INSTANCE) {
        items.push({
            key: MenuKeys.CHANGE_COLOR,
            label: (
                <ChangeColorItem
                    colorBy={colorBy}
                    onChangeColorClick={props.onChangeColorClick}
                />
            ),
        });
    }

    items.push({ type: 'divider' });
    items.push({
        key: MenuKeys.REMOVE,
        label: <RemoveItem onRemove={props.onRemove} locked={locked} />,
    });

    return {
        items,
        selectable: false,
        className: 'cvat-audio-region-item-menu',
    };
}
