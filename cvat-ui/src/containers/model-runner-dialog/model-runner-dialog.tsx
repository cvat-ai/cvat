// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import ModelRunnerModalComponent from 'components/model-runner-modal/model-runner-modal';
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
    modelsFetching: boolean;
    modelsInitialized: boolean;
    models: Model[];
    activeProcesses: {
        [index: string]: string;
    };
    taskInstance: any;
    visible: boolean;
}

interface DispatchToProps {
    runInference(
        taskInstance: any,
        model: Model,
        mapping: {
            [index: string]: string;
        },
        cleanOut: boolean,
    ): void;
    getModels(): void;
    closeDialog(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;

    return {
        modelsFetching: models.fetching,
        modelsInitialized: models.initialized,
        models: models.models,
        activeProcesses: {},
        taskInstance: models.activeRunTask,
        visible: models.visibleRunWindows,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return ({
        runInference(
            taskInstance: any,
            model: Model,
            mapping: {
                [index: string]: string;
            },
            cleanOut: boolean,
        ): void {
            dispatch(startInferenceAsync(taskInstance, model, mapping, cleanOut));
        },
        getModels(): void {
            dispatch(getModelsAsync());
        },
        closeDialog(): void {
            dispatch(modelsActions.closeRunModelDialog());
        },
    });
}


function ModelRunnerModalContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <ModelRunnerModalComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelRunnerModalContainer);
