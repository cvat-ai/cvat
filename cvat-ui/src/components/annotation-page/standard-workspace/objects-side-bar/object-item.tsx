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
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { RadioChangeEvent } from 'antd/lib/radio';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

import {
    ObjectOutsideIcon,
    FirstIcon,
    LastIcon,
    PreviousIcon,
    NextIcon,
} from 'icons';

import {
    ObjectType, ShapeType,
} from 'reducers/interfaces';

function ItemMenu(
    locked: boolean,
    copy: (() => void),
    remove: (() => void),
    propagate: (() => void),
): JSX.Element {
    return (
        <Menu key='unique' className='cvat-object-item-menu'>
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
    labelID: number;
    labels: any[];
    type: string;
    locked: boolean;
    changeLabel(labelID: string): void;
    copy(): void;
    remove(): void;
    propagate(): void;
}

function ItemTopComponent(props: ItemTopComponentProps): JSX.Element {
    const {
        clientID,
        labelID,
        labels,
        type,
        locked,
        changeLabel,
        copy,
        remove,
        propagate,
    } = props;

    return (
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 16 }}>{clientID}</Text>
                <br />
                <Text style={{ fontSize: 10 }}>{type}</Text>
            </Col>
            <Col span={12}>
                <Select value={`${labelID}`} onChange={changeLabel}>
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
                    overlay={ItemMenu(locked, copy, remove, propagate)}
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
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
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
    hide(): void;
    show(): void;
}

function ItemButtonsComponent(props: ItemButtonsComponentProps): JSX.Element {
    const {
        objectType,
        occluded,
        outside,
        locked,
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
        hide,
        show,
    } = props;

    if (objectType === ObjectType.TRACK) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col span={6}>
                            { navigateFirstKeyframe
                                ? <Icon component={FirstIcon} onClick={navigateFirstKeyframe} />
                                : <Icon component={FirstIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col span={6}>
                            { navigatePrevKeyframe
                                ? <Icon component={PreviousIcon} onClick={navigatePrevKeyframe} />
                                : <Icon component={PreviousIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col span={6}>
                            { navigateNextKeyframe
                                ? <Icon component={NextIcon} onClick={navigateNextKeyframe} />
                                : <Icon component={NextIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col span={6}>
                            { navigateLastKeyframe
                                ? <Icon component={LastIcon} onClick={navigateLastKeyframe} />
                                : <Icon component={LastIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                    </Row>
                    <Row type='flex' justify='space-around'>
                        <Col span={4}>
                            { outside
                                ? <Icon component={ObjectOutsideIcon} onClick={unsetOutside} />
                                : <Icon type='select' onClick={setOutside} />}
                        </Col>
                        <Col span={4}>
                            { locked
                                ? <Icon type='lock' onClick={unlock} />
                                : <Icon type='unlock' onClick={lock} />}
                        </Col>
                        <Col span={4}>
                            { occluded
                                ? <Icon type='team' onClick={unsetOccluded} />
                                : <Icon type='user' onClick={setOccluded} />}
                        </Col>
                        <Col span={4}>
                            { hidden
                                ? <Icon type='eye-invisible' onClick={show} />
                                : <Icon type='eye' onClick={hide} />}
                        </Col>
                        <Col span={4}>
                            { keyframe
                                ? <Icon type='star' theme='filled' onClick={unsetKeyframe} />
                                : <Icon type='star' onClick={setKeyframe} />}
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
                    <Col span={8}>
                        { locked
                            ? <Icon type='lock' onClick={unlock} />
                            : <Icon type='unlock' onClick={lock} />}
                    </Col>
                    <Col span={8}>
                        { occluded
                            ? <Icon type='team' onClick={unsetOccluded} />
                            : <Icon type='user' onClick={setOccluded} />}
                    </Col>
                    <Col span={8}>
                        { hidden
                            ? <Icon type='eye-invisible' onClick={show} />
                            : <Icon type='eye' onClick={hide} />}
                    </Col>
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
                    <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
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
                    <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
                        {attrName}
                    </Text>
                </Col>
                <Col span={24}>
                    <Select
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
                    <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
                        {attrName}
                    </Text>
                </Col>
                <Col span={24}>
                    <InputNumber
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
                <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
                    {attrName}
                </Text>
            </Col>
            <Col span={24}>
                <Input
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
                    header='Details'
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
    labelID: number;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    attrValues: Record<number, string>;
    color: string;

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
    remove(): void;
    setOccluded(): void;
    unsetOccluded(): void;
    setOutside(): void;
    unsetOutside(): void;
    setKeyframe(): void;
    unsetKeyframe(): void;
    lock(): void;
    unlock(): void;
    hide(): void;
    show(): void;
    changeLabel(labelID: string): void;
    changeAttribute(attrID: number, value: string): void;
    collapse(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return nextProps.activated === prevProps.activated
        && nextProps.locked === prevProps.locked
        && nextProps.occluded === prevProps.occluded
        && nextProps.outside === prevProps.outside
        && nextProps.hidden === prevProps.hidden
        && nextProps.keyframe === prevProps.keyframe
        && nextProps.labelID === prevProps.labelID
        && nextProps.color === prevProps.color
        && nextProps.clientID === prevProps.clientID
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
        occluded,
        outside,
        locked,
        hidden,
        keyframe,
        attrValues,
        labelID,
        color,

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
        remove,
        setOccluded,
        unsetOccluded,
        setOutside,
        unsetOutside,
        setKeyframe,
        unsetKeyframe,
        lock,
        unlock,
        hide,
        show,
        changeLabel,
        changeAttribute,
        collapse,
    } = props;

    const type = objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ? 'cvat-objects-sidebar-state-item'
        : 'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    return (
        <div
            onMouseEnter={activate}
            id={`cvat-objects-sidebar-state-item-${clientID}`}
            className={className}
            style={{ borderLeftStyle: 'solid', borderColor: ` ${color}` }}
        >
            <ItemTop
                clientID={clientID}
                labelID={labelID}
                labels={labels}
                type={type}
                locked={locked}
                changeLabel={changeLabel}
                copy={copy}
                remove={remove}
                propagate={propagate}
            />
            <ItemButtons
                objectType={objectType}
                occluded={occluded}
                outside={outside}
                locked={locked}
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
    );
}

export default React.memo(ObjectItemComponent, objectItemsAreEqual);
