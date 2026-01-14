// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Icon from '@ant-design/icons';
import { ExclamationCircleTwoTone } from '@ant-design/icons';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import { reviewActions } from 'actions/review-actions';
import { ActiveControl, CombinedState, NewIssueSource } from 'reducers';
import { updateCanvasBrushTools } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { BrushIcon } from 'icons';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { DimensionType, ShapeType } from 'cvat-core-wrapper';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    disabled: boolean;
    updateActiveControl(activeControl: ActiveControl): void;
}

const DEFAULT_BRUSH_SIZE = 10;
type BrushForm = 'circle' | 'square';
const DEFAULT_BRUSH_FORM: BrushForm = 'circle';
const DEFAULT_BRUSH_COLOR = '#ff0000';

function IssueMaskControl(props: Props): JSX.Element {
    const {
        canvasInstance, activeControl, disabled, updateActiveControl: updateControl,
    } = props;
    const dispatch = useDispatch();
    const { dimension } = useSelector((state: CombinedState) => ({
        dimension: state.annotation.job.instance?.dimension,
    }), shallowEqual);

    const is2D = dimension === DimensionType.DIMENSION_2D;
    const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);

    useEffect(() => {
        if (!is2D || disabled) {
            if (activeControl === ActiveControl.OPEN_ISSUE_MASK) {
                if (canvasInstance instanceof Canvas) {
                    canvasInstance.cancel();
                }
                dispatch(updateCanvasBrushTools({ visible: false }));
                updateControl(ActiveControl.CURSOR);
            }
            return;
        }

        if (activeControl === ActiveControl.OPEN_ISSUE_MASK && canvasInstance instanceof Canvas) {
            dispatch(updateCanvasBrushTools({ visible: true }));
            canvasInstance.draw({
                enabled: true,
                shapeType: ShapeType.MASK,
                crosshair: false,
                brushTool: {
                    type: 'brush',
                    size: brushSize,
                    form: DEFAULT_BRUSH_FORM,
                    color: DEFAULT_BRUSH_COLOR,
                    onBlockUpdated: () => {},
                },
                onUpdateConfiguration: ({ brushTool }) => {
                    if (brushTool?.size) {
                        setBrushSize(Math.max(1, brushTool.size));
                    }
                },
            });
        }
    }, [activeControl, brushSize, canvasInstance, disabled, is2D, updateControl]);

    useEffect(() => {
        const finish = (): void => {
            if (activeControl !== ActiveControl.OPEN_ISSUE_MASK || !(canvasInstance instanceof Canvas)) return;
            canvasInstance.draw({ enabled: false });
            dispatch(updateCanvasBrushTools({ visible: false }));
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (activeControl !== ActiveControl.OPEN_ISSUE_MASK) return;
            const tagName = (event.target as HTMLElement)?.tagName;
            if (['INPUT', 'TEXTAREA'].includes(tagName)) return;
            if (event.key.toLowerCase() === 'm') {
                event.preventDefault();
                event.stopPropagation();
                // stop other handlers (e.g. default "open issue" hotkey) from firing
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }
                finish();
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [activeControl, canvasInstance]);

    useEffect(() => {
        if (!(canvasInstance instanceof Canvas)) {
            return () => {};
        }

        const onDrawn = async (event: Event): Promise<void> => {
            if (activeControl !== ActiveControl.OPEN_ISSUE_MASK) return;
            const { detail } = event as CustomEvent;
            const state = detail?.state;
            if (!state || state.shapeType !== ShapeType.MASK) return;

            let points: number[] | null = null;
            try {
                points = await openCVWrapper.getContourFromState({
                    shapeType: ShapeType.MASK,
                    points: state.points,
                } as any);
            } catch (error) {
                points = null;
            }

            if (!points?.length) {
                const [left, top, right, bottom] = state.points.slice(-4);
                points = [left, top, right, top, right, bottom, left, bottom];
            }

            if (points.length) {
                dispatch(reviewActions.startIssue(points, NewIssueSource.ISSUE_TOOL));
            }

            dispatch(updateCanvasBrushTools({ visible: false }));
            updateControl(ActiveControl.CURSOR);
        };

        const onCanceled = (): void => {
            if (activeControl === ActiveControl.OPEN_ISSUE_MASK) {
                dispatch(updateCanvasBrushTools({ visible: false }));
                updateControl(ActiveControl.CURSOR);
            }
        };

        const canvas = canvasInstance.html();
        canvas.addEventListener('canvas.drawn', onDrawn);
        canvas.addEventListener('canvas.canceled', onCanceled);
        return () => {
            canvas.removeEventListener('canvas.drawn', onDrawn);
            canvas.removeEventListener('canvas.canceled', onCanceled);
        };
    }, [activeControl, canvasInstance, dispatch, updateControl]);

    const className = (disabled || !is2D) ?
        'cvat-issue-mask-control cvat-disabled-canvas-control' :
        `cvat-issue-mask-control${activeControl === ActiveControl.OPEN_ISSUE_MASK ? ' cvat-active-canvas-control' : ''}`;

    return (
        <CVATTooltip title='Open an issue (mask)' placement='right'>
            <ExclamationCircleTwoTone
                className={className}
                twoToneColor={activeControl === ActiveControl.OPEN_ISSUE_MASK ? '#faad14' : undefined}
                onClick={() => {
                    if (disabled || !is2D) return;
                    if (activeControl === ActiveControl.OPEN_ISSUE_MASK) {
                        canvasInstance.draw({ enabled: false });
                        dispatch(updateCanvasBrushTools({ visible: false }));
                        return;
                    }

                    if (canvasInstance.mode() !== CanvasMode.IDLE) {
                        canvasInstance.cancel();
                    }

                    dispatch(updateCanvasBrushTools({ visible: true }));
                    updateControl(ActiveControl.OPEN_ISSUE_MASK);
                }}
            />
        </CVATTooltip>
    );
}

export default React.memo(IssueMaskControl);
