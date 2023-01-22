// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import ModelsPageComponent from 'components/models-page/models-page';
import { CombinedState } from 'reducers';
import { MLModel } from 'cvat-core-wrapper';

interface StateToProps {
    interactors: MLModel[];
    detectors: MLModel[];
    trackers: MLModel[];
    reid: MLModel[];
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;
    const {
        interactors, detectors, trackers, reid,
    } = models;

    return {
        interactors,
        detectors,
        trackers,
        reid,
    };
}

export default connect(mapStateToProps, {})(ModelsPageComponent);
