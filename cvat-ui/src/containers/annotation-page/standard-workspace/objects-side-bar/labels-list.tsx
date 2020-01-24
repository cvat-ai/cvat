import React from 'react';
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
            job: {
                labels,
            },
            tabContentHeight: listHeight,
        },
    } = state;

    return {
        labelIDs: labels.map((label: any): number => label.id),
        listHeight,
    };
}

function LabelsListContainer(props: StateToProps): JSX.Element {
    return (
        <LabelsListComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
)(LabelsListContainer);
