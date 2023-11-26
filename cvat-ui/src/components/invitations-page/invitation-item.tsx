// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useState } from 'react';
import { Col, Row } from 'antd/lib/grid';
import Card from 'antd/lib/card';

interface Props {
    job: Job;
    task: Task;
    onJobUpdate: (job: Job) => void;
}

function JobItem(props: Props): JSX.Element {
    return (
        <Col span={24}>
            <Card className='cvat-job-item' style={{ ...style }} data-row-id={job.id}>
            </Card>
        </Col>
    );
}

export default React.memo(JobItem);
