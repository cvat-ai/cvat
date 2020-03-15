// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import CreateModelPageComponent from 'components/create-model-page/create-model-page';
import { createModelAsync } from 'actions/models-actions';
import {
    ModelFiles,
    CombinedState,
} from 'reducers/interfaces';

interface StateToProps {
    isAdmin: boolean;
    modelCreatingStatus: string;
}

interface DispatchToProps {
    createModel(name: string, files: ModelFiles, global: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;

    return {
        isAdmin: state.auth.user.isAdmin,
        modelCreatingStatus: models.creatingStatus,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        createModel(name: string, files: ModelFiles, global: boolean): void {
            dispatch(createModelAsync(name, files, global));
        },
    };
}

function CreateModelPageContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <CreateModelPageComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CreateModelPageContainer);
