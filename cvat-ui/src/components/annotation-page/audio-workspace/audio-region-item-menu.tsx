import React, { useState } from 'react';
import Button from 'antd/lib/button';
import { MenuProps } from 'antd/lib/menu';
import Icon, {
    LinkOutlined, CopyOutlined, DeleteOutlined,
} from '@ant-design/icons';

import {
    BackgroundIcon, ForegroundIcon,
    OneLayerBackwardIcon, OneLayerForwardIcon,
    ColorizeIcon,
} from 'icons';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import { ColorBy } from 'reducers';

interface Props {
    serverID: number | undefined;
    locked: boolean;
    colorBy: ColorBy;
    currentColor: string;
    onCreateURL(): void;
    onCopy(): void;
    onToBackground(): void;
    onToForeground(): void;
    onToOneLayerBackward(): void;
    onToOneLayerForward(): void;
    onRemove(): void;
    onChangeColor(color: string): void;
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
            Create object URL
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
            Make a copy
        </Button>
    );
}

function ToBackgroundItem({ onToBackground }: Pick<Props, 'onToBackground'>): JSX.Element {
    return (
        <Button
            type='link'
            onClick={onToBackground}
            className='cvat-audio-region-menu-to-background'
        >
            <Icon component={BackgroundIcon} />
            To background
        </Button>
    );
}

function ToForegroundItem({ onToForeground }: Pick<Props, 'onToForeground'>): JSX.Element {
    return (
        <Button
            type='link'
            onClick={onToForeground}
            className='cvat-audio-region-menu-to-foreground'
        >
            <Icon component={ForegroundIcon} />
            To foreground
        </Button>
    );
}

function ToOneLayerBackwardItem({ onToOneLayerBackward }: Pick<Props, 'onToOneLayerBackward'>): JSX.Element {
    return (
        <Button
            type='link'
            onClick={onToOneLayerBackward}
            className='cvat-audio-region-menu-to-one-layer-backward'
        >
            <Icon component={OneLayerBackwardIcon} />
            To one layer backward
        </Button>
    );
}

function ToOneLayerForwardItem({ onToOneLayerForward }: Pick<Props, 'onToOneLayerForward'>): JSX.Element {
    return (
        <Button
            type='link'
            onClick={onToOneLayerForward}
            className='cvat-audio-region-menu-to-one-layer-forward'
        >
            <Icon component={OneLayerForwardIcon} />
            To one layer forward
        </Button>
    );
}

function RemoveItem({ onRemove }: Pick<Props, 'onRemove'>): JSX.Element {
    return (
        <Button
            type='link'
            icon={<DeleteOutlined />}
            onClick={onRemove}
            className='cvat-audio-region-menu-remove'
        >
            Remove
        </Button>
    );
}

function ChangeColorItem({
    colorBy, currentColor, onChangeColor,
}: Pick<Props, 'colorBy' | 'currentColor' | 'onChangeColor'>): JSX.Element {
    const [visible, setVisible] = useState(false);
    return (
        <ColorPicker
            value={currentColor}
            visible={visible}
            onVisibleChange={setVisible}
            onChange={(color) => onChangeColor(color)}
            placement='left'
        >
            <Button
                type='link'
                onClick={() => setVisible(true)}
                className='cvat-audio-region-menu-change-color'
            >
                <Icon component={ColorizeIcon} />
                {`Change ${colorBy.toLowerCase()} color`}
            </Button>
        </ColorPicker>
    );
}

enum MenuKeys {
    CREATE_URL = 'create_url',
    COPY = 'copy',
    TO_BACKGROUND = 'to_background',
    TO_FOREGROUND = 'to_foreground',
    TO_ONE_LAYER_BACKWARD = 'to_one_layer_backward',
    TO_ONE_LAYER_FORWARD = 'to_one_layer_forward',
    CHANGE_COLOR = 'change_color',
    REMOVE = 'remove',
}

export default function AudioRegionItemMenu(props: Props): MenuProps {
    const { locked, colorBy } = props;

    const items = [
        {
            key: MenuKeys.CREATE_URL,
            label: <CreateURLItem serverID={props.serverID} onCreateURL={props.onCreateURL} />,
        },
        {
            key: MenuKeys.COPY,
            label: <MakeCopyItem onCopy={props.onCopy} />,
        },
    ];

    if (!locked) {
        items.push(
            {
                key: MenuKeys.TO_BACKGROUND,
                label: <ToBackgroundItem onToBackground={props.onToBackground} />,
            },
            {
                key: MenuKeys.TO_FOREGROUND,
                label: <ToForegroundItem onToForeground={props.onToForeground} />,
            },
            {
                key: MenuKeys.TO_ONE_LAYER_BACKWARD,
                label: <ToOneLayerBackwardItem onToOneLayerBackward={props.onToOneLayerBackward} />,
            },
            {
                key: MenuKeys.TO_ONE_LAYER_FORWARD,
                label: <ToOneLayerForwardItem onToOneLayerForward={props.onToOneLayerForward} />,
            },
        );

        if (colorBy === ColorBy.INSTANCE) {
            items.push({
                key: MenuKeys.CHANGE_COLOR,
                label: (
                    <ChangeColorItem
                        colorBy={colorBy}
                        currentColor={props.currentColor}
                        onChangeColor={props.onChangeColor}
                    />
                ),
            });
        }
    }

    items.push({
        key: MenuKeys.REMOVE,
        label: <RemoveItem onRemove={props.onRemove} />,
    });

    return {
        items,
        selectable: false,
        className: 'cvat-audio-region-item-menu',
    };
}
