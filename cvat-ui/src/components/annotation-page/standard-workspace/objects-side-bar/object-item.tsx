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

import {
    ObjectOutsideIcon,
    ObjectInsideIcon,
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
}

const ItemTop = React.memo((props: ItemTopProps): JSX.Element => {
    const {
        clientID,
        label,
        labels,
        type,
    } = props;

    return (
        <Row type='flex' align='middle'>
            <Col span={10}>
                <Text style={{ fontSize: 16 }}>{clientID}</Text>
                <br />
                <Text style={{ fontSize: 10 }}>{type}</Text>
            </Col>
            <Col span={12}>
                <Select value={label.id}>
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
});

interface ItemButtonsProps {
    objectType: ObjectType;
}

const ItemButtons = React.memo((props: ItemButtonsProps): JSX.Element => {
    const { objectType } = props;

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
                        <Col span={6}>
                            <Icon component={ObjectOutsideIcon} />
                        </Col>
                        <Col span={6}>
                            <Icon type='lock' />
                        </Col>
                        <Col span={6}>
                            <Icon type='user' />
                        </Col>
                        <Col span={6}>
                            <Icon type='eye-invisible' />
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
                        <Icon type='lock' />
                    </Col>
                    <Col span={8}>
                        <Icon type='user' />
                    </Col>
                    <Col span={8}>
                        <Icon type='eye-invisible' />
                    </Col>
                </Row>
            </Col>
        </Row>
    );
});


interface ItemAttributeProps {
    attribute: any;
    attrValue: string;
}

const ItemAttribute = React.memo((props: ItemAttributeProps): JSX.Element => {
    const {
        attribute,
        attrValue,
    } = props;

    if (attribute.inputType === 'checkbox') {
        return (
            <Col span={24}>
                <Checkbox className='cvat-object-item-checkbox-attribute'>
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
                    <Radio.Group>
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
                    <Select className='cvat-object-item-select-attribute'>
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
                    <InputNumber className='cvat-object-item-number-attribute' min={+min} max={+max} step={+step} />
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
                <Input className='cvat-object-item-text-attribute' />
            </Col>
        </>
    );
});


interface ItemAttributesProps {
    attributes: Record<number, string>;
    labelAttributes: any[];
}

const ItemAttributes = React.memo((props: ItemAttributesProps): JSX.Element => {
    const {
        labelAttributes,
        attributes,
    } = props;

    const sorted = [...labelAttributes]
        .sort((a: any, b: any): number => a.inputType.localeCompare(b.inputType));

    return (
        <Row>
            <Collapse
                className='cvat-objects-sidebar-state-item-collapse'
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
                            />
                        </Row>
                    ))}
                </Collapse.Panel>
            </Collapse>
        </Row>
    );
});

interface Props {
    objectState: any;
    collapsed: boolean;
    labels: any[];
    onUpdate(state: any): void;
    onCollapse(state: any, key: string | string[]): void;
}

export default function ObjectItem(props: Props): JSX.Element {
    const {
        objectState,
        labels,
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
            <ItemTop type={type} labels={labels} clientID={clientID} label={label} />
            <ItemButtons objectType={objectType} />
            { label.attributes.length
                && <ItemAttributes attributes={attributes} labelAttributes={label.attributes} />
            }
        </div>
    );
}
