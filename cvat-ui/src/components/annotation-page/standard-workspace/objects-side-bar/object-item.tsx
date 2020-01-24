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
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import { RadioChangeEvent } from 'antd/lib/radio';

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

interface ItemTopProps {
    clientID: number;
    labelID: number;
    labels: any[];
    type: string;
    changeLabel(labelID: string): void;
}

const ItemTop = React.memo((props: ItemTopProps): JSX.Element => {
    const {
        clientID,
        labelID,
        labels,
        type,
        changeLabel,
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
                <Icon type='more' />
            </Col>
        </Row>
    );
});

interface ItemButtonsProps {
    objectType: ObjectType;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;

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

const ItemButtons = React.memo((props: ItemButtonsProps): JSX.Element => {
    const {
        objectType,
        occluded,
        outside,
        locked,
        hidden,
        keyframe,
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
                            <Icon component={FirstIcon} />
                        </Col>
                        <Col span={6}>
                            <Icon component={PreviousIcon} />
                        </Col>
                        <Col span={6}>
                            <Icon component={NextIcon} />
                        </Col>
                        <Col span={6}>
                            <Icon component={LastIcon} />
                        </Col>
                    </Row>
                    <Row type='flex' justify='space-around'>
                        <Col span={4}>
                            { outside
                                ? <Icon component={ObjectOutsideIcon} onClick={unsetOutside} />
                                : <Icon type='select' onClick={setOutside} />
                            }
                        </Col>
                        <Col span={4}>
                            { locked
                                ? <Icon type='lock' onClick={unlock} />
                                : <Icon type='unlock' onClick={lock} />
                            }
                        </Col>
                        <Col span={4}>
                            { occluded
                                ? <Icon type='team' onClick={unsetOccluded} />
                                : <Icon type='user' onClick={setOccluded} />
                            }
                        </Col>
                        <Col span={4}>
                            { hidden
                                ? <Icon type='eye-invisible' onClick={show} />
                                : <Icon type='eye' onClick={hide} />
                            }
                        </Col>
                        <Col span={4}>
                            { keyframe
                                ? <Icon type='star' theme='filled' onClick={unsetKeyframe} />
                                : <Icon type='star' onClick={setKeyframe} />
                            }
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
                            : <Icon type='unlock' onClick={lock} />
                        }
                    </Col>
                    <Col span={8}>
                        { occluded
                            ? <Icon type='team' onClick={unsetOccluded} />
                            : <Icon type='user' onClick={setOccluded} />
                        }
                    </Col>
                    <Col span={8}>
                        { hidden
                            ? <Icon type='eye-invisible' onClick={show} />
                            : <Icon type='eye' onClick={hide} />
                        }
                    </Col>
                </Row>
            </Col>
        </Row>
    );
});

interface ItemAttributeProps {
    attrInputType: string;
    attrValues: string[];
    attrValue: string;
    attrName: string;
    attrID: number;
    changeAttribute(attrID: number, value: string): void;
}

function attrIsTheSame(prevProps: ItemAttributeProps, nextProps: ItemAttributeProps): boolean {
    return nextProps.attrID === prevProps.attrID
        && nextProps.attrValue === prevProps.attrValue
        && nextProps.attrName === prevProps.attrName
        && nextProps.attrInputType === prevProps.attrInputType
        && nextProps.attrValues
            .map((value: string, id: number): boolean => prevProps.attrValues[id] === value)
            .every((value: boolean): boolean => value);
}

const ItemAttribute = React.memo((props: ItemAttributeProps): JSX.Element => {
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
}, attrIsTheSame);


interface ItemAttributesProps {
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

function attrAreTheSame(prevProps: ItemAttributesProps, nextProps: ItemAttributesProps): boolean {
    return nextProps.collapsed === prevProps.collapsed
        && nextProps.attributes === prevProps.attributes
        && attrValuesAreEqual(nextProps.values, prevProps.values);
}

const ItemAttributes = React.memo((props: ItemAttributesProps): JSX.Element => {
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
}, attrAreTheSame);

interface Props {
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
    return nextProps.locked === prevProps.locked
        && nextProps.occluded === prevProps.occluded
        && nextProps.outside === prevProps.outside
        && nextProps.hidden === prevProps.hidden
        && nextProps.keyframe === prevProps.keyframe
        && nextProps.label === prevProps.label
        && nextProps.color === prevProps.color
        && nextProps.clientID === prevProps.clientID
        && nextProps.objectType === prevProps.objectType
        && nextProps.shapeType === prevProps.shapeType
        && nextProps.collapsed === prevProps.collapsed
        && nextProps.labels === prevProps.labels
        && nextProps.attributes === prevProps.attributes
        && attrValuesAreEqual(nextProps.attrValues, prevProps.attrValues);
}

const ObjectItem = React.memo((props: Props): JSX.Element => {
    const {
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

    return (
        <div
            className='cvat-objects-sidebar-state-item'
            style={{ borderLeftStyle: 'solid', borderColor: ` ${color}` }}
        >
            <ItemTop
                clientID={clientID}
                labelID={labelID}
                labels={labels}
                type={type}
                changeLabel={changeLabel}
            />
            <ItemButtons
                objectType={objectType}
                occluded={occluded}
                outside={outside}
                locked={locked}
                hidden={hidden}
                keyframe={keyframe}
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
                )
            }
        </div>
    );
}, objectItemsAreEqual);

export default ObjectItem;
