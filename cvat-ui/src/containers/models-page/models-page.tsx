// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import ModelsPageComponent from 'components/models-page/models-page';
import {
    Model,
    CombinedState,
} from 'reducers/interfaces';
import {
    getModelsAsync,
    deleteModelAsync,
} from 'actions/models-actions';

interface StateToProps {
    installedAutoAnnotation: boolean;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    modelsInitialized: boolean;
    modelsFetching: boolean;
    models: Model[];
    registeredUsers: any[];
}

interface DispatchToProps {
    getModels(): void;
    deleteModel(id: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { list } = state.plugins;
    const { models } = state;

    return {
        installedAutoAnnotation: list.AUTO_ANNOTATION,
        installedTFAnnotation: list.TF_ANNOTATION,
        installedTFSegmentation: list.TF_SEGMENTATION,
        modelsInitialized: models.initialized,
        modelsFetching: models.fetching,
        models: models.models,
        registeredUsers: state.users.users,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getModels(): void {
            dispatch(getModelsAsync());
        },
        deleteModel(id: number): void {
            dispatch(deleteModelAsync(id));
        },
    };
}

function ModelsPageContainer(props: DispatchToProps & StateToProps): JSX.Element | null {
    const {
        installedAutoAnnotation,
        installedTFSegmentation,
        installedTFAnnotation,
    } = props;

    const render = installedAutoAnnotation
        || installedTFAnnotation
        || installedTFSegmentation;

    return (
        render ? <ModelsPageComponent {...props} /> : null
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelsPageContainer);
