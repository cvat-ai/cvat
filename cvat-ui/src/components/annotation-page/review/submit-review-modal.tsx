// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { AnyAction } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import Title from 'antd/lib/typography/Title';
import Modal from 'antd/lib/modal';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import RadioButton from 'antd/lib/radio/radioButton';
import { Row, Col } from 'antd/lib/grid';

import { CombinedState, ReviewStatus } from 'reducers/interfaces';
import { switchSubmitReviewDialog } from 'actions/annotation-actions';
import { updateJobAsync } from 'actions/tasks-actions';
import getCore from 'cvat-core-wrapper';

const core = getCore();

export default function SubmitReviewModal(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const isVisible = useSelector((state: CombinedState): boolean => state.annotation.submitReviewDialogVisible);
    const job = useSelector((state: CombinedState): any => state.annotation.job.instance);
    const [jobState, setJobState] = useState<string>(core.enums.JobState.COMPLETED);
    const [reviewStatus, setReviewStatus] = useState<string>(ReviewStatus.ACCEPTED);
    const submittingJobReview = useSelector((state: CombinedState): number | null => state.review.fetching.jobId);

    const close = (): AnyAction => dispatch(switchSubmitReviewDialog(false));
    const submitReview = (): void => {
        job.state = jobState;
        dispatch(updateJobAsync(job));
        history.push(`/tasks/${job.taskId}`);
    };

    useEffect(() => {
        if (reviewStatus === ReviewStatus.ACCEPTED) {
            setJobState(core.enums.JobState.COMPLETED);
        } else if (reviewStatus === ReviewStatus.REJECTED) {
            setJobState(core.enums.JobState.REJECTED);
        } else if (reviewStatus === ReviewStatus.REVIEW_FURTHER) {
            setJobState(core.enums.JobState.IN_PROGRESS);
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
            width={320}
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
                </Col>
            </Row>
        </Modal>
    );
}
