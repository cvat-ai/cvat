import React from 'react';

import {
    Spin,
} from 'antd';

import TopBarComponent from './top-bar';
import UploadedModelsList from './uploaded-models-list';
import BuiltModelsList from './built-models-list';
import EmptyListComponent from './empty-list';
import FeedbackComponent from '../feedback';
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

function getModels(models: Model[]) {
    const uploadedModels: Model[] = [];
    const integratedModels: Model[] = [];
    for (const model of models) {
        if (model.id !== null) {
            uploadedModels.push(model);
        } else {
            integratedModels.push(model);
        }
    }
    return [uploadedModels, integratedModels]
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

    if (!modelsInitialized && !modelsFetching) {
        props.getModels();
        return (
            <Spin size='large' style={{ margin: '25% 45%' }} />
        );
    }

    const [uploadedModels, integratedModels] = getModels(models);

    return (
        <div className='cvat-models-page'>
            <TopBarComponent installedAutoAnnotation={installedAutoAnnotation} />
            { !!uploadedModels.length && (
                <>
                    <BuiltModelsList models={integratedModels} />
                    <UploadedModelsList
                        registeredUsers={registeredUsers}
                        models={uploadedModels}
                        deleteModel={deleteModel}
                    />
                </>
            )}
            { installedAutoAnnotation
                && !uploadedModels.length
                && !installedTFAnnotation
                && !installedTFSegmentation
                && <EmptyListComponent />
            }
            <FeedbackComponent />
        </div>
    );
}
