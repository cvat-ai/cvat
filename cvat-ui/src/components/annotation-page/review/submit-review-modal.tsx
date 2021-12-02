// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { AnyAction } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Modal from 'antd/lib/modal';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import RadioButton from 'antd/lib/radio/radioButton';
import { Row, Col } from 'antd/lib/grid';

import UserSelector, { User } from 'components/task-page/user-selector';
import { CombinedState, ReviewStatus } from 'reducers/interfaces';
import { switchSubmitReviewDialog } from 'actions/annotation-actions';
import { submitReviewAsync } from 'actions/review-actions';
import getCore from 'cvat-core-wrapper';

const core = getCore();

export default function SubmitReviewModal(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const isVisible = useSelector((state: CombinedState): boolean => state.annotation.submitReviewDialogVisible);
    const job = useSelector((state: CombinedState): any => state.annotation.job.instance);
    const [assignee, setAssignee] = useState<User | null>(job.assignee ? job.assignee : null);
    const [jobState, setJobState] = useState<string>(core.enums.JobState.COMPLETED);
    const [jobStage, setJobStage] = useState<string>(core.enums.JobStage.ACCEPTANCE);
    const [reviewStatus, setReviewStatus] = useState<string>(ReviewStatus.ACCEPTED);
    const submittingJobReview = useSelector((state: CombinedState): number | null => state.review.fetching.jobId);

    const close = (): AnyAction => dispatch(switchSubmitReviewDialog(false));
    const submitReview = (): void => {
        dispatch(
            submitReviewAsync(
                assignee, jobState, jobStage, () => history.push(`/tasks/${job.taskId}`),
            ),
        );
    };

    useEffect(() => {
        if (reviewStatus === ReviewStatus.ACCEPTED) {
            setJobState(core.enums.JobState.COMPLETED);
            setJobStage(core.enums.JobStage.ACCEPTANCE);
        } else if (reviewStatus === ReviewStatus.REJECTED) {
            setJobState(core.enums.JobState.REJECTED);
            setJobStage(core.enums.JobStage.ANNOTATION);
        } else if (reviewStatus === ReviewStatus.REVIEW_FURTHER) {
            setJobState(core.enums.JobState.IN_PROGRESS);
            setJobStage(core.enums.JobStage.VALIDATION);
        }
    }, [reviewStatus]);

    if (!isVisible) {
        return null;
    }

    return (
        <Modal
            className='cvat-submit-review-dialog'
            visible={isVisible}
            destroyOnClose
            confirmLoading={typeof submittingJobReview === 'number'}
            onOk={submitReview}
            onCancel={close}
            okText='Submit'
            width={650}
        >
            <Row justify='start'>
                <Col>
                    <Title level={4}>Submitting your review</Title>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Row>
                        <Radio.Group
                            value={reviewStatus}
                            onChange={(event: RadioChangeEvent) => {
                                if (typeof event.target.value !== 'undefined') {
                                    setReviewStatus(event.target.value);
                                }
                            }}
                        >
                            <RadioButton value={ReviewStatus.ACCEPTED}>Accept</RadioButton>
                            <RadioButton value={ReviewStatus.REVIEW_FURTHER}>Review next</RadioButton>
                            <RadioButton value={ReviewStatus.REJECTED}>Reject</RadioButton>
                        </Radio.Group>
                    </Row>
                    <Row align='middle' justify='start'>
                        <Col>
                            <Text type='secondary'>Next assignee: </Text>
                        </Col>
                        <Col offset={1}>
                            <UserSelector value={assignee} onSelect={setAssignee} />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Modal>
    );
}
