import React from 'react';
import { connect } from 'react-redux';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    collapseObjectItems,
} from 'actions/annotation-actions';

import {
    CombinedState,
    StatesOrdering,
} from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    listHeight: number;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    objectStates: any[];
}

interface DispatchToProps {
    onUpdateAnnotations(sessionInstance: any, frameNumber: number, states: any[]): void;
    onCollapseStates(states: any[], value: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                collapsed,
            },
            job: {
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            tabContentHeight: listHeight,
        },
    } = state;

    let statesHidden = true;
    let statesLocked = true;
    let statesCollapsed = true;

    objectStates.forEach((objectState: any) => {
        const { clientID } = objectState;
        statesHidden = statesHidden && objectState.hidden;
        statesLocked = statesLocked && objectState.lock;
        const stateCollapsed = clientID in collapsed ? collapsed[clientID] : true;
        statesCollapsed = statesCollapsed && stateCollapsed;
    });

    return {
        listHeight,
        statesHidden,
        statesLocked,
        statesCollapsed,
        objectStates,
        frameNumber,
        jobInstance,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onUpdateAnnotations(sessionInstance: any, frameNumber: number, states: any[]): void {
            dispatch(updateAnnotationsAsync(sessionInstance, frameNumber, states));
        },
        onCollapseStates(states: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(states, collapsed));
        },
    };
}

function sortAndMap(objectStates: any[], ordering: StatesOrdering): number[] {
    let sorted = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => a.clientID - b.clientID);
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => b.clientID - a.clientID);
    } else {
        sorted = [...objectStates].sort((a: any, b: any): number => b.updated - a.updated);
    }

    return sorted.map((state: any) => state.clientID);
}

type Props = StateToProps & DispatchToProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: any[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.Component<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            statesOrdering: StatesOrdering.ID_ASCENT,
            objectStates: [],
            sortedStatesID: [],
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.objectStates === state.objectStates) {
            return null;
        }

        return {
            ...state,
            objectStates: props.objectStates,
            sortedStatesID: sortAndMap(props.objectStates, state.statesOrdering),
        };
    }

    public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
        const {
            objectStates,
            listHeight,
            statesHidden,
            statesLocked,
            statesCollapsed,
        } = this.props;

        const { statesOrdering } = this.state;

        return nextProps.objectStates.length !== objectStates.length
            || nextProps.listHeight !== listHeight
            || nextProps.statesHidden !== statesHidden
            || nextProps.statesLocked !== statesLocked
            || nextProps.statesCollapsed !== statesCollapsed
            || nextState.statesOrdering !== statesOrdering
            || (statesOrdering === StatesOrdering.UPDATED
                ? nextProps.objectStates !== objectStates
                : nextProps.objectStates.map((nextObjectState: any, id: number): boolean => (
                    nextObjectState.clientID !== objectStates[id].clientID
                )).some((value: boolean) => value)
            );
    }

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { objectStates } = this.props;
        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(objectStates, statesOrdering),
        });
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private onCollapseAllStates = (): void => {
        this.collapseAllStates(true);
    };

    private onExpandAllStates = (): void => {
        this.collapseAllStates(false);
    };

    private onHideAllStates = (): void => {
        this.hideAllStates(true);
    };

    private onShowAllStates = (): void => {
        this.hideAllStates(false);
    };

    private lockAllStates(locked: boolean): void {
        const {
            objectStates,
            onUpdateAnnotations,
            jobInstance,
            frameNumber,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.lock = locked;
        }

        onUpdateAnnotations(jobInstance, frameNumber, objectStates);
    }

    private hideAllStates(hidden: boolean): void {
        const {
            objectStates,
            onUpdateAnnotations,
            jobInstance,
            frameNumber,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.hidden = hidden;
        }

        onUpdateAnnotations(jobInstance, frameNumber, objectStates);
    }

    private collapseAllStates(collapsed: boolean): void {
        const {
            objectStates,
            onCollapseStates,
        } = this.props;

        onCollapseStates(objectStates, collapsed);
    }

    public render(): JSX.Element {
        const {
            sortedStatesID,
            statesOrdering,
        } = this.state;

        return (
            <ObjectsListComponent
                {...this.props}
                statesOrdering={statesOrdering}
                sortedStatesID={sortedStatesID}
                changeStatesOrdering={this.onChangeStatesOrdering}
                lockAllStates={this.onLockAllStates}
                unlockAllStates={this.onUnlockAllStates}
                collapseAllStates={this.onCollapseAllStates}
                expandAllStates={this.onExpandAllStates}
                hideAllStates={this.onHideAllStates}
                showAllStates={this.onShowAllStates}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectsListContainer);
