// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';

import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';

import { Task } from 'cvat-core-wrapper';

interface Props {
    instance: Task;
    onChange: (agreementScoreThreshold: number) => void;
}

export default function ConsensusConfigurationEditorComponent(props: Props): JSX.Element {
    const { instance, onChange } = props;

    const [agreementScoreThreshold, setAgreementScoreThreshold] = useState(instance.agreementScoreThreshold);

    const onChangeValue = (value: string): void => {
        const val = parseFloat(value);
        setAgreementScoreThreshold(val);
        onChange(val);
    };

    return (
        <Row className='cvat-issue-tracker'>
            <Col>
                <Text strong className='cvat-text-color'>
                    Agreement Score Threshold
                </Text>
                <Text editable={{ onChange: onChangeValue }} className='cvat-issue-tracker-value'>
                    {agreementScoreThreshold}
                </Text>
            </Col>
        </Row>
    );
}
