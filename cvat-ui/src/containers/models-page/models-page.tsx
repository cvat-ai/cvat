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
    interactors: Model[];
    detectors: Model[];
    trackers: Model[];
    reid: Model[];
    reidsegmentation: Model[];
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { models } = state;
    const {
        interactors,
        detectors,
        trackers,
        reid,
        reidsegmentation,
    } = models;

    return {
        interactors,
        detectors,
        trackers,
        reid,
        reidsegmentation,
    };
}

export default connect(
    mapStateToProps, {},
)(ModelsPageComponent);
