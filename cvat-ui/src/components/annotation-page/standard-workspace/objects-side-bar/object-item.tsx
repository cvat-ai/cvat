import React from 'react';

import {
    Row,
    Col,
    Icon,
    Select,
    Collapse,
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

interface Props {
    objectState: any;
    annotations: any[];
    onAnnotationsUpdated(annotations: any[]): void;
}

function renderShapeButtonsBlock(): JSX.Element {
    return (
        <>
            <Col span={2}>
                <Icon type='lock' />
            </Col>
            <Col span={2}>
                <Icon type='user' />
            </Col>
            <Col span={2}>
                <Icon type='eye-invisible' />
            </Col>
        </>
    );
}

function renderTrackButtonsBlock(): JSX.Element {
    return (
        <>
            <Col span={2}>
                <Icon component={FirstIcon} />
            </Col>
            <Col span={2}>
                <Icon component={PreviousIcon} />
            </Col>
            <Col span={2}>
                <Icon component={NextIcon} />
            </Col>
            <Col span={2}>
                <Icon component={LastIcon} />
            </Col>

            <Col span={2} offset={1}>
                <Icon component={ObjectOutsideIcon} />
            </Col>
            <Col span={2}>
                <Icon type='lock' />
            </Col>
            <Col span={2}>
                <Icon type='user' />
            </Col>
            <Col span={2}>
                <Icon type='eye-invisible' />
            </Col>
        </>
    );
}

function ObjectItem(props: Props): JSX.Element {
    const { objectState } = props;
    const type = objectState.objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${objectState.shapeType.toUpperCase()} ${objectState.objectType.toUpperCase()}`;
    const withAttributes = !!Object.keys(objectState.attributes).length;

    return (
        <div className='cvat-objects-sidebar-state-item' style={{ borderLeft: `5px solid ${objectState.color}` }}>
            <Row type='flex' align='middle'>
                <Col span={10}>
                    <Text style={{ fontSize: 16 }}>{objectState.clientID}</Text>
                    <br />
                    <Text style={{ fontSize: 10 }}>{type}</Text>
                </Col>
                <Col span={12}>
                    <Select>
                        <Select.Option key='Test'>
                            Test
                        </Select.Option>
                    </Select>
                </Col>
                <Col span={2}>
                    <Icon type='more' />
                </Col>
            </Row>
            <Row type='flex' align='middle' justify='space-around'>
                {
                    objectState.objectType === ObjectType.TRACK
                        ? renderTrackButtonsBlock() : renderShapeButtonsBlock()
                }
            </Row>
            {
                withAttributes && (
                    <Row>
                        <Collapse
                            className='cvat-objects-sidebar-state-item-collapse'
                        >
                            <Collapse.Panel
                                header='ATTRIBUTES'
                                key='Attributes'
                            >

                            </Collapse.Panel>
                        </Collapse>
                    </Row>
                )
            }
        </div>
    );
}

// render depends only on objectState
// but we need annotations array and callback to update state
export default React.memo(ObjectItem,
    (prevProps: Props, curProps: Props) => prevProps.objectState === curProps.objectState);
