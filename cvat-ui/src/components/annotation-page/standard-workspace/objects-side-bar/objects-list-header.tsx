import React from 'react';

import {
    Row,
    Col,
    Icon,
    Input,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';

export enum SortingMethods {
    ID_DESCENT = 'ID - descent',
    ID_ASCENT = 'ID - ascent',
    UPDATED = 'Updated time',
}

interface Props {
    statesVisible: boolean;
    statesLocked: boolean;
    statesExpanded: boolean;
    sortingMethod: SortingMethods;
    onChangeSortingMethod(sortingMethod: SortingMethods): void;
    onStatesCollapse(value: boolean): void;
    onStatesLock(value: boolean): void;
    onStatesHide(value: boolean): void;
}

const Header = (props: Props): JSX.Element => {
    const {
        statesVisible,
        statesLocked,
        statesExpanded,
        sortingMethod,
        onChangeSortingMethod,
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
                    <Select value={sortingMethod} onChange={onChangeSortingMethod}>
                        <Select.Option
                            key={SortingMethods.ID_DESCENT}
                        >
                            {SortingMethods.ID_DESCENT}
                        </Select.Option>
                        <Select.Option
                            key={SortingMethods.ID_ASCENT}
                        >
                            {SortingMethods.ID_ASCENT}
                        </Select.Option>
                        <Select.Option
                            key={SortingMethods.UPDATED}
                        >
                            {SortingMethods.UPDATED}
                        </Select.Option>
                    </Select>
                </Col>
            </Row>
        </div>
    );
};

export default Header;
