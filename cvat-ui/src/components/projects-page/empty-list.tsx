// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';
import { useTranslation } from 'react-i18next';

interface Props {
    notFound: boolean;
}

export default function EmptyListComponent(props: Props): JSX.Element {
    const { notFound } = props;
    const { t } = useTranslation('base');
    const { t: tSearch } = useTranslation('base', { keyPrefix: 'search' });
    const items = t('Projects');

    return (
        <div className='cvat-empty-projects-list'>
            <Empty description={notFound ? (
                <Text strong>{tSearch('empty')}</Text>
            ) : (
                <>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text strong>{tSearch('no_created', { items })}</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Text type='secondary'>{tSearch('description')}</Text>
                        </Col>
                    </Row>
                    <Row justify='center' align='middle'>
                        <Col>
                            <Link to='/projects/create'>{tSearch('create')}</Link>
                        </Col>
                    </Row>
                </>
            )}
            />
        </div>
    );
}
