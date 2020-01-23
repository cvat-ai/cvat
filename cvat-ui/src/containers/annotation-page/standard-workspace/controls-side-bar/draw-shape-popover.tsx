import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState,
    ShapeType,
    ObjectType,
    StringObject,
} from 'reducers/interfaces';

import {
    drawShape,
} from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas';
import DrawShapePopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';

interface OwnProps {
    shapeType: ShapeType;
}

interface DispatchToProps {
    onDrawStart(
        shapeType: ShapeType,
        labelID: number,
        objectType: ObjectType,
        points?: number,
    ): void;
}

interface StateToProps {
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: StringObject;
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
            points?: number,
        ): void {
            dispatch(drawShape(shapeType, labelID, objectType, points));
        },
    };
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
            },
            job: {
                instance: jobInstance,
            },
        },
    } = state;

    const labels = jobInstance.task.labels
        .reduce((acc: StringObject, label: any): StringObject => {
            acc[label.id as number] = label.name;
            return acc;
        }, {});

    return {
        ...own,
        canvasInstance,
        labels,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    numberOfPoints?: number;
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.Component<Props, State> {
    private minimumPoints = 3;
    constructor(props: Props) {
        super(props);

        const defaultLabelID = +Object.keys(props.labels)[0];
        this.state = {
            selectedLabelID: defaultLabelID,
        };

        const { shapeType } = props;
        if (shapeType === ShapeType.POLYGON) {
            this.minimumPoints = 3;
        }
        if (shapeType === ShapeType.POLYLINE) {
            this.minimumPoints = 2;
        }
        if (shapeType === ShapeType.POINTS) {
            this.minimumPoints = 1;
        }
    }

    public shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
        const {
            labels,
            canvasInstance,
            shapeType,
        } = this.props;

        const {
            numberOfPoints,
            selectedLabelID,
        } = this.state;

        for (const labelID of Object.keys(labels)) {
            if (!(labelID in nextProps.labels) || nextProps.labels[labelID] !== labels[labelID]) {
                return true;
            }
        }

        return canvasInstance !== nextProps.canvasInstance
            || shapeType !== nextProps.shapeType
            || numberOfPoints !== nextState.numberOfPoints
            || selectedLabelID !== nextState.selectedLabelID;
    }

    private onDraw(objectType: ObjectType): void {
        const {
            canvasInstance,
            shapeType,
            onDrawStart,
        } = this.props;

        const {
            numberOfPoints,
            selectedLabelID,
        } = this.state;

        canvasInstance.cancel();
        canvasInstance.draw({
            enabled: true,
            numberOfPoints,
            shapeType,
            crosshair: shapeType === ShapeType.RECTANGLE,
        });

        onDrawStart(shapeType, selectedLabelID,
            objectType, numberOfPoints);
    }

    private onDrawShape = (): void => {
        this.onDraw(ObjectType.SHAPE);
    };

    private onDrawTrack = (): void => {
        this.onDraw(ObjectType.TRACK);
    };

    private onChangePoints = (value: number | undefined): void => {
        if (typeof (value) === 'undefined') {
            this.setState({
                numberOfPoints: value,
            });
        } else if (typeof (value) === 'number') {
            this.setState({
                numberOfPoints: Math.max(value, this.minimumPoints),
            });
        }
    };

    private onChangeLabel = (value: string): void => {
        this.setState({
            selectedLabelID: +value,
        });
    };

    public render(): JSX.Element {
        const {
            selectedLabelID,
            numberOfPoints,
        } = this.state;

        const {
            labels,
            shapeType,
        } = this.props;

        return (
            <DrawShapePopoverComponent
                labels={labels}
                shapeType={shapeType}
                minimumPoints={this.minimumPoints}
                selectedLabeID={selectedLabelID}
                numberOfPoints={numberOfPoints}
                onChangeLabel={this.onChangeLabel}
                onChangePoints={this.onChangePoints}
                onDrawTrack={this.onDrawTrack}
                onDrawShape={this.onDrawShape}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DrawShapePopoverContainer);
