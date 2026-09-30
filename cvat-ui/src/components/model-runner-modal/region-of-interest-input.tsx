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

import { type Canvas, convertShapesForInteractor, InteractionResult } from 'cvat-canvas-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import { RectangleIcon } from 'icons';
import { clamp } from 'utils/math';

type RegionOfInterest = [number, number, number, number];

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

function isValidRegionOfInterestInput(input: Partial<RegionOfInterestInput>): boolean {
    return Number.isInteger(input.xtl) && Number.isInteger(input.ytl) &&
        Number.isInteger(input.width) && Number.isInteger(input.height) &&
        input.width! > 0 && input.height! > 0;
}

function getRegionOfInterest(input: Partial<RegionOfInterestInput>): RegionOfInterest | null {
    return isValidRegionOfInterestInput(input) ? [
        input.xtl!,
        input.ytl!,
        input.xtl! + input.width!,
        input.ytl! + input.height!,
    ] : null;
}

function getInputFromRegionOfInterest(regionOfInterest: Readonly<RegionOfInterest>): RegionOfInterestInput {
    return {
        xtl: regionOfInterest[0],
        ytl: regionOfInterest[1],
        width: regionOfInterest[2] - regionOfInterest[0],
        height: regionOfInterest[3] - regionOfInterest[1],
    };
}

function RegionOfInterestInputComponent(props: Props): JSX.Element {
    const {
        frameWidth, frameHeight, canvasInstance, onSubmit,
    } = props;

    const frameSizeRef = useRef<{ width: number; height: number }>({
        width: frameWidth ?? Infinity,
        height: frameHeight ?? Infinity,
    });

    const [drawing, setDrawing] = useState(false);
    const [input, setInput] = useState<Partial<RegionOfInterestInput>>({});

    const emulateClick = (): void => {
        // Hide the tools popover while drawing a region of interest,
        // then restore it after drawing is finished.
        window.document.getElementsByClassName(
            'cvat-tools-control',
        )[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    };

    const updateInputComponent = useCallback((updated: Partial<RegionOfInterestInput>): void => {
        const { width: frameWidthValue, height: frameHeightValue } = frameSizeRef.current!;
        const normalizeValue = (value: number | undefined, min: number, max: number): number | undefined => (
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

        const regionOfInterest = getRegionOfInterest(normalized);
        setInput({ ...normalized });
        onSubmit(regionOfInterest);
    }, [onSubmit]);

    const updateInput = useCallback((updated: Readonly<RegionOfInterest> | null): void => {
        // accepts ready-to-use and valid RegionOfInterest
        if (updated) {
            setInput(getInputFromRegionOfInterest(updated));
            onSubmit([...updated]);
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
        if (frameWidth !== frameSizeRef.current!.width || frameHeight !== frameSizeRef.current!.height) {
            frameSizeRef.current = { width: frameWidth ?? Infinity, height: frameHeight ?? Infinity };
            updateInput(null);
        }
    }, [frameWidth, frameHeight]);

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
                const clamped = [
                    clamp(Math.floor(drawnXtl), 0, width),
                    clamp(Math.floor(drawnYtl), 0, height),
                    clamp(Math.floor(drawnXbr), 0, width),
                    clamp(Math.floor(drawnYbr), 0, height),
                ] as const;

                const drawnInput = getInputFromRegionOfInterest(clamped);
                if (!isValidRegionOfInterestInput(drawnInput)) {
                    notification.error({
                        message: 'Region of interest must have positive width and height',
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

    const { width, height } = frameSizeRef.current!;
    const isXtlInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.xtl) || input.xtl! < 0 || input.xtl! >= width
    );

    const isYtlInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.ytl) || input.ytl! < 0 || input.ytl! >= height
    );

    const isWidthInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.width) || input.width! <= 0 ||
        (Number.isInteger(input.xtl) && input.xtl! + input.width! > width)
    );

    const isHeightInvalid = Object.keys(input).length > 0 && (
        !Number.isInteger(input.height) || input.height! <= 0 ||
        (Number.isInteger(input.ytl) && input.ytl! + input.height! > height)
    );

    const allIsValid = Object.keys(input).length > 0 &&
        !isXtlInvalid && !isYtlInvalid && !isWidthInvalid && !isHeightInvalid;
    const defaultClassList = allIsValid ? 'cvat-correct-region-of-interest-value' : '';

    return (
        <div className='cvat-automatic-annotation-region-of-interest-container'>
            <div>
                <Text>Region of interest</Text>
                <CVATTooltip title='Defines area of the image where the model will be applied'>
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
                        className={isXtlInvalid ? 'cvat-errored-region-of-interest-value' : defaultClassList}
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
                        className={isYtlInvalid ? 'cvat-errored-region-of-interest-value' : defaultClassList}
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
                        className={isWidthInvalid ? 'cvat-errored-region-of-interest-value' : defaultClassList}
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
                        className={isHeightInvalid ? 'cvat-errored-region-of-interest-value' : defaultClassList}
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
