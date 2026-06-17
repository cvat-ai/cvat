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

interface RegionOfInterestInput {
    xtl: number;
    ytl: number;
    width: number;
    height: number;
}

interface Props {
    canvasInstance?: Canvas;
    frameWidth?: number;
    frameHeight?: number;
    onSubmit: (result: RegionOfInterest | null) => void;
}

const MIN_ROI_SIZE = 128;

function isValidRegionOfInterestInput(input: Partial<RegionOfInterestInput>): boolean {
    return Number.isInteger(input.xtl) && Number.isInteger(input.ytl) &&
        Number.isInteger(input.width) && Number.isInteger(input.height) &&
        input.width! >= MIN_ROI_SIZE && input.height! >= MIN_ROI_SIZE;
}

function getRegionOfInterest(input: Partial<RegionOfInterestInput>): RegionOfInterest | null {
    return isValidRegionOfInterestInput(input) ? {
        xtl: input.xtl!,
        ytl: input.ytl!,
        xbr: input.xtl! + input.width!,
        ybr: input.ytl! + input.height!,
    } : null;
}

function getInputFromRegionOfInterest(regionOfInterest: RegionOfInterest): RegionOfInterestInput {
    return {
        xtl: regionOfInterest.xtl,
        ytl: regionOfInterest.ytl,
        width: regionOfInterest.xbr - regionOfInterest.xtl,
        height: regionOfInterest.ybr - regionOfInterest.ytl,
    };
}

function RegionOfInterestInputComponent(props: Props): JSX.Element {
    const {
        frameWidth, frameHeight, canvasInstance, onSubmit,
    } = props;

    const frameSizeRef = useRef<{ width: number; height: number } | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [input, setInput] = useState<Partial<RegionOfInterestInput>>({});

    if (Number.isInteger(frameWidth) && Number.isInteger(frameHeight)) {
        frameSizeRef.current = { width: frameWidth!, height: frameHeight! };
    } else {
        frameSizeRef.current = { width: Infinity, height: Infinity };
    }

    const emulateClick = (): void => {
        // Hide the tools popover while drawing a region of interest,
        // then restore it after drawing is finished.
        window.document.getElementsByClassName(
            'cvat-tools-control',
        )[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    };

    const updateInputComponent = useCallback((updated: Partial<RegionOfInterestInput>): void => {
        const { width: frameWidthValue, height: frameHeightValue } = frameSizeRef.current!;
        const normalizeValue = (value: number | null | undefined, min: number, max: number): number | undefined => (
            typeof value === 'number' ? clamp(Math.floor(value), min, max) : undefined
        );
        const xtl = normalizeValue(updated.xtl, 0, frameWidthValue);
        const ytl = normalizeValue(updated.ytl, 0, frameHeightValue);
        const normalized = {
            xtl,
            ytl,
            width: normalizeValue(updated.width, 0, frameWidthValue - (xtl ?? 0)),
            height: normalizeValue(updated.height, 0, frameHeightValue - (ytl ?? 0)),
        };
        setInput({ ...normalized });
        const regionOfInterest = getRegionOfInterest(normalized);
        if (regionOfInterest) {
            onSubmit(regionOfInterest);
        } else {
            onSubmit(null);
        }
    }, [onSubmit]);

    const updateInput = useCallback((updated: RegionOfInterest | null): void => {
        // accepts ready-to-use and valid RegionOfInterest
        if (updated) {
            setInput(getInputFromRegionOfInterest(updated));
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
        emulateClick();
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

                const drawnInput = getInputFromRegionOfInterest(clamped);
                if (!isValidRegionOfInterestInput(drawnInput)) {
                    notification.error({
                        message: `Minimal size of region of interest is ${MIN_ROI_SIZE}x${MIN_ROI_SIZE} pixels`,
                    });
                } else {
                    updateInput(clamped);
                    emulateClick();
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

    const isXtlInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.xtl) || input.xtl! < 0 ||
        input.xtl! > frameSizeRef.current!.width - MIN_ROI_SIZE
    );

    const isYtlInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.ytl) || input.ytl! < 0 ||
        input.ytl! > frameSizeRef.current!.height - MIN_ROI_SIZE
    );

    const isWidthInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.width) || input.width! < MIN_ROI_SIZE ||
        input.xtl! + input.width! > frameSizeRef.current!.width
    );

    const isHeightInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.height) || input.height! < MIN_ROI_SIZE ||
        input.ytl! + input.height! > frameSizeRef.current!.height
    );

    return (
        <div className='cvat-automatic-annotation-region-of-interest-container'>
            <div>
                <Text>Region of interest</Text>
                <CVATTooltip title='Defines area of the frame to be automatically annotated'>
                    <QuestionCircleOutlined className='cvat-info-circle-icon' />
                </CVATTooltip>
            </div>
            <Row align='middle' gutter={[8, 8]}>
                <Col>
                    <InputNumber
                        name='xtl'
                        placeholder='x'
                        precision={0}
                        value={input.xtl}
                        className={isXtlInvalid ? 'cvat-errored-region-of-interest-value' : ''}
                        onChange={(value: number | null) => updateInputComponent({
                            ...input, xtl: value ?? undefined,
                        })}
                    />
                </Col>
                <Col>
                    <InputNumber
                        name='ytl'
                        placeholder='y'
                        precision={0}
                        value={input.ytl}
                        className={isYtlInvalid ? 'cvat-errored-region-of-interest-value' : ''}
                        onChange={(value: number | null) => updateInputComponent({
                            ...input, ytl: value ?? undefined,
                        })}
                    />
                </Col>
                <Col>
                    <InputNumber
                        name='width'
                        placeholder='width'
                        precision={0}
                        value={input.width}
                        className={isWidthInvalid ? 'cvat-errored-region-of-interest-value' : ''}
                        onChange={(value: number | null) => updateInputComponent({
                            ...input, width: value ?? undefined,
                        })}
                    />
                </Col>
                <Col>
                    <InputNumber
                        name='height'
                        placeholder='height'
                        precision={0}
                        value={input.height}
                        className={isHeightInvalid ? 'cvat-errored-region-of-interest-value' : ''}
                        onChange={(value: number | null) => updateInputComponent({
                            ...input, height: value ?? undefined,
                        })}
                    />
                </Col>
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
