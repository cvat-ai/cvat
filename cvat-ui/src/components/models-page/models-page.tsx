// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import TopBarComponent from './top-bar';
import DeployedModelsList from './deployed-models-list';
import EmptyListComponent from './empty-list';
import FeedbackComponent from '../feedback/feedback';
import { Model } from '../../reducers/interfaces';

interface Props {
    interactors: Model[];
    detectors: Model[];
    trackers: Model[];
    reid: Model[];
    reidsegmentation: Model[];
}

export default function ModelsPageComponent(props: Props): JSX.Element {
    const {
        interactors,
        detectors,
        trackers,
        reid,
        reidsegmentation,
    } = props;
    console.log("reidsegmentation", reidsegmentation)
    console.log("reid", reid)
    const deployedModels = [...detectors, ...interactors, ...trackers, ...reid, ...reidsegmentation];

    return (
        <div className='cvat-models-page'>
            <TopBarComponent />
            { deployedModels.length
                ? (
                    <DeployedModelsList models={deployedModels} />
                ) : (
                    <EmptyListComponent />
                )}
            <FeedbackComponent />
        </div>
    );
}
