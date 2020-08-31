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
    deployedModels: Model[];
}

export default function ModelsPageComponent(props: Props): JSX.Element {
    const { deployedModels } = props;

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
