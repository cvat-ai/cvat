import React from 'react';
import { connect } from 'react-redux';

import ModelRunnerModalComponent from '../../components/model-runner-modal/model-runner-modal';
import {
    Model,
    CombinedState,
} from '../../reducers/interfaces';
import {
    getModelsAsync,
    inferModelAsync,
    closeRunModelDialog,
} from '../../actions/models-actions';


interface StateToProps {
    modelsFetching: boolean;
    modelsInitialized: boolean;
    models: Model[];
    activeProcesses: {
        [index: string]: string
    };
    taskInstance: any;
    visible: boolean;
}

interface DispatchToProps {
    inferModelAsync(
        taskInstance: any,
        model: Model,
        mapping: {
            [index: string]: string
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
        inferModelAsync(
            taskInstance: any,
            model: Model,
            mapping: {
                [index: string]: string
            },
            cleanOut: boolean): void {
                dispatch(inferModelAsync(taskInstance, model, mapping, cleanOut));
        },
        getModels(): void {
            dispatch(getModelsAsync());
        },
        closeDialog(): void {
            dispatch(closeRunModelDialog());
        }
    });
}


function ModelRunnerModalContainer(props: StateToProps & DispatchToProps) {
    return (
        <ModelRunnerModalComponent
            modelsFetching={props.modelsFetching}
            modelsInitialized={props.modelsInitialized}
            models={props.models}
            activeProcesses={props.activeProcesses}
            visible={props.visible}
            taskInstance={props.taskInstance}
            getModels={props.getModels}
            closeDialog={props.closeDialog}
            runInference={props.inferModelAsync}
        />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
) (ModelRunnerModalContainer);
