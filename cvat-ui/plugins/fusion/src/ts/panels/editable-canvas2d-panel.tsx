// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useEffect, useRef, useImperativeHandle, forwardRef, useCallback,
} from 'react';
import Spin from 'antd/lib/spin';

import { Canvas, CanvasMode, RectDrawingMethod } from 'cvat-canvas/src/typescript/canvas';
import { DrawData } from 'cvat-canvas/src/typescript/canvasModel';

import { linkIdToColor, getLinkIdFromState } from '../utils/color';

export interface EditableCanvas2DPanelProps {
    job: any;
    frame: number;
    annotations: any[];
    onAnnotationCreated: (drawData: any) => void;
    onAnnotationEdited: (state: any, points: number[], rotation: number) => void;
    onSelectAnnotation: (clientID: number) => void;
}

export interface Canvas2DHandle {
    startDraw(shapeType: string, label: any): void;
    cancelDraw(): void;
    activate(clientID: number | null): void;
    getMode(): string;
}

const EditableCanvas2DPanel = forwardRef<Canvas2DHandle, EditableCanvas2DPanelProps>(
    (props, ref) => {
        const {
            job, frame, annotations,
            onAnnotationCreated, onAnnotationEdited, onSelectAnnotation,
        } = props;

        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<Canvas | null>(null);
        const resizeObserverRef = useRef<ResizeObserver | null>(null);
        const currentLabelRef = useRef<any>(null);
        const mountedRef = useRef(false);

        // Stable callback refs to avoid stale closures in event listeners
        const onAnnotationCreatedRef = useRef(onAnnotationCreated);
        const onAnnotationEditedRef = useRef(onAnnotationEdited);
        const onSelectAnnotationRef = useRef(onSelectAnnotation);

        useEffect(() => {
            onAnnotationCreatedRef.current = onAnnotationCreated;
        }, [onAnnotationCreated]);

        useEffect(() => {
            onAnnotationEditedRef.current = onAnnotationEdited;
        }, [onAnnotationEdited]);

        useEffect(() => {
            onSelectAnnotationRef.current = onSelectAnnotation;
        }, [onSelectAnnotation]);

        // Mount: create Canvas instance, attach DOM, configure, listen to events
        useEffect(() => {
            const container = containerRef.current;
            if (!container) return undefined;

            const canvas = new Canvas();
            canvasRef.current = canvas;

            const canvasHTML = canvas.html();
            container.appendChild(canvasHTML);

            canvas.configure({
                smoothImage: true,
                autoborders: false,
                displayAllText: false,
                showProjections: false,
                forceDisableEditing: false,
            });

            canvas.fitCanvas();

            // Event: canvas.drawn
            const onDrawn = (e: Event): void => {
                const detail = (e as CustomEvent).detail;
                if (detail?.state) {
                    onAnnotationCreatedRef.current(detail.state);
                }
            };

            // Event: canvas.edited
            const onEdited = (e: Event): void => {
                const detail = (e as CustomEvent).detail;
                if (detail) {
                    onAnnotationEditedRef.current(
                        detail.state,
                        detail.points,
                        detail.rotation,
                    );
                }
            };

            // Event: canvas.clicked
            const onClicked = (e: Event): void => {
                const detail = (e as CustomEvent).detail;
                if (detail && typeof detail.clientID === 'number') {
                    onSelectAnnotationRef.current(detail.clientID);
                }
            };

            canvasHTML.addEventListener('canvas.drawn', onDrawn);
            canvasHTML.addEventListener('canvas.edited', onEdited);
            canvasHTML.addEventListener('canvas.clicked', onClicked);

            // ResizeObserver to keep canvas fitted
            const observer = new ResizeObserver(() => {
                if (canvasRef.current) {
                    canvasRef.current.fitCanvas();
                }
            });
            observer.observe(container);
            resizeObserverRef.current = observer;

            mountedRef.current = true;

            return () => {
                mountedRef.current = false;

                canvasHTML.removeEventListener('canvas.drawn', onDrawn);
                canvasHTML.removeEventListener('canvas.edited', onEdited);
                canvasHTML.removeEventListener('canvas.clicked', onClicked);

                observer.disconnect();
                resizeObserverRef.current = null;

                canvas.destroy();
                canvasRef.current = null;

                // Remove canvas DOM from container
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            };
        }, []);

        // Load frame data and annotations when job, frame, or annotations change
        useEffect(() => {
            if (!job || !canvasRef.current) return;

            let cancelled = false;

            (async () => {
                try {
                    const frameData = await job.frames.get(frame);
                    if (cancelled || !canvasRef.current) return;

                    // Apply link_id-based coloring to annotations
                    const coloredAnnotations = (annotations || []).map((state: any) => {
                        const linkId = getLinkIdFromState(state);
                        const color = linkIdToColor(linkId);
                        // eslint-disable-next-line no-param-reassign
                        state.color = color;
                        return state;
                    });

                    canvasRef.current.setup(frameData, coloredAnnotations);
                } catch (error) {
                    // Frame data unavailable — silently ignore
                    console.warn('EditableCanvas2DPanel: failed to load frame data', error);
                }
            })();

            return () => {
                cancelled = true;
            };
        }, [job, frame, annotations]);

        // Imperative handle
        useImperativeHandle(ref, () => ({
            startDraw(shapeType: string, label: any): void {
                currentLabelRef.current = label;
                if (!canvasRef.current) return;

                const drawData: DrawData = {
                    enabled: true,
                    shapeType,
                    rectDrawingMethod: RectDrawingMethod.CLASSIC,
                    crosshair: true,
                };
                canvasRef.current.draw(drawData);
            },

            cancelDraw(): void {
                if (!canvasRef.current) return;
                canvasRef.current.draw({ enabled: false });
            },

            activate(clientID: number | null): void {
                if (!canvasRef.current) return;
                canvasRef.current.activate(clientID);
            },

            getMode(): string {
                if (!canvasRef.current) return CanvasMode.IDLE;
                return canvasRef.current.mode();
            },
        }), []);

        const containerStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
        };

        if (!job) {
            return (
                <div className='fusion-canvas2d-container' style={containerStyle}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                    }}
                    >
                        <Spin tip='Loading job...' />
                    </div>
                </div>
            );
        }

        return (
            <div
                ref={containerRef}
                className='fusion-canvas2d-container'
                style={containerStyle}
            />
        );
    },
);

EditableCanvas2DPanel.displayName = 'EditableCanvas2DPanel';

export default EditableCanvas2DPanel;
