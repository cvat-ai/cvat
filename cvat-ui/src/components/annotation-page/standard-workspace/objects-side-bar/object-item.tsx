import React from 'react';

import {
    Row,
    Col,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

import {
    ObjectType,
} from 'reducers/interfaces';

interface Props {
    objectState: any;
    annotations: any[];
    onAnnotationsUpdated(annotations: any[]): void;
}

function ObjectItem(props: Props): JSX.Element {
    const { objectState } = props;
    const type = objectState.objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${objectState.shapeType.toUpperCase()} ${objectState.objectType.toUpperCase()}`;

    return (
        <div className='cvat-objects-sidebar-state-item' style={{ borderLeft: `5px solid ${objectState.color}` }}>
            <Row type='flex'>
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

                </Col>
            </Row>
        </div>
    );
}

// render depends only on objectState
// but we need annotations array and callback to update state
export default React.memo(ObjectItem,
    (prevProps: Props, curProps: Props) => prevProps.objectState === curProps.objectState);
