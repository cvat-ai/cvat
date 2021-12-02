// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { connect } from 'react-redux';
import Modal from 'antd/lib/modal';

import { ThunkDispatch } from 'utils/redux';
import { modelsActions, startInferenceAsync } from 'actions/models-actions';
import { Model, CombinedState } from 'reducers/interfaces';
import DetectorRunner from './detector-runner';

interface StateToProps {
    visible: boolean;
    task: any;
    detectors: Model[];
    reid: Model[];
}

interface DispatchToProps {
    runInference(task: any, model: Model, body: object): void;
    closeDialog(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;
    const { detectors, reid } = models;

    return {
        visible: models.modelRunnerIsVisible,
        task: models.modelRunnerTask,
        reid,
        detectors,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        runInference(taskID: number, model: Model, body: object) {
            dispatch(startInferenceAsync(taskID, model, body));
        },
        closeDialog() {
            dispatch(modelsActions.closeRunModelDialog());
        },
    };
}

function ModelRunnerDialog(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        reid, detectors, task, visible, runInference, closeDialog,
    } = props;

    const models = [...reid, ...detectors];

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
