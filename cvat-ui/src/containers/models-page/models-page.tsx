import React from 'react';
import { connect } from 'react-redux';

import ModelsPageComponent from '../../components/models-page/models-page';
import { CombinedState } from '../../reducers/root-reducer';
import { Model } from '../../reducers/interfaces';
import { getModelsAsync } from '../../actions/models-actions';

interface StateToProps {
    installedAutoAnnotation: boolean;
    installedTFAnnotation: boolean;
    installedTFSegmentation: boolean;
    modelsAreBeingFetched: boolean;
    modelsFetchingError: any;
    models: Model[];
}

interface DispatchToProps {
    getModels(OpenVINO: boolean, RCNN: boolean, MaskRCNN: boolean): void;
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
    }
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        getModels(OpenVINO: boolean, RCNN: boolean, MaskRCNN: boolean) {
            dispatch(getModelsAsync(OpenVINO, RCNN, MaskRCNN));
        }
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
                models={props.models}
                getModels={props.getModels.bind(
                    null,
                    props.installedAutoAnnotation,
                    props.installedTFAnnotation,
                    props.installedTFSegmentation
                )}
            /> : null
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ModelsPageContainer);
