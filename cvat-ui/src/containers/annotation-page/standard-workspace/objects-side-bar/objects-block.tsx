import React from 'react';
import { connect } from 'react-redux';

import ObjectsBlockComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-block';
import { CombinedState } from 'reducers/interfaces';
import {
    annotationsUpdated,
    changeLabelColor,
} from 'actions/annotation-actions';

interface OwnProps {
    listHeight: number;
}

interface StateToProps {
    annotations: any[];
    labels: any[];
    colors: string[];
}

interface DispatchToProps {
    onAnnotationsUpdated(annotations: any[]): void;
    onChangeLabelColor(label: any, color: string): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: annotations,
                colors,
            },
            job: {
                instance: {
                    task: {
                        labels,
                    },
                },
            },
        },
    } = state;

    return {
        annotations,
        labels,
        colors,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onAnnotationsUpdated(annotations: []): void {
            dispatch(annotationsUpdated(annotations));
        },
        onChangeLabelColor(label: any, color: string): void {
            dispatch(changeLabelColor(label, color));
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
