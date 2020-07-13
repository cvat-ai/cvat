// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import ModelsPageComponent from 'components/models-page/models-page';
import {
    Model,
    CombinedState,
} from 'reducers/interfaces';
import { getModelsAsync } from 'actions/models-actions';

interface StateToProps {
    modelsInitialized: boolean;
    modelsFetching: boolean;
    deployedModels: Model[];
}

interface DispatchToProps {
    getModels(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;

    return {
        modelsInitialized: models.initialized,
        modelsFetching: models.fetching,
        deployedModels: models.models,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getModels(): void {
            dispatch(getModelsAsync());
        },
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelsPageComponent);
