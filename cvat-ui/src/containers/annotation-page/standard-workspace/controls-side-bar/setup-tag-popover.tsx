// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState,
    ObjectType,
} from 'reducers/interfaces';

import {
    setupTag
} from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas';
import SetupTagPopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/setup-tag-popover';

interface DispatchToProps {
    onTagSetup(
        labelID: number,
    ): void;
}

interface StateToProps {
    canvasInstance: Canvas;
    labels: any[];
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onTagSetup(
            labelID: number,
        ): void {
            dispatch(setupTag(labelID, ObjectType.TAG));
        },
    };
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
            },
            job: {
                labels,
            },
        },
    } = state;

    return {
        canvasInstance,
        labels,
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

    private onSetup(labelID: number): void {
        const { canvasInstance, onTagSetup } = this.props;

        canvasInstance.cancel();
        onTagSetup(labelID);
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
