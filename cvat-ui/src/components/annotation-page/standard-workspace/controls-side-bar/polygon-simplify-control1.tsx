// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';
import notification from 'antd/lib/notification';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { thresholdFromAccuracy, MAX_ACCURACY } from './approximation-accuracy';

interface Props {
    objectState: ObjectState;
    approxPolyAccuracy: number;
    onChangeAccuracy: (value: number) => void;
    onApply: () => void;
    onCancel: () => void;
    onUpdatePreview: (points: number[]) => void;
}

interface State {
    previewPoints: number[] | null;
    originalCount: number;
    simplifiedCount: number;
}

class PolygonSimplifyControl extends React.PureComponent<Props, State> {
    private originalPoints: number[];

    constructor(props: Props) {
        super(props);

        this.originalPoints = props.objectState.points ? [...props.objectState.points] : [];
        const originalCount = this.originalPoints.length / 2;

        this.state = {
            previewPoints: null,
            originalCount,
            simplifiedCount: originalCount,
        };
    }

    public async componentDidMount(): Promise<void> {
        // Initialize OpenCV
        if (!openCVWrapper.isInitialized) {
            await openCVWrapper.initialize(() => {});
        }

        // Calculate initial preview
        this.updatePreview();

        // Add keyboard listeners
        window.addEventListener('keydown', this.onKeyDown);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { approxPolyAccuracy } = this.props;
        if (prevProps.approxPolyAccuracy !== approxPolyAccuracy) {
            this.updatePreview();
        }
    }

    public componentWillUnmount(): void {
        window.removeEventListener('keydown', this.onKeyDown);
    }

    private onKeyDown = (event: KeyboardEvent): void => {
        const { onCancel } = this.props;
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleApply();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
        }
    };

    private updatePreview = async (): Promise<void> => {
        const { objectState, approxPolyAccuracy, onUpdatePreview } = this.props;

        try {
            const epsilon = thresholdFromAccuracy(approxPolyAccuracy);
            const closed = objectState.shapeType === ShapeType.POLYGON;

            const simplified = openCVWrapper.contours.approxPoly(
                this.originalPoints,
                epsilon,
                closed,
            );

            const simplifiedPoints = simplified.flat();
            const simplifiedCount = simplifiedPoints.length / 2;

            this.setState({
                previewPoints: simplifiedPoints,
                simplifiedCount,
            });

            // Notify parent to update canvas preview
            onUpdatePreview(simplifiedPoints);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to preview simplification:', error);
        }
    };

    private handleApply = (): void => {
        const { onApply, approxPolyAccuracy } = this.props;
        const { originalCount, simplifiedCount, previewPoints } = this.state;

        if (previewPoints && simplifiedCount < originalCount) {
            const reduction = ((originalCount - simplifiedCount) / originalCount) * 100;
            notification.success({
                message: 'Polygon simplified',
                description: (
                    `${originalCount} → ${simplifiedCount} points ` +
                    `(${reduction.toFixed(1)}% reduction) • Accuracy: ${approxPolyAccuracy}`
                ),
                duration: 3,
            });
        } else if (simplifiedCount === originalCount) {
            notification.info({
                message: 'No simplification needed',
                description: `Polygon is already at optimal point count for accuracy ${approxPolyAccuracy}`,
                duration: 2,
            });
        }

        onApply();
    };

    public render(): React.ReactPortal | null {
        const { approxPolyAccuracy, onChangeAccuracy, onCancel } = this.props;

        const target = window.document.getElementsByClassName('cvat-canvas-container')[0];

        const sliderMarks: Record<number, { style: React.CSSProperties; label: JSX.Element }> = {};
        sliderMarks[0] = {
            style: {
                color: '#1890ff',
            },
            label: <strong>less</strong>,
        };
        sliderMarks[MAX_ACCURACY] = {
            style: {
                color: '#61c200',
            },
            label: <strong>more</strong>,
        };

        return target ? ReactDOM.createPortal(
            <div className='cvat-approx-poly-threshold-wrapper'>
                <Row align='middle' gutter={8}>
                    <Col span={5}>
                        <Text>Points: </Text>
                    </Col>
                    <Col span={12}>
                        <Slider
                            value={approxPolyAccuracy}
                            min={0}
                            max={MAX_ACCURACY}
                            step={1}
                            dots
                            tooltip={{
                                open: false,
                            }}
                            onChange={onChangeAccuracy}
                            marks={sliderMarks}
                        />
                    </Col>
                    <Col span={2} style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '14px' }}>
                            {approxPolyAccuracy}
                        </Text>
                    </Col>
                    <Col span={5} style={{ textAlign: 'right' }}>
                        <Button
                            type='primary'
                            size='small'
                            icon={<CheckOutlined />}
                            onClick={this.handleApply}
                            style={{ marginRight: 4 }}
                        />
                        <Button
                            size='small'
                            icon={<CloseOutlined />}
                            onClick={onCancel}
                        />
                    </Col>
                </Row>
                {/* <Row>
                    <Col span={24} style={{ textAlign: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: '12px' }}>
                            {originalCount}
                            {' → '}
                            {simplifiedCount}
                            {' points ('}
                            {reduction.toFixed(1)}
                            % reduction)
                        </Text>
                    </Col>
                </Row> */}
            </div>,
            target,
        ) : null;
    }
}

export default PolygonSimplifyControl;
