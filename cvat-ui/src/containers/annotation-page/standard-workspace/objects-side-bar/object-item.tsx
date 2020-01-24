import React from 'react';
import { connect } from 'react-redux';
import {
    CombinedState,
} from 'reducers/interfaces';
import {
    collapseObjectItems,
    updateAnnotationsAsync,
} from 'actions/annotation-actions';

import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';

interface OwnProps {
    clientID: number;
}

interface StateToProps {
    objectState: any;
    collapsed: boolean;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    frameNumber: number;
}

interface DispatchToProps {
    updateState(sessionInstance: any, frameNumber: number, objectState: any): void;
    collapseOrExpand(objectStates: any[], collapsed: boolean): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                states,
                collapsed: statesCollapsed,
            },
            job: {
                labels,
                attributes: jobAttributes,
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
        },
    } = state;

    const index = states
        .map((_state: any): number => _state.clientID)
        .indexOf(own.clientID);

    const collapsedState = typeof (statesCollapsed[own.clientID]) === 'undefined'
        ? true : statesCollapsed[own.clientID];

    return {
        objectState: states[index],
        collapsed: collapsedState,
        attributes: jobAttributes[states[index].label.id],
        labels,
        jobInstance,
        frameNumber,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateState(sessionInstance: any, frameNumber: number, state: any): void {
            dispatch(updateAnnotationsAsync(sessionInstance, frameNumber, [state]));
        },
        collapseOrExpand(objectStates: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(objectStates, collapsed));
        },
    };
}

type Props = StateToProps & DispatchToProps;
class ObjectItemContainer extends React.PureComponent<Props> {
    private lock = (): void => {
        const { objectState } = this.props;
        objectState.lock = true;
        this.commit();
    };

    private unlock = (): void => {
        const { objectState } = this.props;
        objectState.lock = false;
        this.commit();
    };

    private show = (): void => {
        const { objectState } = this.props;
        objectState.hidden = false;
        this.commit();
    };

    private hide = (): void => {
        const { objectState } = this.props;
        objectState.hidden = true;
        this.commit();
    };

    private setOccluded = (): void => {
        const { objectState } = this.props;
        objectState.occluded = true;
        this.commit();
    };

    private unsetOccluded = (): void => {
        const { objectState } = this.props;
        objectState.occluded = false;
        this.commit();
    };

    private setOutside = (): void => {
        const { objectState } = this.props;
        objectState.outside = true;
        this.commit();
    };

    private unsetOutside = (): void => {
        const { objectState } = this.props;
        objectState.outside = false;
        this.commit();
    };

    private setKeyframe = (): void => {
        const { objectState } = this.props;
        objectState.keyframe = true;
        this.commit();
    };

    private unsetKeyframe = (): void => {
        const { objectState } = this.props;
        objectState.keyframe = false;
        this.commit();
    };

    private collapse = (): void => {
        const {
            collapseOrExpand,
            objectState,
            collapsed,
        } = this.props;

        collapseOrExpand([objectState], !collapsed);
    };

    private changeLabel = (labelID: string): void => {
        const {
            objectState,
            labels,
        } = this.props;

        const [label] = labels.filter((_label: any): boolean => _label.id === +labelID);
        objectState.label = label;
        this.commit();
    };

    private changeAttribute = (id: number, value: string): void => {
        const { objectState } = this.props;
        const attr: Record<number, string> = {};
        attr[id] = value;
        objectState.attributes = attr;
        this.commit();
    };

    private commit(): void {
        const {
            objectState,
            updateState,
            jobInstance,
            frameNumber,
        } = this.props;

        updateState(jobInstance, frameNumber, objectState);
    }

    public render(): JSX.Element {
        const {
            objectState,
            collapsed,
            labels,
            attributes,
        } = this.props;

        return (
            <ObjectStateItemComponent
                objectType={objectState.objectType}
                shapeType={objectState.shapeType}
                clientID={objectState.clientID}
                occluded={objectState.occluded}
                outside={objectState.outside}
                locked={objectState.lock}
                hidden={objectState.hidden}
                keyframe={objectState.keyframe}
                attrValues={{ ...objectState.attributes }}
                labelID={objectState.label.id}
                color={objectState.color}
                attributes={attributes}
                labels={labels}
                collapsed={collapsed}
                setOccluded={this.setOccluded}
                unsetOccluded={this.unsetOccluded}
                setOutside={this.setOutside}
                unsetOutside={this.unsetOutside}
                setKeyframe={this.setKeyframe}
                unsetKeyframe={this.unsetKeyframe}
                lock={this.lock}
                unlock={this.unlock}
                hide={this.hide}
                show={this.show}
                changeLabel={this.changeLabel}
                changeAttribute={this.changeAttribute}
                collapse={this.collapse}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
