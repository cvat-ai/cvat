// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

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
        body: object,
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
            body: object,
        ): void {
            dispatch(startInferenceAsync(taskInstance, model, body));
        },
        getModels(): void {
            dispatch(getModelsAsync());
        },
        closeDialog(): void {
            dispatch(modelsActions.closeRunModelDialog());
        },
    });
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelRunnerModalComponent);
