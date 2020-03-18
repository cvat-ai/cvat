// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Icon,
    Select,
    Radio,
    Input,
    Collapse,
    Checkbox,
    InputNumber,
    Dropdown,
    Menu,
    Button,
    Modal,
    Popover,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { RadioChangeEvent } from 'antd/lib/radio';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import ColorChanger from 'components/annotation-page/standard-workspace/objects-side-bar/color-changer';

import {
    ObjectOutsideIcon,
    FirstIcon,
    LastIcon,
    PreviousIcon,
    NextIcon,
    BackgroundIcon,
    ForegroundIcon,
} from 'icons';

import {
    ObjectType, ShapeType,
} from 'reducers/interfaces';

function ItemMenu(
    serverID: number | undefined,
    locked: boolean,
    objectType: ObjectType,
    copy: (() => void),
    remove: (() => void),
    propagate: (() => void),
    createURL: (() => void),
    toBackground: (() => void),
    toForeground: (() => void),
): JSX.Element {
    return (
        <Menu key='unique' className='cvat-object-item-menu'>
            <Menu.Item>
                <Button disabled={serverID === undefined} type='link' icon='link' onClick={createURL}>
                    Create object URL
                </Button>
            </Menu.Item>
            <Menu.Item>
                <Button type='link' icon='copy' onClick={copy}>
                    Make a copy
                </Button>
            </Menu.Item>
            <Menu.Item>
                <Button type='link' icon='block' onClick={propagate}>
                    Propagate
                </Button>
            </Menu.Item>
            { objectType !== ObjectType.TAG && (
                <>
                    <Menu.Item>
                        <Button type='link' onClick={toBackground}>
                            <Icon component={BackgroundIcon} />
                            To background
                        </Button>
                    </Menu.Item>
                    <Menu.Item>
                        <Button type='link' onClick={toForeground}>
                            <Icon component={ForegroundIcon} />
                            To foreground
                        </Button>
                    </Menu.Item>
                </>
            )}
            <Menu.Item>
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
    type: string;
    locked: boolean;
    changeLabel(labelID: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
}

function ItemTopComponent(props: ItemTopComponentProps): JSX.Element {
    const {
        clientID,
        serverID,
        labelID,
        labels,
        objectType,
        type,
        locked,
        changeLabel,
        copy,
        remove,
        propagate,
        createURL,
        toBackground,
        toForeground,
    } = props;

    return (
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 12 }}>{clientID}</Text>
                <br />
                <Text type='secondary' style={{ fontSize: 10 }}>{type}</Text>
            </Col>
            <Col span={12}>
                <Select size='small' value={`${labelID}`} onChange={changeLabel}>
                    { labels.map((label: any): JSX.Element => (
                        <Select.Option key={label.id} value={`${label.id}`}>
                            {label.name}
                        </Select.Option>
                    ))}
                </Select>
            </Col>
            <Col span={2}>
                <Dropdown
                    placement='bottomLeft'
                    overlay={ItemMenu(
                        serverID,
                        locked,
                        objectType,
                        copy,
                        remove,
                        propagate,
                        createURL,
                        toBackground,
                        toForeground,
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
                                ? <Icon component={PreviousIcon} onClick={navigatePrevKeyframe} />
                                : <Icon component={PreviousIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigateNextKeyframe
                                ? <Icon component={NextIcon} onClick={navigateNextKeyframe} />
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
                            { outside
                                ? <Icon component={ObjectOutsideIcon} onClick={unsetOutside} />
                                : <Icon type='select' onClick={setOutside} />}
                        </Col>
                        <Col>
                            { locked
                                ? <Icon type='lock' onClick={unlock} />
                                : <Icon type='unlock' onClick={lock} />}
                        </Col>
                        <Col>
                            { occluded
                                ? <Icon type='team' onClick={unsetOccluded} />
                                : <Icon type='user' onClick={setOccluded} />}
                        </Col>
                        <Col>
                            { hidden
                                ? <Icon type='eye-invisible' onClick={show} />
                                : <Icon type='eye' onClick={hide} />}
                        </Col>
                        <Col>
                            { keyframe
                                ? <Icon type='star' theme='filled' onClick={unsetKeyframe} />
                                : <Icon type='star' onClick={setKeyframe} />}
                        </Col>
                        {
                            shapeType !== ShapeType.POINTS && (
                                <Col>
                                    { pinned
                                        ? <Icon type='pushpin' theme='filled' onClick={unpin} />
                                        : <Icon type='pushpin' onClick={pin} />}
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
                            { locked
                                ? <Icon type='lock' onClick={unlock} />
                                : <Icon type='unlock' onClick={lock} />}
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
                        { locked
                            ? <Icon type='lock' onClick={unlock} />
                            : <Icon type='unlock' onClick={lock} />}
                    </Col>
                    <Col>
                        { occluded
                            ? <Icon type='team' onClick={unsetOccluded} />
                            : <Icon type='user' onClick={setOccluded} />}
                    </Col>
                    <Col>
                        { hidden
                            ? <Icon type='eye-invisible' onClick={show} />
                            : <Icon type='eye' onClick={hide} />}
                    </Col>
                    {
                        shapeType !== ShapeType.POINTS && (
                            <Col>
                                { pinned
                                    ? <Icon type='pushpin' theme='filled' onClick={unpin} />
                                    : <Icon type='pushpin' onClick={pin} />}
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
                            <Radio key={value} value={value}>{value}</Radio>
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
                            <Select.Option key={value} value={value}>{value}</Select.Option>
                        )) }
                    </Select>
                </Col>
            </>
        );
    }

    if (attrInputType === 'number') {
        const [min, max, step] = attrValues;

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
                            if (typeof (value) !== 'undefined') {
                                changeAttribute(attrID, `${value}`);
                            }
                        }}
                        value={+attrValue}
                        className='cvat-object-item-number-attribute'
                        min={+min}
                        max={+max}
                        step={+step}
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
                    locked={locked}
                    changeLabel={changeLabel}
                    copy={copy}
                    remove={remove}
                    propagate={propagate}
                    createURL={createURL}
                    toBackground={toBackground}
                    toForeground={toForeground}
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
