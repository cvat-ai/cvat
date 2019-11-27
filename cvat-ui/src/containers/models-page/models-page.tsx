import React from 'react';
import { connect } from 'react-redux';

import ModelsPageComponent from '../../components/models-page/models-page';
import {
    Model,
    CombinedState,
} from '../../reducers/interfaces';
import {
    getModelsAsync,
    deleteModelAsync,
} from '../../actions/models-actions';

interface StateToProps {
    installedAutoAnnotation: boolean;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    modelsInitialized: boolean;
    modelsFetching: boolean;
    models: Model[];
    registeredUsers: any[];
}

interface DispatchToProps {
    getModels(): void;
    deleteModel(id: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state.plugins;
    const { models } = state;

    return {
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedTFSegmentation: plugins.TF_SEGMENTATION,
        modelsInitialized: models.initialized,
        modelsFetching: models.fetching,
        models: models.models,
        registeredUsers: state.users.users,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getModels() {
            dispatch(getModelsAsync());
        },
        deleteModel(id: number) {
            dispatch(deleteModelAsync(id));
        },
    };
}

function ModelsPageContainer(props: DispatchToProps & StateToProps) {
    const render = props.installedAutoAnnotation
        || props.installedTFAnnotation
        || props.installedTFSegmentation;

    return (
        render ?
            <ModelsPageComponent
                installedAutoAnnotation={props.installedAutoAnnotation}
                installedTFSegmentation={props.installedTFSegmentation}
                installedTFAnnotation={props.installedTFAnnotation}
                modelsInitialized={props.modelsInitialized}
                modelsFetching={props.modelsFetching}
                registeredUsers={props.registeredUsers}
                models={props.models}
                getModels={props.getModels}
                deleteModel={props.deleteModel}
            /> : null
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelsPageContainer);
