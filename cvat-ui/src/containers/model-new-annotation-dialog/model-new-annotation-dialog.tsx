// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

// import ModelRunnerModalComponent from 'components/model-runner-modal/model-runner-modal';
import ModelNewAnnotationModalComponent from 'components/model-new-annotation-modal/model-new-annotation-modal';
import {
    Model,
    CombinedState,
} from 'reducers/interfaces';
import {
    getModelsAsync,
    startInferenceAsync,
    modelsActions,
} from 'actions/models-actions';


interface StateToProps {
    taskInstance: any;
    visible: boolean;
    baseModelList: string[];
}

interface DispatchToProps {
    closeDialog(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;

    return {
        taskInstance: models.activeNewAnnotationTask,
        visible: models.visibleNewAnnotationWindows,
        baseModelList: models.baseModelList,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return ({
        closeDialog(): void {
            dispatch(modelsActions.closeNewAnnotationDialog());
        },
    });
}


function ModelNewAnnotationModalContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <ModelNewAnnotationModalComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelNewAnnotationModalContainer);
