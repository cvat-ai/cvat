// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import LabelsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/labels-list';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    labelIDs: number[];
    listHeight: number;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: { labels },
            tabContentHeight: listHeight,
        },
    } = state;

    return {
        labelIDs: labels.map((label: any): number => label.id),
        listHeight,
    };
}

export default connect(mapStateToProps)(LabelsListComponent);
