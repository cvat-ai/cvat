// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Button from 'antd/lib/button';
import { MenuProps } from 'antd/lib/menu';
import Icon, {
    LinkOutlined, CopyOutlined, BlockOutlined, RetweetOutlined, DeleteOutlined, EditOutlined,
    FunctionOutlined,
} from '@ant-design/icons';

import {
    BackgroundIcon, ForegroundIcon, ResetPerspectiveIcon, ColorizeIcon, SliceIcon,
} from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ObjectType, ShapeType, ColorBy } from 'reducers';
import { DimensionType, Job } from 'cvat-core-wrapper';

interface Props {
    readonly: boolean;
    serverID: number | null;
    locked: boolean;
    shapeType: ShapeType;
    objectType: ObjectType;
    color: string;
    colorBy: ColorBy;
    colorPickerVisible: boolean;
    changeColorShortcut: string;
    copyShortcut: string;
    pasteShortcut: string;
    sliceShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    removeShortcut: string;
    runAnnotationsActionShortcut: string;
    changeColor(value: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    resetCuboidPerspective(): void;
    setColorPickerVisible(visible: boolean): void;
    edit(): void;
    slice(): void;
    runAnnotationAction(): void;
    jobInstance: Job;
}

interface ItemProps {
    toolProps: Props;
}

function CreateURLItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { serverID, createURL } = toolProps;
    return (
        <Button
            className='cvat-object-item-menu-create-url'
            disabled={!Number.isInteger(serverID)}
            type='link'
            icon={<LinkOutlined />}
            onClick={createURL}
        >
            Create object URL
        </Button>
    );
}

function MakeCopyItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { copyShortcut, pasteShortcut, copy } = toolProps;
    return (
        <CVATTooltip title={`${copyShortcut} and ${pasteShortcut}`}>
            <Button
                className='cvat-object-item-menu-make-copy'
                type='link'
                icon={<CopyOutlined />}
                onClick={copy}
            >
                Make a copy
            </Button>
        </CVATTooltip>
    );
}

function EditMaskItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { edit } = toolProps;
    return (
        <CVATTooltip title='Shift + Double click'>
            <Button
                type='link'
                icon={<EditOutlined />}
                onClick={edit}
                className='cvat-object-item-menu-edit-object'
            >
                Edit
            </Button>
        </CVATTooltip>
    );
}

function SliceItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { slice, sliceShortcut } = toolProps;
    return (
        <CVATTooltip title={`Cut the shape into two parts ${sliceShortcut}`}>
            <Button
                type='link'
                icon={<Icon component={SliceIcon} />}
                onClick={slice}
                className='cvat-object-item-menu-slice-object'
            >
                Slice
            </Button>
        </CVATTooltip>
    );
}

function PropagateItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { propagateShortcut, propagate } = toolProps;
    return (
        <CVATTooltip title={`${propagateShortcut}`}>
            <Button
                type='link'
                icon={<BlockOutlined />}
                onClick={propagate}
                className='cvat-object-item-menu-propagate-item'
            >
                Propagate
            </Button>
        </CVATTooltip>
    );
}

function SwitchOrientationItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { switchOrientation } = toolProps;
    return (
        <Button
            type='link'
            icon={<RetweetOutlined />}
            onClick={switchOrientation}
            className='cvat-object-item-menu-switch-orientation'
        >
            Switch orientation
        </Button>
    );
}

function ResetPerspectiveItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { resetCuboidPerspective } = toolProps;
    return (
        <Button
            type='link'
            onClick={resetCuboidPerspective}
            className='cvat-object-item-menu-reset-perspective'
        >
            <Icon component={ResetPerspectiveIcon} />
            Reset perspective
        </Button>
    );
}

function ToBackgroundItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { toBackgroundShortcut, toBackground } = toolProps;
    return (
        <CVATTooltip title={`${toBackgroundShortcut}`}>
            <Button
                type='link'
                onClick={toBackground}
                className='cvat-object-item-menu-to-background'
            >
                <Icon component={BackgroundIcon} />
                To background
            </Button>
        </CVATTooltip>
    );
}

function ToForegroundItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { toForegroundShortcut, toForeground } = toolProps;
    return (
        <CVATTooltip title={`${toForegroundShortcut}`}>
            <Button
                type='link'
                onClick={toForeground}
                className='cvat-object-item-menu-to-foreground'
            >
                <Icon component={ForegroundIcon} />
                To foreground
            </Button>
        </CVATTooltip>
    );
}

function SwitchColorItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { changeColorShortcut, colorBy, setColorPickerVisible } = toolProps;

    return (
        <CVATTooltip title={`${changeColorShortcut}`}>
            <Button onClick={() => setColorPickerVisible(true)} type='link' className='cvat-object-item-menu-change-color'>
                <Icon component={ColorizeIcon} />
                {`Change ${colorBy.toLowerCase()} color`}
            </Button>
        </CVATTooltip>
    );
}

function RemoveItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { removeShortcut, remove } = toolProps;
    return (
        <CVATTooltip title={`${removeShortcut}`}>
            <Button
                type='link'
                icon={<DeleteOutlined />}
                onClick={remove}
                className='cvat-object-item-menu-remove-object'
            >
                Remove
            </Button>
        </CVATTooltip>
    );
}

function RunAnnotationActionItem(props: ItemProps): JSX.Element {
    const { toolProps } = props;
    const { runAnnotationsActionShortcut, runAnnotationAction } = toolProps;
    return (
        <CVATTooltip title={`${runAnnotationsActionShortcut}`}>
            <Button
                type='link'
                icon={<FunctionOutlined />}
                onClick={runAnnotationAction}
                className='cvat-object-item-menu-remove-object'
            >
                Run annotation action
            </Button>
        </CVATTooltip>
    );
}

export default function ItemMenu(props: Props): MenuProps {
    const {
        readonly, shapeType, objectType, colorBy, jobInstance,
    } = props;

    enum MenuKeys {
        CREATE_URL = 'create_url',
        COPY = 'copy',
        PROPAGATE = 'propagate',
        SWITCH_ORIENTATION = 'switch_orientation',
        RESET_PERSPECIVE = 'reset_perspective',
        TO_BACKGROUND = 'to_background',
        TO_FOREGROUND = 'to_foreground',
        SWITCH_COLOR = 'switch_color',
        REMOVE_ITEM = 'remove_item',
        EDIT_MASK = 'edit_mask',
        SLICE_ITEM = 'slice_item',
        RUN_ANNOTATION_ACTION = 'run_annotation_action',
    }

    const is2D = jobInstance.dimension === DimensionType.DIMENSION_2D;

    const items = [{
        key: MenuKeys.CREATE_URL,
        label: <CreateURLItem toolProps={props} />,
    }];

    if (!readonly && objectType !== ObjectType.TAG) {
        items.push({
            key: MenuKeys.COPY,
            label: <MakeCopyItem toolProps={props} />,
        });
    }

    if (!readonly && shapeType === ShapeType.MASK) {
        items.push({
            key: MenuKeys.EDIT_MASK,
            label: <EditMaskItem toolProps={props} />,
        });
    }

    if (!readonly && objectType === ObjectType.SHAPE && [ShapeType.MASK, ShapeType.POLYGON].includes(shapeType)) {
        items.push({
            key: MenuKeys.SLICE_ITEM,
            label: <SliceItem key={MenuKeys.SLICE_ITEM} toolProps={props} />,
        });
    }

    if (!readonly) {
        items.push({
            key: MenuKeys.PROPAGATE,
            label: <PropagateItem toolProps={props} />,
        });
    }

    if (is2D && !readonly && [ShapeType.POLYGON, ShapeType.POLYLINE, ShapeType.CUBOID].includes(shapeType)) {
        items.push({
            key: MenuKeys.SWITCH_ORIENTATION,
            label: <SwitchOrientationItem toolProps={props} />,
        });
    }

    if (is2D && !readonly && shapeType === ShapeType.CUBOID) {
        items.push({
            key: MenuKeys.RESET_PERSPECIVE,
            label: <ResetPerspectiveItem toolProps={props} />,
        });
    }

    if (is2D && !readonly && objectType !== ObjectType.TAG) {
        items.push({
            key: MenuKeys.TO_BACKGROUND,
            label: <ToBackgroundItem toolProps={props} />,
        });

        items.push({
            key: MenuKeys.TO_FOREGROUND,
            label: <ToForegroundItem toolProps={props} />,
        });
    }

    if ([ColorBy.INSTANCE, ColorBy.GROUP].includes(colorBy)) {
        items.push({
            key: MenuKeys.SWITCH_COLOR,
            label: <SwitchColorItem toolProps={props} />,
        });
    }

    if (!readonly) {
        items.push({
            key: MenuKeys.REMOVE_ITEM,
            label: <RemoveItem toolProps={props} />,
        });
    }

    if (!readonly) {
        items.push({
            key: MenuKeys.RUN_ANNOTATION_ACTION,
            label: <RunAnnotationActionItem toolProps={props} />,
        });
    }

    return {
        items,
        selectable: false,
        className: 'cvat-object-item-menu',
    };
}
