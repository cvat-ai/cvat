// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import Layout from 'antd/lib/layout';
import { useDispatch, useSelector } from 'react-redux';

import { CombinedState } from 'reducers/interfaces';
import { initializeReviewAsync } from 'actions/review-actions';

import CanvasWrapperContainer from 'containers/annotation-page/canvas/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/review-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import ObjectsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-list';
import CanvasContextMenuContainer from 'containers/annotation-page/canvas/canvas-context-menu';
import IssueAggregatorComponent from 'components/annotation-page/review/issues-aggregator';

export default function ReviewWorkspaceComponent(): JSX.Element {
    const dispatch = useDispatch();
    const frame = useSelector((state: CombinedState): number => state.annotation.player.frame.number);
    const states = useSelector((state: CombinedState): any[] => state.annotation.annotations.states);
    const review = useSelector((state: CombinedState): any => state.review.activeReview);

    useEffect(() => {
        if (review) {
            review.reviewFrame(frame);
            review.reviewStates(
                states
                    .map((state: any): number | undefined => state.serverID)
                    .filter((serverID: number | undefined): boolean => typeof serverID !== 'undefined')
                    .map((serverID: number | undefined): string => `${frame}_${serverID}`),
            );
        }
    }, [frame, states, review]);
    useEffect(() => {
        dispatch(initializeReviewAsync());
    }, []);

    return (
        <Layout hasSider className='cvat-review-workspace'>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
            <ObjectSideBarComponent objectsList={<ObjectsListContainer readonly />} />
            <CanvasContextMenuContainer readonly />
            <IssueAggregatorComponent />
        </Layout>
    );
}
