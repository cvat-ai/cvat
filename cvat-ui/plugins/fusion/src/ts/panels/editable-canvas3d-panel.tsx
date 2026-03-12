// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useEffect, useRef, useImperativeHandle, forwardRef, useCallback,
} from 'react';
import Spin from 'antd/lib/spin';

import { Canvas3d } from 'cvat-canvas3d/src/typescript/canvas3d';
import { DrawData, Mode, Configuration } from 'cvat-canvas3d/src/typescript/canvas3dModel';
import type { ViewsDOM } from 'cvat-canvas3d/src/typescript/canvas3dView';

import { linkIdToColor, getLinkIdFromState } from '../utils/color';

const STYLES = `
.fusion-canvas3d-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}
.fusion-canvas3d-perspective {
    flex: 7;
    position: relative;
    overflow: hidden;
}
.fusion-canvas3d-ortho-row {
    flex: 3;
    display: flex;
    flex-direction: row;
    border-top: 1px solid #444;
}
.fusion-canvas3d-ortho-view {
    flex: 1;
    position: relative;
    overflow: hidden;
    border-right: 1px solid #444;
}
.fusion-canvas3d-ortho-view:last-child {
    border-right: none;
}
`;

export interface EditableCanvas3DPanelProps {
    job: any;
    frame: number;
    annotations: any[];
    onAnnotationCreated: (drawData: any) => void;
    onAnnotationEdited: (state: any, points: number[]) => void;
    onSelectAnnotation: (clientID: number) => void;
}

export interface Canvas3DHandle {
    startDraw(label: any): void;
    cancelDraw(): void;
    activate(clientID: number | null): void;
    getMode(): string;
}

function applyCanvasStyle(el: HTMLCanvasElement | HTMLElement): void {
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.display = 'block';
}

const EditableCanvas3DPanel = forwardRef<Canvas3DHandle, EditableCanvas3DPanelProps>(
    (props, ref) => {
        const {
            job, frame, annotations, onAnnotationCreated, onAnnotationEdited, onSelectAnnotation,
        } = props;

        const containerRef = useRef<HTMLDivElement>(null);
        const perspectiveRef = useRef<HTMLDivElement>(null);
        const topRef = useRef<HTMLDivElement>(null);
        const sideRef = useRef<HTMLDivElement>(null);
        const frontRef = useRef<HTMLDivElement>(null);

        const canvasRef = useRef<Canvas3d | null>(null);
        const viewsRef = useRef<ViewsDOM | null>(null);
        const rafRef = useRef<number>(0);
        const mountedRef = useRef<boolean>(true);
        const styleInjectedRef = useRef<boolean>(false);

        // Inject styles once
        useEffect(() => {
            if (!styleInjectedRef.current) {
                const styleEl = document.createElement('style');
                styleEl.textContent = STYLES;
                document.head.appendChild(styleEl);
                styleInjectedRef.current = true;
                return () => {
                    document.head.removeChild(styleEl);
                };
            }
            return undefined;
        }, []);

        // Canvas3d initialization — mount only
        useEffect(() => {
            mountedRef.current = true;

            const canvas3d = new Canvas3d();
            canvasRef.current = canvas3d;

            const views = canvas3d.html();
            viewsRef.current = views;

            // Configure defaults
            canvas3d.configure({
                shapeOpacity: 0.4,
                selectedShapeOpacity: 0.6,
                outlinedBorders: 'black',
                colorBy: 'instance',
                orientationVisibility: { x: true, y: true, z: true },
            } as Partial<Configuration> as Configuration);

            // Mount canvases into DOM containers
            if (perspectiveRef.current) {
                applyCanvasStyle(views.perspective);
                perspectiveRef.current.appendChild(views.perspective);
            }
            if (topRef.current) {
                applyCanvasStyle(views.top);
                topRef.current.appendChild(views.top);
            }
            if (sideRef.current) {
                applyCanvasStyle(views.side);
                sideRef.current.appendChild(views.side);
            }
            if (frontRef.current) {
                applyCanvasStyle(views.front);
                frontRef.current.appendChild(views.front);
            }

            // Start render loop
            const renderLoop = (): void => {
                if (!mountedRef.current) return;
                canvas3d.render();
                rafRef.current = requestAnimationFrame(renderLoop);
            };
            rafRef.current = requestAnimationFrame(renderLoop);

            return () => {
                mountedRef.current = false;
                cancelAnimationFrame(rafRef.current);
                canvas3d.destroy();
                canvasRef.current = null;
                viewsRef.current = null;

                // Clean up appended canvases
                [perspectiveRef, topRef, sideRef, frontRef].forEach((r) => {
                    if (r.current) {
                        while (r.current.firstChild) {
                            r.current.removeChild(r.current.firstChild);
                        }
                    }
                });
            };
        }, []);

        // Event handlers on the perspective canvas
        useEffect(() => {
            const views = viewsRef.current;
            if (!views) return undefined;

            const perspectiveEl = views.perspective;

            const handleDrawn = (e: Event): void => {
                const detail = (e as CustomEvent).detail;
                if (detail?.state) {
                    onAnnotationCreated(detail.state);
                }
            };

            const handleEdited = (e: Event): void => {
                const detail = (e as CustomEvent).detail;
                if (detail?.state) {
                    onAnnotationEdited(detail.state, detail.points || []);
                }
            };

            const handleClicked = (e: Event): void => {
                const detail = (e as CustomEvent).detail;
                if (typeof detail?.clientID === 'number') {
                    onSelectAnnotation(detail.clientID);
                }
            };

            perspectiveEl.addEventListener('canvas.drawn', handleDrawn);
            perspectiveEl.addEventListener('canvas.edited', handleEdited);
            perspectiveEl.addEventListener('canvas.clicked', handleClicked);

            return () => {
                perspectiveEl.removeEventListener('canvas.drawn', handleDrawn);
                perspectiveEl.removeEventListener('canvas.edited', handleEdited);
                perspectiveEl.removeEventListener('canvas.clicked', handleClicked);
            };
        }, [onAnnotationCreated, onAnnotationEdited, onSelectAnnotation]);

        // Keyboard controls — forward key events to canvas3d
        useEffect(() => {
            const canvas3d = canvasRef.current;
            const views = viewsRef.current;
            if (!canvas3d || !views) return undefined;

            const perspectiveEl = views.perspective;

            const handleKey = (e: KeyboardEvent): void => {
                canvas3d.keyControls(e);
            };

            perspectiveEl.addEventListener('keydown', handleKey);
            perspectiveEl.addEventListener('keyup', handleKey);

            // Make perspective canvas focusable
            if (!perspectiveEl.getAttribute('tabindex')) {
                perspectiveEl.setAttribute('tabindex', '0');
            }

            return () => {
                perspectiveEl.removeEventListener('keydown', handleKey);
                perspectiveEl.removeEventListener('keyup', handleKey);
            };
        }, []);

        // Frame data loading — setup when job, frame, or annotations change
        useEffect(() => {
            const canvas3d = canvasRef.current;
            if (!canvas3d || !job) return;

            let cancelled = false;

            (async () => {
                try {
                    const frameData = await job.frames.get(frame);
                    if (cancelled || !mountedRef.current) return;

                    // Apply link-based colors to annotations
                    const coloredAnnotations = annotations.map((state: any) => {
                        const linkId = getLinkIdFromState(state);
                        const color = linkIdToColor(linkId);
                        return { ...state, color };
                    });

                    canvas3d.setup(frameData, coloredAnnotations);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('EditableCanvas3DPanel: failed to load frame data', error);
                }
            })();

            return () => {
                cancelled = true;
            };
        }, [job, frame, annotations]);

        // Imperative handle
        const startDraw = useCallback((label: any): void => {
            const canvas3d = canvasRef.current;
            if (!canvas3d) return;

            const drawData: DrawData = {
                enabled: true,
                shapeType: 'cuboid',
                initialState: {
                    shapeType: 'cuboid',
                    objectType: 'shape',
                    label,
                    attributes: {},
                },
            };
            canvas3d.draw(drawData);
        }, []);

        const cancelDraw = useCallback((): void => {
            const canvas3d = canvasRef.current;
            if (!canvas3d) return;
            canvas3d.draw({ enabled: false });
        }, []);

        const activate = useCallback((clientID: number | null): void => {
            const canvas3d = canvasRef.current;
            if (!canvas3d) return;
            canvas3d.activate(clientID);
        }, []);

        const getMode = useCallback((): string => {
            const canvas3d = canvasRef.current;
            if (!canvas3d) return Mode.IDLE;
            return canvas3d.mode();
        }, []);

        useImperativeHandle(ref, () => ({
            startDraw,
            cancelDraw,
            activate,
            getMode,
        }), [startDraw, cancelDraw, activate, getMode]);

        if (!job) {
            return (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Spin size='large' tip='Loading 3D canvas...' />
                </div>
            );
        }

        return (
            <div ref={containerRef} className='fusion-canvas3d-container'>
                <div ref={perspectiveRef} className='fusion-canvas3d-perspective' />
                <div className='fusion-canvas3d-ortho-row'>
                    <div ref={topRef} className='fusion-canvas3d-ortho-view' />
                    <div ref={sideRef} className='fusion-canvas3d-ortho-view' />
                    <div ref={frontRef} className='fusion-canvas3d-ortho-view' />
                </div>
            </div>
        );
    },
);

EditableCanvas3DPanel.displayName = 'EditableCanvas3DPanel';

export default EditableCanvas3DPanel;
