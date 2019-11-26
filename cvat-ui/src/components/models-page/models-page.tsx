import React from 'react';

import {
    Spin,
} from 'antd';

import TopBarComponent from './top-bar';
import UploadedModelsList from './uploaded-models-list';
import BuiltModelsList from './built-models-list';
import EmptyListComponent from './empty-list';
import { Model } from '../../reducers/interfaces';

interface Props {
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    modelsAreBeingFetched: boolean;
    modelsFetchingError: any;
    registeredUsers: any[];
    models: Model[];
    getModels(): void;
    deleteModel(id: number): void;
}

export default function ModelsPageComponent(props: Props) {
    if (props.modelsAreBeingFetched) {
        props.getModels();
        return (
            <Spin size='large' style={{margin: '25% 45%'}}/>
        );
    } else {
        const uploadedModels = props.models.filter((model) => model.id !== null);
        const integratedModels = props.models.filter((model) => model.id === null);

        return (
            <div className='cvat-models-page'>
                <TopBarComponent installedAutoAnnotation={props.installedAutoAnnotation}/>
                { integratedModels.length ?
                    <BuiltModelsList models={integratedModels}/> : null }
                { uploadedModels.length &&
                    <UploadedModelsList
                        registeredUsers={props.registeredUsers}
                        models={uploadedModels}
                        deleteModel={props.deleteModel}
                    />
                } { props.installedAutoAnnotation &&
                    !props.installedTFAnnotation &&
                    !props.installedTFSegmentation &&
                    <EmptyListComponent/>
                }
            </div>
        );
    }
}
