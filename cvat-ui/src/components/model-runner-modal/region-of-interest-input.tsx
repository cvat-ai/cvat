// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useEffect, useState, useCallback, useRef,
} from 'react';
import { Row, Col } from 'antd/lib/grid';
import InputNumber from 'antd/lib/input-number';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import Icon, { QuestionCircleOutlined } from '@ant-design/icons';
import notification from 'antd/lib/notification';

import { Canvas, convertShapesForInteractor, InteractionResult } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { RectangleIcon } from 'icons';
import { clamp } from 'utils/math';

interface RegionOfInterest {
    xtl: number;
    ytl: number;
    xbr: number;
    ybr: number;
}

interface Props {
    canvasInstance?: Canvas;
    frameWidth?: number;
    frameHeight?: number;
    onSubmit: (result: RegionOfInterest | null) => void;
}

const MIN_ROI_SIZE = 128;
const FIELDS: (keyof RegionOfInterest)[] = ['xtl', 'ytl', 'xbr', 'ybr'];

function isValidRegionOfInterest(input: Partial<RegionOfInterest>): boolean {
    return Number.isInteger(input.xtl) && Number.isInteger(input.ytl) &&
        Number.isInteger(input.xbr) && Number.isInteger(input.ybr) &&
        input.xbr! > input.xtl! && input.ybr! > input.ytl! &&
        (input.xbr! - input.xtl! >= MIN_ROI_SIZE) && (input.ybr! - input.ytl! >= MIN_ROI_SIZE);
}

function RegionOfInterestInputComponent(props: Props): JSX.Element {
    const {
        frameWidth, frameHeight, canvasInstance, onSubmit,
    } = props;

    const frameSizeRef = useRef<{ width: number; height: number } | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [input, setInput] = useState<Partial<RegionOfInterest>>({});

    if (Number.isInteger(frameWidth) && Number.isInteger(frameHeight)) {
        frameSizeRef.current = { width: frameWidth!, height: frameHeight! };
    } else {
        frameSizeRef.current = { width: Infinity, height: Infinity };
    }

    const updateInputComponent = useCallback((updated: Partial<RegionOfInterest>): void => {
        const { width, height } = frameSizeRef.current!;
        const normalized = {
            xtl: updated.xtl !== undefined ? clamp(Math.floor(updated.xtl), 0, width) : undefined,
            ytl: updated.ytl !== undefined ? clamp(Math.floor(updated.ytl), 0, height) : undefined,
            xbr: updated.xbr !== undefined ? clamp(Math.floor(updated.xbr), 0, width) : undefined,
            ybr: updated.ybr !== undefined ? clamp(Math.floor(updated.ybr), 0, height) : undefined,
        };
        setInput({ ...normalized });
        if (isValidRegionOfInterest(normalized)) {
            onSubmit(normalized as RegionOfInterest);
        } else {
            onSubmit(null);
        }
    }, [onSubmit]);

    const updateInput = useCallback((updated: RegionOfInterest | null): void => {
        // accepts ready-to-use and valid RegionOfInterest
        if (updated) {
            setInput({ ...updated });
            onSubmit(updated);
        } else {
            setInput({});
            onSubmit(null);
        }
    }, [onSubmit]);

    const startDrawing = useCallback((): void => {
        if (!canvasInstance) {
            return;
        }

        canvasInstance.cancel();
        setDrawing(true);
        canvasInstance.interact({
            enabled: true,
            command: 'draw_box',
            settings: {
                crosshair: true,
                hint: 'Draw a region of interest',
            },
        });
    }, [canvasInstance]);

    useEffect(() => {
        if (!canvasInstance || !drawing) {
            return undefined;
        }

        const listener = (event: Event): void => {
            event.stopImmediatePropagation();
            const { shapes } = (event as CustomEvent<{ shapes: InteractionResult[] }>).detail;
            const box = convertShapesForInteractor(shapes, 'rectangle', 'positive');
            if (box.length >= 2) {
                const { width, height } = frameSizeRef.current!;
                const [[drawnXtl, drawnYtl], [drawnXbr, drawnYbr]] = box;
                const clamped = {
                    xtl: clamp(Math.floor(drawnXtl), 0, width),
                    ytl: clamp(Math.floor(drawnYtl), 0, height),
                    xbr: clamp(Math.floor(drawnXbr), 0, width),
                    ybr: clamp(Math.floor(drawnYbr), 0, height),
                };

                if (!isValidRegionOfInterest(clamped)) {
                    notification.error({
                        message: `Minimal size of region of interest is ${MIN_ROI_SIZE}x${MIN_ROI_SIZE} pixels`,
                    });
                } else {
                    updateInput(clamped);
                }
            }

            canvasInstance.cancel();
        };

        const cancelListener = (): void => setDrawing(false);

        canvasInstance.html().addEventListener('canvas.interacted', listener);
        canvasInstance.html().addEventListener('canvas.canceled', cancelListener);

        return () => {
            canvasInstance.html().removeEventListener('canvas.interacted', listener);
            canvasInstance.html().removeEventListener('canvas.canceled', cancelListener);
        };
    }, [canvasInstance, drawing]);

    return (
        <div className='cvat-automatic-annotation-region-of-interest-container'>
            <div>
                <Text>Region of interest</Text>
                <CVATTooltip title='Defines area of the frame to be automatically annotated'>
                    <QuestionCircleOutlined className='cvat-info-circle-icon' />
                </CVATTooltip>
            </div>
            <Row align='middle' gutter={[8, 8]}>
                {FIELDS.map((key) => (
                    <Col key={key}>
                        <InputNumber
                            placeholder={key}
                            precision={0}
                            value={input[key]}
                            onChange={(value: number | null) => updateInputComponent({ ...input, [key]: value })}
                        />
                    </Col>
                ))}
                {canvasInstance && (
                    <Col>
                        <CVATTooltip title='Draw a region of interest'>
                            <Button icon={<Icon component={RectangleIcon} />} onClick={startDrawing} />
                        </CVATTooltip>
                    </Col>
                )}
                <Col>
                    <Button type='link' onClick={() => updateInput(null)}>Clear</Button>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(RegionOfInterestInputComponent);
