// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select, { OptionProps } from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Collapse from 'antd/lib/collapse';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';

import ColorChanger from 'components/annotation-page/standard-workspace/objects-side-bar/color-changer';
import consts from 'consts';
import {
    ObjectOutsideIcon,
    FirstIcon,
    LastIcon,
    PreviousIcon,
    NextIcon,
    BackgroundIcon,
    ForegroundIcon,
    ResetPerspectiveIcon,
} from 'icons';
import { ObjectType, ShapeType } from 'reducers/interfaces';
import { clamp } from 'utils/math';


function ItemMenu(
    serverID: number | undefined,
    locked: boolean,
    objectType: ObjectType,
    shapeType: ShapeType,
    copyShortcut: string,
    pasteShortcut: string,
    propagateShortcut: string,
    toBackgroundShortcut: string,
    toForegroundShortcut: string,
    removeShortcut: string,
    copy: (() => void),
    remove: (() => void),
    propagate: (() => void),
    createURL: (() => void),
    toBackground: (() => void),
    toForeground: (() => void),
    switchCuboidOrientation: (() => void),
    resetCuboidPerspective: (() => void),
): JSX.Element {
    return (
        <Menu className='cvat-object-item-menu'>
            <Menu.Item>
                <Button disabled={serverID === undefined} type='link' icon='link' onClick={createURL}>
                    Create object URL
                </Button>
            </Menu.Item>
            <Menu.Item>
                <Tooltip title={`${copyShortcut} and ${pasteShortcut}`}>
                    <Button type='link' icon='copy' onClick={copy}>
                        Make a copy
                    </Button>
                </Tooltip>
            </Menu.Item>
            <Menu.Item>
                <Tooltip title={`${propagateShortcut}`}>
                    <Button type='link' icon='block' onClick={propagate}>
                        Propagate
                    </Button>
                </Tooltip>
            </Menu.Item>
            {shapeType === ShapeType.CUBOID && (
                <Menu.Item>
                    <Button type='link' icon='retweet' onClick={switchCuboidOrientation}>
                        Switch orientation
                    </Button>
                </Menu.Item>
            )}
            {shapeType === ShapeType.CUBOID && (
                <Menu.Item>
                    <Button type='link' onClick={resetCuboidPerspective}>
                        <Icon component={ResetPerspectiveIcon} />
                        Reset perspective
                    </Button>
                </Menu.Item>
            )}
            {objectType !== ObjectType.TAG && (
                <Menu.Item>
                    <Tooltip title={`${toBackgroundShortcut}`}>
                        <Button type='link' onClick={toBackground}>
                            <Icon component={BackgroundIcon} />
                            To background
                        </Button>
                    </Tooltip>
                </Menu.Item>
            )}
            {objectType !== ObjectType.TAG && (
                <Menu.Item>
                    <Tooltip title={`${toForegroundShortcut}`}>
                        <Button type='link' onClick={toForeground}>
                            <Icon component={ForegroundIcon} />
                            To foreground
                        </Button>
                    </Tooltip>
                </Menu.Item>
            )}
            <Menu.Item>
                <Tooltip title={`${removeShortcut}`}>
                    <Button
                        type='link'
                        icon='delete'
                        onClick={(): void => {
                            if (locked) {
                                Modal.confirm({
                                    title: 'Object is locked',
                                    content: 'Are you sure you want to remove it?',
                                    onOk() {
                                        remove();
                                    },
                                });
                            } else {
                                remove();
                            }
                        }}
                    >
                        Remove
                    </Button>
                </Tooltip>
            </Menu.Item>
        </Menu>
    );
}

interface ItemTopComponentProps {
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    labels: any[];
    objectType: ObjectType;
    shapeType: ShapeType;
    type: string;
    locked: boolean;
    copyShortcut: string;
    pasteShortcut: string;
    propagateShortcut: string;
    toBackgroundShortcut: string;
    toForegroundShortcut: string;
    removeShortcut: string;
    changeLabel(labelID: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
    switchCuboidOrientation(): void;
    resetCuboidPerspective(): void;
}

function ItemTopComponent(props: ItemTopComponentProps): JSX.Element {
    const {
        clientID,
        serverID,
        labelID,
        labels,
        objectType,
        shapeType,
        type,
        locked,
        copyShortcut,
        pasteShortcut,
        propagateShortcut,
        toBackgroundShortcut,
        toForegroundShortcut,
        removeShortcut,
        changeLabel,
        copy,
        remove,
        propagate,
        createURL,
        toBackground,
        toForeground,
        switchCuboidOrientation,
        resetCuboidPerspective,
    } = props;

    return (
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 12 }}>{clientID}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: 10 }}>{type}</Text>
            </Col>
            <Col span={12}>
                <Tooltip title='Change current label'>
                    <Select
                        size='small'
                        value={`${labelID}`}
                        onChange={changeLabel}
                        showSearch
                        filterOption={(input: string, option: React.ReactElement<OptionProps>) => {
                            const { children } = option.props;
                            if (typeof (children) === 'string') {
                                return children.toLowerCase().includes(input.toLowerCase());
                            }

                            return false;
                        }}
                    >
                        { labels.map((label: any): JSX.Element => (
                            <Select.Option key={label.id} value={`${label.id}`}>
                                {label.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Tooltip>
            </Col>
            <Col span={2}>
                <Dropdown
                    placement='bottomLeft'
                    overlay={ItemMenu(
                        serverID,
                        locked,
                        objectType,
                        shapeType,
                        copyShortcut,
                        pasteShortcut,
                        propagateShortcut,
                        toBackgroundShortcut,
                        toForegroundShortcut,
                        removeShortcut,
                        copy,
                        remove,
                        propagate,
                        createURL,
                        toBackground,
                        toForeground,
                        switchCuboidOrientation,
                        resetCuboidPerspective,
                    )}
                >
                    <Icon type='more' />
                </Dropdown>
            </Col>
        </Row>
    );
}

const ItemTop = React.memo(ItemTopComponent);

interface ItemButtonsComponentProps {
    objectType: ObjectType;
    shapeType: ShapeType;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    switchOccludedShortcut: string;
    switchOutsideShortcut: string;
    switchLockShortcut: string;
    switchHiddenShortcut: string;
    switchKeyFrameShortcut: string;
    nextKeyFrameShortcut: string;
    prevKeyFrameShortcut: string;

    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);

    setOccluded(): void;
    unsetOccluded(): void;
    setOutside(): void;
    unsetOutside(): void;
    setKeyframe(): void;
    unsetKeyframe(): void;
    lock(): void;
    unlock(): void;
    pin(): void;
    unpin(): void;
    hide(): void;
    show(): void;
}

function ItemButtonsComponent(props: ItemButtonsComponentProps): JSX.Element {
    const {
        objectType,
        shapeType,
        occluded,
        outside,
        locked,
        pinned,
        hidden,
        keyframe,
        switchOccludedShortcut,
        switchOutsideShortcut,
        switchLockShortcut,
        switchHiddenShortcut,
        switchKeyFrameShortcut,
        nextKeyFrameShortcut,
        prevKeyFrameShortcut,

        navigateFirstKeyframe,
        navigatePrevKeyframe,
        navigateNextKeyframe,
        navigateLastKeyframe,

        setOccluded,
        unsetOccluded,
        setOutside,
        unsetOutside,
        setKeyframe,
        unsetKeyframe,
        lock,
        unlock,
        pin,
        unpin,
        hide,
        show,
    } = props;

    if (objectType === ObjectType.TRACK) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            { navigateFirstKeyframe
                                ? <Icon component={FirstIcon} onClick={navigateFirstKeyframe} />
                                : <Icon component={FirstIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigatePrevKeyframe
                                ? (
                                    <Tooltip title={`Go to previous keyframe ${prevKeyFrameShortcut}`}>
                                        <Icon
                                            component={PreviousIcon}
                                            onClick={navigatePrevKeyframe}
                                        />
                                    </Tooltip>
                                )
                                : <Icon component={PreviousIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigateNextKeyframe
                                ? (
                                    <Tooltip title={`Go to next keyframe ${nextKeyFrameShortcut}`}>
                                        <Icon
                                            component={NextIcon}
                                            onClick={navigateNextKeyframe}
                                        />
                                    </Tooltip>
                                )
                                : <Icon component={NextIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigateLastKeyframe
                                ? <Icon component={LastIcon} onClick={navigateLastKeyframe} />
                                : <Icon component={LastIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                    </Row>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            <Tooltip title={`Switch outside property ${switchOutsideShortcut}`}>
                                { outside
                                    ? <Icon component={ObjectOutsideIcon} onClick={unsetOutside} />
                                    : <Icon type='select' onClick={setOutside} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch lock property ${switchLockShortcut}`}>
                                { locked
                                    ? <Icon type='lock' onClick={unlock} theme='filled' />
                                    : <Icon type='unlock' onClick={lock} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch occluded property ${switchOccludedShortcut}`}>
                                { occluded
                                    ? <Icon type='team' onClick={unsetOccluded} />
                                    : <Icon type='user' onClick={setOccluded} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch hidden property ${switchHiddenShortcut}`}>
                                { hidden
                                    ? <Icon type='eye-invisible' onClick={show} />
                                    : <Icon type='eye' onClick={hide} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch keyframe property ${switchKeyFrameShortcut}`}>
                                { keyframe
                                    ? <Icon type='star' theme='filled' onClick={unsetKeyframe} />
                                    : <Icon type='star' onClick={setKeyframe} />}
                            </Tooltip>
                        </Col>
                        {
                            shapeType !== ShapeType.POINTS && (
                                <Col>
                                    <Tooltip title='Switch pinned property'>
                                        { pinned
                                            ? <Icon type='pushpin' theme='filled' onClick={unpin} />
                                            : <Icon type='pushpin' onClick={pin} />}
                                    </Tooltip>
                                </Col>
                            )
                        }
                    </Row>
                </Col>
            </Row>
        );
    }

    if (objectType === ObjectType.TAG) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            <Tooltip title={`Switch lock property ${switchLockShortcut}`}>
                                { locked
                                    ? <Icon type='lock' onClick={unlock} theme='filled' />
                                    : <Icon type='unlock' onClick={lock} />}
                            </Tooltip>
                        </Col>
                    </Row>
                </Col>
            </Row>
        );
    }

    return (
        <Row type='flex' align='middle' justify='space-around'>
            <Col span={20} style={{ textAlign: 'center' }}>
                <Row type='flex' justify='space-around'>
                    <Col>
                        <Tooltip title={`Switch lock property ${switchLockShortcut}`}>
                            { locked
                                ? <Icon type='lock' onClick={unlock} theme='filled' />
                                : <Icon type='unlock' onClick={lock} />}
                        </Tooltip>
                    </Col>
                    <Col>
                        <Tooltip title={`Switch occluded property ${switchOccludedShortcut}`}>
                            { occluded
                                ? <Icon type='team' onClick={unsetOccluded} />
                                : <Icon type='user' onClick={setOccluded} />}
                        </Tooltip>
                    </Col>
                    <Col>
                        <Tooltip title={`Switch hidden property ${switchHiddenShortcut}`}>
                            { hidden
                                ? <Icon type='eye-invisible' onClick={show} />
                                : <Icon type='eye' onClick={hide} />}
                        </Tooltip>
                    </Col>
                    {
                        shapeType !== ShapeType.POINTS && (
                            <Col>
                                <Tooltip title='Switch pinned property'>
                                    { pinned
                                        ? <Icon type='pushpin' theme='filled' onClick={unpin} />
                                        : <Icon type='pushpin' onClick={pin} />}
                                </Tooltip>
                            </Col>
                        )
                    }
                </Row>
            </Col>
        </Row>
    );
}

const ItemButtons = React.memo(ItemButtonsComponent);

interface ItemAttributeComponentProps {
    attrInputType: string;
    attrValues: string[];
    attrValue: string;
    attrName: string;
    attrID: number;
    changeAttribute(attrID: number, value: string): void;
}

function attrIsTheSame(
    prevProps: ItemAttributeComponentProps,
    nextProps: ItemAttributeComponentProps,
): boolean {
    return nextProps.attrID === prevProps.attrID
        && nextProps.attrValue === prevProps.attrValue
        && nextProps.attrName === prevProps.attrName
        && nextProps.attrInputType === prevProps.attrInputType
        && nextProps.attrValues
            .map((value: string, id: number): boolean => prevProps.attrValues[id] === value)
            .every((value: boolean): boolean => value);
}

function ItemAttributeComponent(props: ItemAttributeComponentProps): JSX.Element {
    const {
        attrInputType,
        attrValues,
        attrValue,
        attrName,
        attrID,
        changeAttribute,
    } = props;

    if (attrInputType === 'checkbox') {
        return (
            <Col span={24}>
                <Checkbox
                    className='cvat-object-item-checkbox-attribute'
                    checked={attrValue === 'true'}
                    onChange={(event: CheckboxChangeEvent): void => {
                        const value = event.target.checked ? 'true' : 'false';
                        changeAttribute(attrID, value);
                    }}
                >
                    <Text strong className='cvat-text'>
                        {attrName}
                    </Text>
                </Checkbox>
            </Col>
        );
    }

    if (attrInputType === 'radio') {
        return (
            <Col span={24}>
                <fieldset className='cvat-object-item-radio-attribute'>
                    <legend>
                        <Text strong className='cvat-text'>{attrName}</Text>
                    </legend>
                    <Radio.Group
                        size='small'
                        value={attrValue}
                        onChange={(event: RadioChangeEvent): void => {
                            changeAttribute(attrID, event.target.value);
                        }}
                    >
                        { attrValues.map((value: string): JSX.Element => (
                            <Radio key={value} value={value}>
                                {value === consts.UNDEFINED_ATTRIBUTE_VALUE
                                    ? consts.NO_BREAK_SPACE : value}
                            </Radio>
                        )) }
                    </Radio.Group>
                </fieldset>
            </Col>
        );
    }

    if (attrInputType === 'select') {
        return (
            <>
                <Col span={24}>
                    <Text strong className='cvat-text'>
                        {attrName}
                    </Text>
                </Col>
                <Col span={24}>
                    <Select
                        size='small'
                        onChange={(value: string): void => {
                            changeAttribute(attrID, value);
                        }}
                        value={attrValue}
                        className='cvat-object-item-select-attribute'
                    >
                        { attrValues.map((value: string): JSX.Element => (
                            <Select.Option key={value} value={value}>
                                {value === consts.UNDEFINED_ATTRIBUTE_VALUE
                                    ? consts.NO_BREAK_SPACE : value}
                            </Select.Option>
                        )) }
                    </Select>
                </Col>
            </>
        );
    }

    if (attrInputType === 'number') {
        const [min, max, step] = attrValues.map((value: string): number => +value);

        return (
            <>
                <Col span={24}>
                    <Text strong className='cvat-text'>
                        {attrName}
                    </Text>
                </Col>
                <Col span={24}>
                    <InputNumber
                        size='small'
                        onChange={(value: number | undefined): void => {
                            if (typeof (value) === 'number') {
                                changeAttribute(
                                    attrID, `${clamp(value, min, max)}`,
                                );
                            }
                        }}
                        value={+attrValue}
                        className='cvat-object-item-number-attribute'
                        min={min}
                        max={max}
                        step={step}
                    />
                </Col>
            </>
        );
    }

    return (
        <>
            <Col span={24}>
                <Text strong className='cvat-text'>
                    {attrName}
                </Text>
            </Col>
            <Col span={24}>
                <Input
                    size='small'
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        changeAttribute(attrID, event.target.value);
                    }}
                    value={attrValue}
                    className='cvat-object-item-text-attribute'
                />
            </Col>
        </>
    );
}

const ItemAttribute = React.memo(ItemAttributeComponent, attrIsTheSame);


interface ItemAttributesComponentProps {
    collapsed: boolean;
    attributes: any[];
    values: Record<number, string>;
    changeAttribute(attrID: number, value: string): void;
    collapse(): void;
}

function attrValuesAreEqual(next: Record<number, string>, prev: Record<number, string>): boolean {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    return nextKeys.length === prevKeys.length
        && nextKeys.map((key: string): boolean => prev[+key] === next[+key])
            .every((value: boolean) => value);
}

function attrAreTheSame(
    prevProps: ItemAttributesComponentProps,
    nextProps: ItemAttributesComponentProps,
): boolean {
    return nextProps.collapsed === prevProps.collapsed
        && nextProps.attributes === prevProps.attributes
        && attrValuesAreEqual(nextProps.values, prevProps.values);
}

function ItemAttributesComponent(props: ItemAttributesComponentProps): JSX.Element {
    const {
        collapsed,
        attributes,
        values,
        changeAttribute,
        collapse,
    } = props;

    const sorted = [...attributes]
        .sort((a: any, b: any): number => a.inputType.localeCompare(b.inputType));

    return (
        <Row>
            <Collapse
                className='cvat-objects-sidebar-state-item-collapse'
                activeKey={collapsed ? [] : ['details']}
                onChange={collapse}
            >
                <Collapse.Panel
                    header={<span style={{ fontSize: '11px' }}>Details</span>}
                    key='details'
                >
                    { sorted.map((attribute: any): JSX.Element => (
                        <Row
                            key={attribute.id}
                            type='flex'
                            align='middle'
                            justify='start'
                            className='cvat-object-item-attribute-wrapper'
                        >
                            <ItemAttribute
                                attrValue={values[attribute.id]}
                                attrInputType={attribute.inputType}
                                attrName={attribute.name}
                                attrID={attribute.id}
                                attrValues={attribute.values}
                                changeAttribute={changeAttribute}
                            />
                        </Row>
                    ))}
                </Collapse.Panel>
            </Collapse>
        </Row>
    );
}

const ItemAttributes = React.memo(ItemAttributesComponent, attrAreTheSame);

interface Props {
    normalizedKeyMap: Record<string, string>;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    attrValues: Record<number, string>;
    color: string;
    colors: string[];

    labels: any[];
    attributes: any[];
    collapsed: boolean;
    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);

    activate(): void;
    copy(): void;
    propagate(): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
    remove(): void;
    setOccluded(): void;
    unsetOccluded(): void;
    setOutside(): void;
    unsetOutside(): void;
    setKeyframe(): void;
    unsetKeyframe(): void;
    lock(): void;
    unlock(): void;
    pin(): void;
    unpin(): void;
    hide(): void;
    show(): void;
    changeLabel(labelID: string): void;
    changeAttribute(attrID: number, value: string): void;
    changeColor(color: string): void;
    collapse(): void;
    switchCuboidOrientation(): void;
    resetCuboidPerspective(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return nextProps.activated === prevProps.activated
        && nextProps.locked === prevProps.locked
        && nextProps.pinned === prevProps.pinned
        && nextProps.occluded === prevProps.occluded
        && nextProps.outside === prevProps.outside
        && nextProps.hidden === prevProps.hidden
        && nextProps.keyframe === prevProps.keyframe
        && nextProps.labelID === prevProps.labelID
        && nextProps.color === prevProps.color
        && nextProps.clientID === prevProps.clientID
        && nextProps.serverID === prevProps.serverID
        && nextProps.objectType === prevProps.objectType
        && nextProps.shapeType === prevProps.shapeType
        && nextProps.collapsed === prevProps.collapsed
        && nextProps.labels === prevProps.labels
        && nextProps.attributes === prevProps.attributes
        && nextProps.normalizedKeyMap === prevProps.normalizedKeyMap
        && nextProps.navigateFirstKeyframe === prevProps.navigateFirstKeyframe
        && nextProps.navigatePrevKeyframe === prevProps.navigatePrevKeyframe
        && nextProps.navigateNextKeyframe === prevProps.navigateNextKeyframe
        && nextProps.navigateLastKeyframe === prevProps.navigateLastKeyframe
        && attrValuesAreEqual(nextProps.attrValues, prevProps.attrValues);
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        objectType,
        shapeType,
        clientID,
        serverID,
        occluded,
        outside,
        locked,
        pinned,
        hidden,
        keyframe,
        attrValues,
        labelID,
        color,
        colors,

        attributes,
        labels,
        collapsed,
        normalizedKeyMap,
        navigateFirstKeyframe,
        navigatePrevKeyframe,
        navigateNextKeyframe,
        navigateLastKeyframe,

        activate,
        copy,
        propagate,
        createURL,
        toBackground,
        toForeground,
        remove,
        setOccluded,
        unsetOccluded,
        setOutside,
        unsetOutside,
        setKeyframe,
        unsetKeyframe,
        lock,
        unlock,
        pin,
        unpin,
        hide,
        show,
        changeLabel,
        changeAttribute,
        changeColor,
        collapse,
        switchCuboidOrientation,
        resetCuboidPerspective,
    } = props;

    const type = objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ? 'cvat-objects-sidebar-state-item'
        : 'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    return (
        <div style={{ display: 'flex' }}>
            <Popover
                placement='left'
                trigger='click'
                content={(
                    <ColorChanger
                        shortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                        onChange={changeColor}
                        colors={colors}
                    />
                )}
            >
                <div
                    className='cvat-objects-sidebar-state-item-color'
                    style={{ background: ` ${color}` }}
                />
            </Popover>
            <div
                onMouseEnter={activate}
                id={`cvat-objects-sidebar-state-item-${clientID}`}
                className={className}
                style={{ borderColor: ` ${color}` }}
            >
                <ItemTop
                    serverID={serverID}
                    clientID={clientID}
                    labelID={labelID}
                    labels={labels}
                    objectType={objectType}
                    type={type}
                    shapeType={shapeType}
                    locked={locked}
                    copyShortcut={normalizedKeyMap.COPY_SHAPE}
                    pasteShortcut={normalizedKeyMap.PASTE_SHAPE}
                    propagateShortcut={normalizedKeyMap.PROPAGATE_OBJECT}
                    toBackgroundShortcut={normalizedKeyMap.TO_BACKGROUND}
                    toForegroundShortcut={normalizedKeyMap.TO_FOREGROUND}
                    removeShortcut={normalizedKeyMap.DELETE_OBJECT}
                    changeLabel={changeLabel}
                    copy={copy}
                    remove={remove}
                    propagate={propagate}
                    createURL={createURL}
                    toBackground={toBackground}
                    toForeground={toForeground}
                    switchCuboidOrientation={switchCuboidOrientation}
                    resetCuboidPerspective={resetCuboidPerspective}
                />
                <ItemButtons
                    shapeType={shapeType}
                    objectType={objectType}
                    occluded={occluded}
                    outside={outside}
                    locked={locked}
                    pinned={pinned}
                    hidden={hidden}
                    keyframe={keyframe}
                    switchOccludedShortcut={normalizedKeyMap.SWITCH_OCCLUDED}
                    switchOutsideShortcut={normalizedKeyMap.SWITCH_OUTSIDE}
                    switchLockShortcut={normalizedKeyMap.SWITCH_LOCK}
                    switchHiddenShortcut={normalizedKeyMap.SWITCH_HIDDEN}
                    switchKeyFrameShortcut={normalizedKeyMap.SWITCH_KEYFRAME}
                    nextKeyFrameShortcut={normalizedKeyMap.NEXT_KEY_FRAME}
                    prevKeyFrameShortcut={normalizedKeyMap.PREV_KEY_FRAME}
                    navigateFirstKeyframe={navigateFirstKeyframe}
                    navigatePrevKeyframe={navigatePrevKeyframe}
                    navigateNextKeyframe={navigateNextKeyframe}
                    navigateLastKeyframe={navigateLastKeyframe}
                    setOccluded={setOccluded}
                    unsetOccluded={unsetOccluded}
                    setOutside={setOutside}
                    unsetOutside={unsetOutside}
                    setKeyframe={setKeyframe}
                    unsetKeyframe={unsetKeyframe}
                    lock={lock}
                    unlock={unlock}
                    pin={pin}
                    unpin={unpin}
                    hide={hide}
                    show={show}
                />
                { !!attributes.length
                    && (
                        <ItemAttributes
                            collapsed={collapsed}
                            attributes={attributes}
                            values={attrValues}
                            collapse={collapse}
                            changeAttribute={changeAttribute}
                        />
                    )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent, objectItemsAreEqual);
