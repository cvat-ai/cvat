// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useEffect } from 'react';
import Layout from 'antd/lib/layout';
import { useDispatch } from 'react-redux';

import { initializeReviewAsync } from 'actions/review-actions';

import CanvasWrapperContainer from 'containers/annotation-page/canvas/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/review-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import ObjectsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-list';
import CanvasContextMenuContainer from 'containers/annotation-page/canvas/canvas-context-menu';
import IssueAggregatorComponent from 'components/annotation-page/review/issues-aggregator';

export default function ReviewWorkspaceComponent(): JSX.Element {
    const dispatch = useDispatch();
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
