import React from 'react';
import { connect } from 'react-redux';

import ModelsPageComponent from '../../components/models-page/models-page';
import { CombinedState } from '../../reducers/root-reducer';
import { Model } from '../../reducers/interfaces';
import { getModelsAsync, deleteModelAsync } from '../../actions/models-actions';

interface StateToProps {
    installedAutoAnnotation: boolean;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    modelsAreBeingFetched: boolean;
    modelsFetchingError: any;
    models: Model[];
    registeredUsers: any[];
}

interface DispatchToProps {
    getModels(OpenVINO: boolean, RCNN: boolean, MaskRCNN: boolean): void;
    deleteModel(id: number): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { plugins } = state.plugins;
    const { models } = state;

    return {
        installedAutoAnnotation: plugins.AUTO_ANNOTATION,
        installedTFAnnotation: plugins.TF_ANNOTATION,
        installedTFSegmentation: plugins.TF_SEGMENTATION,
        modelsAreBeingFetched: !models.initialized,
        modelsFetchingError: models.fetchingError,
        models: models.models,
        registeredUsers: state.users.users,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getModels(OpenVINO: boolean, RCNN: boolean, MaskRCNN: boolean) {
            dispatch(getModelsAsync(OpenVINO, RCNN, MaskRCNN));
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
                modelsAreBeingFetched={props.modelsAreBeingFetched}
                modelsFetchingError={props.modelsFetchingError}
                registeredUsers={props.registeredUsers}
                models={props.models}
                getModels={props.getModels.bind(
                    null,
                    props.installedAutoAnnotation,
                    props.installedTFAnnotation,
                    props.installedTFSegmentation
                )}
                deleteModel={props.deleteModel}
            /> : null
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelsPageContainer);
