// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import CreateOrganizationForm from './create-organization-form';

function CreateOrganizationComponent(): JSX.Element {
    return (
        <Row justify='center' align='top' className='cvat-create-organization-page'>
            <Col md={20} lg={16} xl={14} xxl={9}>
                <Text className='cvat-title'>Create a new organization</Text>
                <CreateOrganizationForm />
            </Col>
        </Row>
    );
}

export default React.memo(CreateOrganizationComponent);
