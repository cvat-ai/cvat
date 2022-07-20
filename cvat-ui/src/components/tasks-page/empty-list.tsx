// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { TasksQuery } from 'reducers';
import Empty from 'antd/lib/empty';

interface Props {
    query: TasksQuery;
}

function EmptyListComponent(props: Props): JSX.Element {
    const { query } = props;

    return (
        <div className='cvat-empty-tasks-list'>
            <Empty description={!query.filter && !query.search && !query.page ? (
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>No tasks created yet ...</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>To get started with your annotation project</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Link to='/tasks/create'>create a new task</Link>
                            <Text type='secondary'> or try to </Text>
                            <Link to='/projects/create'>create a new project</Link>
                        </Col>
                    </Row>
                </>
            ) : (<Text>No results matched your search</Text>)}
            />
        </div>
    );
}

export default React.memo(EmptyListComponent);
