import React from 'react';
import { connect } from 'react-redux';

import {
    CombinedState,
    ShapeType,
    ObjectType,
    BoxDrawingType
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
        boxDrawingType?: string,
    ): void;
}

interface StateToProps {
    canvasInstance: Canvas;
    shapeType: ShapeType;
    labels: any[];
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
            points?: number,
            boxDrawingType?: string,
        ): void {
            dispatch(drawShape(shapeType, labelID, objectType, points, boxDrawingType));
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
                labels,
            },
        },
    } = state;

    return {
        ...own,
        canvasInstance,
        labels,
    };
}

type Props = StateToProps & DispatchToProps;

interface State {
    boxDrawingType?: string;
    numberOfPoints?: number;
    selectedLabelID: number;
}

class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    private minimumPoints = 3;
    constructor(props: Props) {
        super(props);

        const defaultLabelID = props.labels[0].id;
        const defaultBoxDrawingType = BoxDrawingType.BY_TWO_POINTS;
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
        if (shapeType === ShapeType.RECTANGLE) {
            this.state.boxDrawingType = defaultBoxDrawingType;
        }
    }

    private onDraw(objectType: ObjectType): void {
        const {
            canvasInstance,
            shapeType,
            onDrawStart,
        } = this.props;

        const {
            boxDrawingType,
            numberOfPoints,
            selectedLabelID,
        } = this.state;

        canvasInstance.cancel();
        canvasInstance.draw({
            enabled: true,
            boxDrawingType,
            numberOfPoints,
            shapeType,
            crosshair: shapeType === ShapeType.RECTANGLE,
        });

        onDrawStart(shapeType, selectedLabelID,
            objectType, numberOfPoints);
    }

    private onChangeBoxDrawingType = (value: string): void => {
        this.setState({
            boxDrawingType: value
        });
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
                onChangeBoxDrawingType={this.onChangeBoxDrawingType}
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
