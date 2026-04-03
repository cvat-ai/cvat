// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';
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

function PolygonSimplifyControl(props: Props): React.ReactPortal | null {
    const {
        objectState, approxPolyAccuracy, onChangeAccuracy, onApply, onCancel, onUpdatePreview,
    } = props;

    const originalPointsRef = useRef<number[]>(objectState.points ? [...objectState.points] : []);

    const updatePreview = async (): Promise<void> => {
        try {
            const epsilon = thresholdFromAccuracy(approxPolyAccuracy);
            const closed = objectState.shapeType === ShapeType.POLYGON;

            // Convert flat array [x1, y1, x2, y2, ...] to array of pairs [[x1, y1], [x2, y2], ...]
            const pointPairs: [number, number][] = [];
            for (let i = 0; i < originalPointsRef.current.length; i += 2) {
                pointPairs.push([originalPointsRef.current[i], originalPointsRef.current[i + 1]]);
            }

            const simplified = openCVWrapper.contours.approxPoly(
                pointPairs,
                epsilon,
                closed,
            );

            const simplifiedPoints = simplified.flat();
            const simplifiedCountValue = simplifiedPoints.length / 2;

            // Validate that we have at least 3 points for polygon/polyline
            // If simplification results in too few points, keep the previous valid preview
            if (simplifiedCountValue >= 3) {
                onUpdatePreview(simplifiedPoints);
            }
            // If < 3 points, don't update (keep the last valid preview)
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to preview simplification:', error);
        }
    };

    const handleApply = (): void => {
        onApply();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleApply();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
        }
    };

    useEffect(() => {
        const initializeAndPreview = async (): Promise<void> => {
            // Initialize OpenCV
            if (!openCVWrapper.isInitialized) {
                await openCVWrapper.initialize(() => {});
            }

            // Calculate initial preview
            updatePreview();
        };

        initializeAndPreview();

        // Add keyboard listeners
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        updatePreview();
    }, [approxPolyAccuracy]);

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
                <Col span={5} style={{ textAlign: 'right' }} offset={1}>
                    <Button
                        type='primary'
                        size='small'
                        icon={<CheckOutlined />}
                        onClick={handleApply}
                        style={{ marginRight: 4 }}
                    />
                    <Button
                        size='small'
                        icon={<CloseOutlined />}
                        onClick={onCancel}
                    />
                </Col>
            </Row>
        </div>,
        target,
    ) : null;
}

export default PolygonSimplifyControl;
