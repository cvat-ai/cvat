import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {
    statesVisible: boolean;
    statesLocked: boolean;
    statesExpanded: boolean;
    onStatesCollapse(value: boolean): void;
    onStatesLock(value: boolean): void;
    onStatesHide(value: boolean): void;
}

const Header = (props: Props): JSX.Element => {
    const {
        statesVisible,
        statesLocked,
        statesExpanded,
        onStatesCollapse,
        onStatesLock,
        onStatesHide,
    } = props;

    return (
        <div className='cvat-objects-sidebar-states-header'>
            <Row>
                <Col>
                    <Input
                        placeholder='Filter e.g. car[attr/model="mazda"]'
                        prefix={<Icon type='filter' />}
                    />
                </Col>
            </Row>
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={2}>
                    { statesLocked
                        ? <Icon type='lock' onClick={(): void => onStatesLock(false)} />
                        : <Icon type='unlock' onClick={(): void => onStatesLock(true)} />
                    }
                </Col>
                <Col span={2}>
                    { statesVisible
                        ? <Icon type='eye' onClick={(): void => onStatesHide(true)} />
                        : <Icon type='eye-invisible' onClick={(): void => onStatesHide(false)} />
                    }
                </Col>
                <Col span={2}>
                    { statesExpanded
                        ? <Icon type='caret-up' onClick={(): void => onStatesCollapse(true)} />
                        : <Icon type='caret-down' onClick={(): void => onStatesCollapse(false)} />
                    }
                </Col>
                <Col span={16}>
                    <Text strong>Sort by</Text>
                    <Select defaultValue='id'>
                        <Select.Option key='id'> ID </Select.Option>
                        <Select.Option key='updated'> Updated </Select.Option>
                    </Select>
                </Col>
            </Row>
        </div>
    );
};

export default Header;
