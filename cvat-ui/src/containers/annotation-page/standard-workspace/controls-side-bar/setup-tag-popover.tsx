// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState,
} from 'reducers/interfaces';

import {
    addTagAsync,
} from 'actions/annotation-actions';
import SetupTagPopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/setup-tag-popover';

interface DispatchToProps {
    onAddTag(labelID: number, frame: number): void;
}

interface StateToProps {
    labels: any[];
    frame: number;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onAddTag(labelID: number, frame: number): void {
            dispatch(addTagAsync(labelID, frame));
        },
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                labels,
            },
            player: {
                frame: {
                    number: frame,
                },
            },
        },
    } = state;

    return {
        labels,
        frame,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        const defaultLabelID = props.labels[0].id;
        this.state = {
            selectedLabelID: defaultLabelID,
        };
    }

    private onChangeLabel = (value: string): void => {
        this.setState({
            selectedLabelID: +value,
        });
    };

    private onSetup(): void {
        const {
            frame,
            onAddTag,
        } = this.props;

        const { selectedLabelID } = this.state;

        onAddTag(selectedLabelID, frame);
    }

    public render(): JSX.Element {
        const {
            selectedLabelID,
        } = this.state;

        const {
            labels,
        } = this.props;

        this.onSetup = this.onSetup.bind(this);

        return (
            <SetupTagPopoverComponent
                labels={labels}
                selectedLabeID={selectedLabelID}
                onChangeLabel={this.onChangeLabel}
                onSetup={this.onSetup}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DrawShapePopoverContainer);
