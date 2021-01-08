// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect } from 'react';
import { AnyAction } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Modal from 'antd/lib/modal';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import RadioButton from 'antd/lib/radio/radioButton';
import Description from 'antd/lib/descriptions';
import Rate from 'antd/lib/rate';
import { Row, Col } from 'antd/lib/grid';

import UserSelector, { User } from 'components/task-page/user-selector';
import { CombinedState, ReviewStatus } from 'reducers/interfaces';
import { switchSubmitReviewDialog } from 'actions/annotation-actions';
import { submitReviewAsync } from 'actions/review-actions';
import { clamp } from 'utils/math';
import { useHistory } from 'react-router';

function computeEstimatedQuality(reviewedStates: number, openedIssues: number): number {
    if (reviewedStates === 0 && openedIssues === 0) {
        return 5; // corner case
    }

    const K = 2; // means how many reviewed states are equivalent to one issue
    const quality = reviewedStates / (reviewedStates + K * openedIssues);
    return clamp(+(5 * quality).toPrecision(2), 0, 5);
}

export default function SubmitReviewModal(): JSX.Element | null {
    const dispatch = useDispatch();
    const history = useHistory();
    const isVisible = useSelector((state: CombinedState): boolean => state.annotation.submitReviewDialogVisible);
    const job = useSelector((state: CombinedState): any => state.annotation.job.instance);
    const activeReview = useSelector((state: CombinedState): any => state.review.activeReview);
    const reviewIsBeingSubmitted = useSelector((state: CombinedState): any => state.review.fetching.reviewId);
    const numberOfIssues = useSelector((state: CombinedState): any => state.review.issues.length);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const numberOfNewIssues = activeReview ? activeReview.issues.length : 0;
    const reviewedFrames = activeReview ? activeReview.reviewedFrames.length : 0;
    const reviewedStates = activeReview ? activeReview.reviewedStates.length : 0;

    const [reviewer, setReviewer] = useState<User | null>(job.reviewer ? job.reviewer : null);
    const [reviewStatus, setReviewStatus] = useState<string>(ReviewStatus.ACCEPTED);
    const [estimatedQuality, setEstimatedQuality] = useState<number>(0);

    const close = (): AnyAction => dispatch(switchSubmitReviewDialog(false));
    const submitReview = (): void => {
        activeReview.estimatedQuality = estimatedQuality;
        activeReview.status = reviewStatus;
        if (reviewStatus === ReviewStatus.REVIEW_FURTHER) {
            activeReview.reviewer = reviewer;
        }
        dispatch(submitReviewAsync(activeReview));
    };

    useEffect(() => {
        setEstimatedQuality(computeEstimatedQuality(reviewedStates, numberOfNewIssues));
    }, [reviewedStates, numberOfNewIssues]);
    useEffect(() => {
        if (!isSubmitting && activeReview && activeReview.id === reviewIsBeingSubmitted) {
            setIsSubmitting(true);
        } else if (isSubmitting && reviewIsBeingSubmitted === null) {
            setIsSubmitting(false);
            close();
            history.push(`/tasks/${job.task.id}`);
        }
    }, [reviewIsBeingSubmitted, activeReview]);

    if (!isVisible) {
        return null;
    }

    return (
        <Modal
            className='cvat-submit-review-dialog'
            visible={isVisible}
            destroyOnClose
            confirmLoading={isSubmitting}
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
                <Col span={12}>
                    <Description title='Review summary' layout='horizontal' column={1} size='small' bordered>
                        <Description.Item label='Estimated quality: '>{estimatedQuality}</Description.Item>
                        <Description.Item label='Issues: '>
                            <Text>{numberOfIssues}</Text>
                            {!!numberOfNewIssues && <Text strong>{` (+${numberOfNewIssues})`}</Text>}
                        </Description.Item>
                        <Description.Item label='Reviewed frames '>{reviewedFrames}</Description.Item>
                        <Description.Item label='Reviewed objects: '>{reviewedStates}</Description.Item>
                    </Description>
                </Col>
                <Col span={11} offset={1}>
                    <Row>
                        <Col>
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
                            {reviewStatus === ReviewStatus.REVIEW_FURTHER && (
                                <Row align='middle' justify='start'>
                                    <Col span={7}>
                                        <Text type='secondary'>Reviewer: </Text>
                                    </Col>
                                    <Col span={16} offset={1}>
                                        <UserSelector value={reviewer} onSelect={setReviewer} />
                                    </Col>
                                </Row>
                            )}
                            <Row justify='center' align='middle'>
                                <Col>
                                    <Rate
                                        value={Math.round(estimatedQuality)}
                                        onChange={(value: number | undefined) => {
                                            if (typeof value !== 'undefined') {
                                                setEstimatedQuality(value);
                                            }
                                        }}
                                    />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Modal>
    );
}
