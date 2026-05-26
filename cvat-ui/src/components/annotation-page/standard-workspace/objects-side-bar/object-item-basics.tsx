// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef, useState } from 'react';
import { Row, Col } from 'antd/lib/grid';
import { CloseOutlined, MoreOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Dropdown from 'antd/lib/dropdown';
import InputNumber from 'antd/lib/input-number';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';

import { ColorBy } from 'reducers';
import CVATTooltip from 'components/common/cvat-tooltip';
import LabelSelector from 'components/label-selector/label-selector';
import { ObjectType, ShapeType } from 'cvat-core-wrapper';
import ItemMenu from './object-item-menu';
import ColorPicker from './color-picker';

interface LayerPickerProps {
    children: React.ReactNode;
    value: number;
    visible: boolean;
    onChange(value: number): void;
    onVisibleChange(visible: boolean): void;
}

function LayerPicker(props: LayerPickerProps): JSX.Element {
    const {
        children, value, visible, onChange, onVisibleChange,
    } = props;
    const inputRef = useRef<HTMLInputElement>(null);

    const submitLayer = useCallback((): void => {
        // Read the uncontrolled input only on submit so typing does not move the object.
        const nextLayer = Number(inputRef.current?.value);

        if (Number.isInteger(nextLayer)) {
            onChange(nextLayer);
            onVisibleChange(false);
        } else if (inputRef.current) {
            inputRef.current.value = value.toString();
        }
    }, [onChange, onVisibleChange, value]);

    return (
        <Popover
            destroyTooltipOnHide
            content={(
                <div
                    className='cvat-object-item-menu-to-layer-popover'
                    // The object item uses double-click to focus the object on canvas.
                    // Keep text selection/editing inside this popover from triggering that parent action.
                    onDoubleClick={(event: React.MouseEvent): void => event.stopPropagation()}
                >
                    <InputNumber
                        ref={inputRef}
                        autoFocus
                        defaultValue={value}
                        precision={0}
                        onPressEnter={submitLayer}
                    />
                    <Button
                        type='primary'
                        onClick={submitLayer}
                    >
                        OK
                    </Button>
                </div>
            )}
            title={(
                <Row justify='space-between' align='middle'>
                    <Col span={14}>
                        <Text strong>Move to layer</Text>
                    </Col>
                    <Col span={4}>
                        <CVATTooltip title='Close'>
                            <Button
                                className='cvat-object-item-menu-to-layer-close-button'
                                type='link'
                                onClick={(): void => onVisibleChange(false)}
                            >
                                <CloseOutlined />
                            </Button>
                        </CVATTooltip>
                    </Col>
                </Row>
            )}
            autoAdjustOverflow
            trigger='click'
            open={visible}
            onOpenChange={onVisibleChange}
        >
            {children}
        </Popover>
    );
}

interface Props {
    jobInstance: any;
    clientID: number;
    serverID: number | null;
    labelID: number;
    labels: any[];
    shapeType: ShapeType;
    objectType: ObjectType;
    isGroundTruth: boolean;
    color: string;
    colorBy: ColorBy;
    type: string;
    locked: boolean;
    changeColorShortcut: string;
    copyShortcut: string;
    pasteShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    toOneLayerBackwardShortcut: string;
    toOneLayerForwardShortcut: string;
    zOrder: number;
    removeShortcut: string;
    sliceShortcut: string;
    runAnnotationsActionShortcut: string;
    changeColor(color: string): void;
    changeLabel(label: any): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toOneLayerBackward(): void;
    toForeground(): void;
    toOneLayerForward(): void;
    toSpecificLayer(zOrder: number): void;
    resetCuboidPerspective(): void;
    runAnnotationAction(): void;
    edit(): void;
    slice(): void;
    simplify(): void;
}

function ItemTopComponent(props: Props): JSX.Element {
    const {
        clientID,
        serverID,
        labelID,
        labels,
        shapeType,
        objectType,
        color,
        colorBy,
        type,
        locked,
        changeColorShortcut,
        copyShortcut,
        pasteShortcut,
        propagateShortcut,
        toBackgroundShortcut,
        toForegroundShortcut,
        toOneLayerBackwardShortcut,
        toOneLayerForwardShortcut,
        zOrder,
        removeShortcut,
        sliceShortcut,
        runAnnotationsActionShortcut,
        isGroundTruth,
        changeColor,
        changeLabel,
        copy,
        remove,
        propagate,
        createURL,
        switchOrientation,
        toBackground,
        toForeground,
        toOneLayerBackward,
        toOneLayerForward,
        toSpecificLayer,
        resetCuboidPerspective,
        runAnnotationAction,
        edit,
        slice,
        simplify,
        jobInstance,
    } = props;

    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [layerPopoverVisible, setLayerPopoverVisible] = useState(false);
    const [objectMenuVisible, setObjectMenuVisible] = useState(false);

    let objectActions: JSX.Element | null = null;

    if (!isGroundTruth) {
        // The same trigger hosts mutually exclusive overlays, matching the color picker flow.
        const menuTrigger = (
            <Col span={2}>
                <MoreOutlined />
            </Col>
        );

        if (colorPickerVisible) {
            objectActions = (
                <ColorPicker
                    visible
                    value={color}
                    onVisibleChange={setColorPickerVisible}
                    onChange={(_color: string) => {
                        changeColor(_color);
                    }}
                >
                    {menuTrigger}
                </ColorPicker>
            );
        } else if (layerPopoverVisible) {
            objectActions = (
                <LayerPicker
                    visible
                    value={zOrder}
                    onVisibleChange={setLayerPopoverVisible}
                    onChange={toSpecificLayer}
                >
                    {menuTrigger}
                </LayerPicker>
            );
        } else {
            objectActions = (
                <Dropdown
                    destroyPopupOnHide
                    open={objectMenuVisible}
                    onOpenChange={setObjectMenuVisible}
                    placement='bottomLeft'
                    trigger={['click']}
                    className='cvat-object-item-menu-button'
                    menu={ItemMenu({
                        jobInstance,
                        locked,
                        serverID,
                        shapeType,
                        objectType,
                        color,
                        colorBy,
                        colorPickerVisible,
                        changeColorShortcut,
                        copyShortcut,
                        pasteShortcut,
                        propagateShortcut,
                        toBackgroundShortcut,
                        toForegroundShortcut,
                        toOneLayerBackwardShortcut,
                        toOneLayerForwardShortcut,
                        removeShortcut,
                        sliceShortcut,
                        runAnnotationsActionShortcut,
                        closeMenu: (): void => setObjectMenuVisible(false),
                        changeColor,
                        setLayerPopoverVisible,
                        copy,
                        remove,
                        propagate,
                        createURL,
                        switchOrientation,
                        toBackground,
                        toForeground,
                        toOneLayerBackward,
                        toOneLayerForward,
                        resetCuboidPerspective,
                        setColorPickerVisible,
                        edit,
                        slice,
                        simplify,
                        runAnnotationAction,
                    })}
                >
                    {menuTrigger}
                </Dropdown>
            );
        }
    }

    return (
        <Row align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 12 }}>{clientID}</Text>
                {isGroundTruth ? <Text style={{ fontSize: 12 }}>&nbsp;GT</Text> : null}
                <br />
                <Text
                    type='secondary'
                    style={{ fontSize: 10 }}
                    className='cvat-objects-sidebar-state-item-object-type-text'
                >
                    {type}
                </Text>
            </Col>
            <Col span={12}>
                <CVATTooltip title='Change current label'>
                    <LabelSelector
                        disabled={locked || shapeType === ShapeType.SKELETON}
                        size='small'
                        labels={labels}
                        value={labelID}
                        onChange={changeLabel}
                        className='cvat-objects-sidebar-state-item-label-selector'
                    />
                </CVATTooltip>
            </Col>
            {objectActions}
        </Row>
    );
}

export default React.memo(ItemTopComponent);
