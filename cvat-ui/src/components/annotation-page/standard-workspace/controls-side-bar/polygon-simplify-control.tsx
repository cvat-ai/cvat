// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Slider from 'antd/lib/slider';
import message from 'antd/lib/message';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { simplifyPolygon } from 'utils/opencv-wrapper/object-cv-utils';
import { MAX_ACCURACY } from './approximation-accuracy';

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
            if (!openCVWrapper.isInitialized) {
                return;
            }

            const closed = objectState.shapeType === ShapeType.POLYGON;

            const { cv } = (window as any);
            if (!cv) {
                return;
            }

            const simplifyFn = simplifyPolygon(cv);
            const result = simplifyFn(originalPointsRef.current, {
                accuracy: approxPolyAccuracy,
                closed,
            });

            // Update preview with simplified points
            if (result.simplified && result.simplifiedPointCount >= 3) {
                onUpdatePreview(result.points);
            } else if (!result.simplified && result.warning) {
                onUpdatePreview(originalPointsRef.current);
            }
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
            event.stopImmediatePropagation();
            handleApply();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            onCancel();
        }
    };

    useEffect(() => {
        const initializeAndPreview = async (): Promise<void> => {
            if (!openCVWrapper.isInitialized) {
                const hide = message.loading('Initializing contour utilities..', 0);
                await openCVWrapper.initialize(() => {
                    hide();
                });
            }

            updatePreview();
        };

        initializeAndPreview();
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [onApply, onCancel]);

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
                <Col offset={1}>
                    <CVATTooltip title='Lower values create simpler shapes with fewer points. Higher values preserve more detail and points.'>
                        <Text>Threshold: </Text>
                    </CVATTooltip>
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
                <Col style={{ textAlign: 'right' }} offset={1}>
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
