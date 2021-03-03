// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { AnyAction } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Modal from 'antd/lib/modal';
import { Row, Col } from 'antd/lib/grid';

import UserSelector, { User } from 'components/task-page/user-selector';
import { CombinedState, TaskStatus } from 'reducers/interfaces';
import { switchRequestReviewDialog } from 'actions/annotation-actions';
import { updateJobAsync } from 'actions/tasks-actions';

export default function RequestReviewModal(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const isVisible = useSelector((state: CombinedState): boolean => state.annotation.requestReviewDialogVisible);
    const job = useSelector((state: CombinedState): any => state.annotation.job.instance);
    const [reviewer, setReviewer] = useState<User | null>(job.reviewer ? job.reviewer : null);
    const close = (): AnyAction => dispatch(switchRequestReviewDialog(false));
    const submitAnnotations = (): void => {
        job.reviewer = reviewer;
        job.status = TaskStatus.REVIEW;
        dispatch(updateJobAsync(job));
        history.push(`/tasks/${job.task.id}`);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <Modal
            className='cvat-request-review-dialog'
            visible={isVisible}
            destroyOnClose
            onCancel={close}
            onOk={submitAnnotations}
            okText='Submit'
        >
            <Row justify='start'>
                <Col>
                    <Title level={4}>Assign a user who is responsible for review</Title>
                </Col>
            </Row>
            <Row align='middle' justify='start'>
                <Col>
                    <Text type='secondary'>Reviewer: </Text>
                </Col>
                <Col offset={1}>
                    <UserSelector value={reviewer} onSelect={setReviewer} />
                </Col>
            </Row>
            <Row justify='start'>
                <Text type='secondary'>You might not be able to change the job after this action. Continue?</Text>
            </Row>
        </Modal>
    );
}
