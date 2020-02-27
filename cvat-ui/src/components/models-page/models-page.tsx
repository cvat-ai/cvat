// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';

import {
    Spin,
} from 'antd';

import TopBarComponent from './top-bar';
import UploadedModelsList from './uploaded-models-list';
import BuiltModelsList from './built-models-list';
import EmptyListComponent from './empty-list';
import FeedbackComponent from '../feedback/feedback';
import { Model } from '../../reducers/interfaces';

interface Props {
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    modelsInitialized: boolean;
    modelsFetching: boolean;
    registeredUsers: any[];
    models: Model[];
    getModels(): void;
    deleteModel(id: number): void;
}

export default function ModelsPageComponent(props: Props): JSX.Element {
    const {
        installedAutoAnnotation,
        installedTFSegmentation,
        installedTFAnnotation,
        modelsInitialized,
        modelsFetching,
        registeredUsers,
        models,

        deleteModel,
    } = props;

    if (!modelsInitialized) {
        if (!modelsFetching) {
            props.getModels();
        }
        return (
            <Spin size='large' className='cvat-spinner' />
        );
    }

    const uploadedModels = models.filter((model): boolean => model.id !== null);
    const integratedModels = models.filter((model): boolean => model.id === null);

    return (
        <div className='cvat-models-page'>
            <TopBarComponent installedAutoAnnotation={installedAutoAnnotation} />
            { !!integratedModels.length
                && <BuiltModelsList models={integratedModels} />}
            { !!uploadedModels.length && (
                <UploadedModelsList
                    registeredUsers={registeredUsers}
                    models={uploadedModels}
                    deleteModel={deleteModel}
                />
            )}
            { installedAutoAnnotation
                && !uploadedModels.length
                && !installedTFAnnotation
                && !installedTFSegmentation
                && <EmptyListComponent />}
            <FeedbackComponent />
        </div>
    );
}
