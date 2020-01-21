import React from 'react';
import { connect } from 'react-redux';

import ObjectsBlockComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-block';
import { CombinedState } from 'reducers/interfaces';
import { annotationsUpdated } from 'actions/annotation-actions';

interface OwnProps {
    height: number;
}

interface StateToProps {
    annotations: any[];
    labels: any[];
}

interface DispatchToProps {
    onAnnotationsUpdated(annotations: any[]): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { annotation } = state;

    return {
        annotations: annotation.annotations,
        labels: annotation.jobInstance.task.labels,
    };
}

function mapDispatchToProps(): DispatchToProps {
    return {
        onAnnotationsUpdated(annotations: []): void {
            annotationsUpdated(annotations);
        },
    };
}

function AppearanceSettingsContainer(
    props: StateToProps & DispatchToProps,
    own: OwnProps,
): JSX.Element {
    return (
        <ObjectsBlockComponent {...own} {...props} />
    );
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(AppearanceSettingsContainer);
