// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';

import { EmptyTasksIcon } from 'icons';

interface Props {
    notFound?: boolean;
}

export default function EmptyListComponent(props: Props): JSX.Element {
    const { notFound } = props;
    return (
        <div className='cvat-empty-projects-list'>
            <Row type='flex' justify='center' align='middle'>
                <Col>
                    <Icon className='cvat-empty-projects-icon' component={EmptyTasksIcon} />
                </Col>
            </Row>
            {notFound ? (
                <Row type='flex' justify='center' align='middle'>
                    <Col>
                        <Text strong>No results matched your search...</Text>
                    </Col>
                </Row>
            ) : (
                <>
                    <Row type='flex' justify='center' align='middle'>
                        <Col>
                            <Text strong>No projects created yet ...</Text>
                        </Col>
                    </Row>
                    <Row type='flex' justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>To get started with your annotation project</Text>
                        </Col>
                    </Row>
                    <Row type='flex' justify='center' align='middle'>
                        <Col>
                            <Link to='/projects/create'>create a new one</Link>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
}
