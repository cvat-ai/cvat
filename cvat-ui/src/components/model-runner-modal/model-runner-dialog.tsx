// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { connect } from 'react-redux';
import Modal from 'antd/lib/modal';

import { ThunkDispatch } from 'utils/redux';
import { modelsActions, startInferenceAsync } from 'actions/models-actions';
import { CombinedState } from 'reducers';
import MLModel from 'cvat-core/src/ml-model';
import DetectorRunner from './detector-runner';

interface StateToProps {
    visible: boolean;
    task: any;
    detectors: MLModel[];
    reid: MLModel[];
    classifiers: MLModel[];
}

interface DispatchToProps {
    runInference(task: any, model: MLModel, body: object): void;
    closeDialog(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;
    const { detectors, reid, classifiers } = models;

    return {
        visible: models.modelRunnerIsVisible,
        task: models.modelRunnerTask,
        reid,
        detectors,
        classifiers,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        runInference(taskID: number, model: MLModel, body: object) {
            dispatch(startInferenceAsync(taskID, model, body));
        },
        closeDialog() {
            dispatch(modelsActions.closeRunModelDialog());
        },
    };
}

function ModelRunnerDialog(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        reid, detectors, classifiers, task, visible, runInference, closeDialog,
    } = props;

    const models = [...reid, ...detectors, ...classifiers];

    return (
        <Modal
            destroyOnClose
            visible={visible}
            footer={[]}
            onCancel={(): void => closeDialog()}
            maskClosable
            title='Automatic annotation'
        >
            { task ? (
                <DetectorRunner
                    withCleanup
                    models={models}
                    labels={task.labels}
                    dimension={task.dimension}
                    runInference={(...args) => {
                        closeDialog();
                        runInference(task.id, ...args);
                    }}
                />
            ) : null }
        </Modal>
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ModelRunnerDialog);
