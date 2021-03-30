// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { PlusOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';

import SearchTooltip from 'components/search-tooltip/search-tooltip';

interface VisibleTopBarProps {
    onSearch: (value: string) => void;
    searchValue: string;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const { searchValue, onSearch } = props;

    const history = useHistory();

    return (
        <>
            <Row justify='center' align='middle'>
                <Col md={11} lg={9} xl={8} xxl={7}>
                    <Text className='cvat-title'>Tasks</Text>
                    <SearchTooltip instance='task'>
                        <Input.Search
                            className='cvat-task-page-search-task'
                            defaultValue={searchValue}
                            onSearch={onSearch}
                            size='large'
                            placeholder='Search'
                        />
                    </SearchTooltip>
                </Col>
                <Col md={{ span: 11 }} lg={{ span: 9 }} xl={{ span: 8 }} xxl={{ span: 7 }}>
                    <Button
                        size='large'
                        id='cvat-create-task-button'
                        type='primary'
                        onClick={(): void => history.push('/tasks/create')}
                        icon={<PlusOutlined />}
                    >
                        Create new task
                    </Button>
                </Col>
            </Row>
        </>
    );
}
