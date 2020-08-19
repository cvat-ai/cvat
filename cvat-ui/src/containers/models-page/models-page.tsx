// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import ModelsPageComponent from 'components/models-page/models-page';
import {
    Model,
    CombinedState,
} from 'reducers/interfaces';

interface StateToProps {
    deployedModels: Model[];
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;

    return {
        deployedModels: models.models,
    };
}

export default connect(
    mapStateToProps, {},
)(ModelsPageComponent);
