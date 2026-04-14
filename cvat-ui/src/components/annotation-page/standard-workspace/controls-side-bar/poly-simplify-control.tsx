// Copyright (C) CVAT.ai Corporation
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

import { ObjectState, ShapeType } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { MAX_ACCURACY } from './approximation-accuracy';

interface Props {
    objectState: ObjectState;
    approxPolyAccuracy: number;
    repeatDrawShapeShortcut: { sequences: string[] };
    onChangeAccuracy: (value: number) => void;
    onApply: () => void;
    onCancel: () => void;
    onUpdatePreview: (points: number[]) => void;
}

function PolySimplifyControl(props: Props): React.ReactPortal | null {
    const {
        objectState, approxPolyAccuracy, repeatDrawShapeShortcut, onChangeAccuracy, onApply, onCancel, onUpdatePreview,
    } = props;

    const originalPointsRef = useRef<number[]>(objectState.points ? [...objectState.points] : []);

    const updatePreview = async (): Promise<void> => {
        if (!openCVWrapper.isInitialized) {
            return;
        }

        const closed = objectState.shapeType === ShapeType.POLYGON;

        const simplifiedPoints = openCVWrapper.contours.simplifyPolygon(originalPointsRef.current, {
            accuracy: approxPolyAccuracy,
            closed,
        });

        const pointsChanged = simplifiedPoints !== originalPointsRef.current;
        if (pointsChanged) {
            onUpdatePreview(simplifiedPoints);
        }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (
            event.key === 'Enter' ||
            repeatDrawShapeShortcut.sequences.some(
                (seq) => event.key.toLowerCase() === seq.toLowerCase(),
            )
        ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            onApply();
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

    return target ? ReactDOM.createPortal(
        <Row align='middle' className='cvat-approx-poly-threshold-wrapper'>
            <Col span={20}>
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
                />
            </Col>
            <Col span={4} style={{ textAlign: 'right' }}>
                <Button
                    type='primary'
                    size='small'
                    icon={<CheckOutlined />}
                    onClick={onApply}
                    style={{ marginRight: 4 }}
                />
                <Button
                    size='small'
                    icon={<CloseOutlined />}
                    onClick={onCancel}
                />
            </Col>
            <CVATTooltip title='Lower values create simpler shapes with fewer points. Higher values preserve more detail and points.'>
                <Text type='secondary'>threshold</Text>
            </CVATTooltip>
        </Row>,
        target,
    ) : null;
}

export default React.memo(PolySimplifyControl);
