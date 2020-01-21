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
    ObjectType,
} from 'reducers/interfaces';

interface ItemTopProps {
    clientID: number;
    label: any;
    labels: any[];
    type: string;
    state: any;
    onUpdate(state: any): void;
}

const ItemTop = (props: ItemTopProps): JSX.Element => {
    const {
        clientID,
        label,
        labels,
        type,
        state,
        onUpdate,
    } = props;

    return (
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 16 }}>{clientID}</Text>
                <br />
                <Text style={{ fontSize: 10 }}>{type}</Text>
            </Col>
            <Col span={12}>
                <Select
                    value={label.id}
                    onChange={async (value: string): Promise<void> => {
                        const id = +value;
                        [state.label] = labels.filter((_label: any) => _label.id === id);
                        onUpdate(state);
                    }}
                >
                    { labels.map((_label: any): JSX.Element => (
                        <Select.Option key={_label.id} value={_label.id}>
                            {_label.name}
                        </Select.Option>
                    ))}
                </Select>
            </Col>
            <Col span={2}>
                <Icon type='more' />
            </Col>
        </Row>
    );
};

interface ItemButtonsProps {
    objectState: any;
    onUpdate(state: any): void;
}

const ItemButtons = (props: ItemButtonsProps): JSX.Element => {
    const {
        objectState,
        onUpdate,
    } = props;

    const {
        objectType,
        occluded,
        outside,
        lock: locked,
        visible,
        keyframe,
    } = objectState;

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
                                ? (
                                    <Icon
                                        component={ObjectOutsideIcon}
                                        onClick={(): void => {
                                            objectState.outside = false;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                                : (
                                    <Icon
                                        type='select'
                                        onClick={(): void => {
                                            objectState.outside = true;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                            }
                        </Col>
                        <Col span={4}>
                            { locked
                                ? (
                                    <Icon
                                        type='lock'
                                        onClick={(): void => {
                                            objectState.lock = false;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                                : (
                                    <Icon
                                        type='unlock'
                                        onClick={(): void => {
                                            objectState.lock = true;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                            }
                        </Col>
                        <Col span={4}>
                            { occluded
                                ? (
                                    <Icon
                                        type='team'
                                        onClick={(): void => {
                                            objectState.occluded = false;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                                : (
                                    <Icon
                                        type='user'
                                        onClick={(): void => {
                                            objectState.occluded = true;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                            }
                        </Col>
                        <Col span={4}>
                            { visible
                                ? (
                                    <Icon
                                        type='eye'
                                        onClick={(): void => {
                                            objectState.visible = false;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                                : (
                                    <Icon
                                        type='eye-invisible'
                                        onClick={(): void => {
                                            objectState.visible = true;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                            }
                        </Col>
                        <Col span={4}>
                            { keyframe
                                ? (
                                    <Icon
                                        type='star'
                                        theme='filled'
                                        onClick={(): void => {
                                            objectState.keyframe = false;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
                                : (
                                    <Icon
                                        type='star'
                                        onClick={(): void => {
                                            objectState.keyframe = true;
                                            onUpdate(objectState);
                                        }}
                                    />
                                )
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
                            ? (
                                <Icon
                                    type='lock'
                                    onClick={(): void => {
                                        objectState.lock = false;
                                        onUpdate(objectState);
                                    }}
                                />
                            )
                            : (
                                <Icon
                                    type='unlock'
                                    onClick={(): void => {
                                        objectState.lock = true;
                                        onUpdate(objectState);
                                    }}
                                />
                            )
                        }
                    </Col>
                    <Col span={8}>
                        { occluded
                            ? (
                                <Icon
                                    type='team'
                                    onClick={(): void => {
                                        objectState.occluded = false;
                                        onUpdate(objectState);
                                    }}
                                />
                            )
                            : (
                                <Icon
                                    type='user'
                                    onClick={(): void => {
                                        objectState.occluded = true;
                                        onUpdate(objectState);
                                    }}
                                />
                            )
                        }
                    </Col>
                    <Col span={8}>
                        { visible
                            ? (
                                <Icon
                                    type='eye'
                                    onClick={(): void => {
                                        objectState.visible = false;
                                        onUpdate(objectState);
                                    }}
                                />
                            )
                            : (
                                <Icon
                                    type='eye-invisible'
                                    onClick={(): void => {
                                        objectState.visible = true;
                                        onUpdate(objectState);
                                    }}
                                />
                            )
                        }
                    </Col>
                </Row>
            </Col>
        </Row>
    );
};


interface ItemAttributeProps {
    attribute: any;
    attrValue: string;
    objectState: any;
    onUpdate(objectState: any): void;
}

const ItemAttribute = (props: ItemAttributeProps): JSX.Element => {
    const {
        attribute,
        attrValue,
        objectState,
        onUpdate,
    } = props;

    if (attribute.inputType === 'checkbox') {
        return (
            <Col span={24}>
                <Checkbox
                    className='cvat-object-item-checkbox-attribute'
                    checked={attrValue === 'true'}
                    onChange={(event: CheckboxChangeEvent): void => {
                        const attr: Record<number, string> = {};
                        attr[attribute.id] = event.target.checked ? 'true' : 'false';
                        objectState.attributes = attr;
                        onUpdate(objectState);
                    }}
                >
                    <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
                        {attribute.name}
                    </Text>
                </Checkbox>
            </Col>
        );
    }

    if (attribute.inputType === 'radio') {
        return (
            <Col span={24}>
                <fieldset className='cvat-object-item-radio-attribute'>
                    <legend>
                        <Text strong className='cvat-text'>{attribute.name}</Text>
                    </legend>
                    <Radio.Group
                        value={attrValue}
                        onChange={(event: RadioChangeEvent): void => {
                            const attr: Record<number, string> = {};
                            attr[attribute.id] = event.target.value;
                            objectState.attributes = attr;
                            onUpdate(objectState);
                        }}
                    >
                        { attribute.values.map((value: string): JSX.Element => (
                            <Radio key={value} value={value}>{value}</Radio>
                        )) }
                    </Radio.Group>
                </fieldset>
            </Col>
        );
    }

    if (attribute.inputType === 'select') {
        return (
            <>
                <Col span={24}>
                    <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
                        {attribute.name}
                    </Text>
                </Col>
                <Col span={24}>
                    <Select
                        onChange={(value: string): void => {
                            const attr: Record<number, string> = {};
                            attr[attribute.id] = value;
                            objectState.attributes = attr;
                            onUpdate(objectState);
                        }}
                        value={attrValue}
                        className='cvat-object-item-select-attribute'
                    >
                        { attribute.values.map((value: string): JSX.Element => (
                            <Select.Option key={value} value={value}>{value}</Select.Option>
                        )) }
                    </Select>
                </Col>
            </>
        );
    }

    if (attribute.inputType === 'number') {
        const [min, max, step] = attribute.values;

        return (
            <>
                <Col span={24}>
                    <Text strong className='cvat-text' style={{ fontSize: '1.2em' }}>
                        {attribute.name}
                    </Text>
                </Col>
                <Col span={24}>
                    <InputNumber
                        onChange={(value: number | undefined): void => {
                            if (typeof (value) !== 'undefined') {
                                const attr: Record<number, string> = {};
                                attr[attribute.id] = `${value}`;
                                objectState.attributes = attr;
                                onUpdate(objectState);
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
                    {attribute.name}
                </Text>
            </Col>
            <Col span={24}>
                <Input
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        const attr: Record<number, string> = {};
                        attr[attribute.id] = event.target.value;
                        objectState.attributes = attr;
                        onUpdate(objectState);
                    }}
                    value={attrValue}
                    className='cvat-object-item-text-attribute'
                />
            </Col>
        </>
    );
};


interface ItemAttributesProps {
    attributes: Record<number, string>;
    labelAttributes: any[];
    collapsed: boolean;
    clientID: number;
    onCollapse(clientID: number, key: string | string[]): void;
    objectState: any;
    onUpdate(state: any): void;
}

const ItemAttributes = (props: ItemAttributesProps): JSX.Element => {
    const {
        labelAttributes,
        attributes,
        collapsed,
        clientID,
        onCollapse,
        objectState,
        onUpdate,
    } = props;

    const sorted = [...labelAttributes]
        .sort((a: any, b: any): number => a.inputType.localeCompare(b.inputType));

    return (
        <Row>
            <Collapse
                className='cvat-objects-sidebar-state-item-collapse'
                activeKey={collapsed ? [] : ['details']}
                onChange={(key: string | string[]): void => onCollapse(clientID, key)}
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
                                attribute={attribute}
                                attrValue={attributes[attribute.id]}
                                objectState={objectState}
                                onUpdate={onUpdate}
                            />
                        </Row>
                    ))}
                </Collapse.Panel>
            </Collapse>
        </Row>
    );
};

interface Props {
    objectState: any;
    collapsed: boolean;
    labels: any[];
    onUpdate(state: any): void;
    onCollapse(clientID: number, key: string | string[]): void;
}

export default function ObjectItem(props: Props): JSX.Element {
    const {
        objectState,
        labels,
        collapsed,
        onCollapse,
        onUpdate,
    } = props;

    const {
        clientID,
        label,
        objectType,
        shapeType,
        attributes,
    } = objectState;

    const type = objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    return (
        <div
            className='cvat-objects-sidebar-state-item'
            style={{ borderLeftStyle: 'solid', borderColor: ` ${objectState.color}` }}
        >
            <ItemTop
                type={type}
                labels={labels}
                clientID={clientID}
                label={label}
                state={objectState}
                onUpdate={onUpdate}
            />
            <ItemButtons
                objectState={objectState}
                onUpdate={onUpdate}
            />
            { !!label.attributes.length
                && (
                    <ItemAttributes
                        collapsed={collapsed}
                        clientID={clientID}
                        attributes={attributes}
                        labelAttributes={label.attributes}
                        onCollapse={onCollapse}
                        objectState={objectState}
                        onUpdate={onUpdate}
                    />
                )
            }
        </div>
    );
}
