// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Spin from 'antd/lib/spin';

import TopBarComponent from './top-bar';
import DeployedModelsList from './deployed-models-list';
import EmptyListComponent from './empty-list';
import FeedbackComponent from '../feedback/feedback';
import { Model } from '../../reducers/interfaces';

interface Props {
    modelsInitialized: boolean;
    modelsFetching: boolean;
    deployedModels: Model[];
    getModels(): void;
}

export default function ModelsPageComponent(props: Props): JSX.Element {
    const {
        modelsInitialized,
        modelsFetching,
        deployedModels,
    } = props;

    if (!modelsInitialized) {
        if (!modelsFetching) {
            props.getModels();
        }
        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }

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
