// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';
import Crosshair from './crosshair';
import { translateToSVG } from './shared';
import { InteractionData, InteractionResult, Geometry } from './canvasModel';

export interface InteractionHandler {
    transform(geometry: Geometry): void;
    interact(interactData: InteractionData): void;
    cancel(): void;
}

export class InteractionHandlerImpl implements InteractionHandler {
    private onInteraction: (shapes: InteractionResult[] | null, shapesUpdated?: boolean, isDone?: boolean) => void;
    private geometry: Geometry;
    private canvas: SVG.Container;
    private interactionData: InteractionData;
    private cursorPosition: { x: number; y: number };
    private shapesWereUpdated: boolean;
    private interactionShapes: SVG.Shape[];
    private currentInteractionShape: SVG.Shape | null;
    private crosshair: Crosshair;

    private prepareResult(): InteractionResult[] {
        return this.interactionShapes.map(
            (shape: SVG.Shape): InteractionResult => {
                if (shape.type === 'circle') {
                    const points = [(shape as SVG.Circle).cx(), (shape as SVG.Circle).cy()];
                    return {
                        points: points.map((coord: number): number => coord - this.geometry.offset),
                        shapeType: 'points',
                        button: shape.attr('stroke') === 'green' ? 0 : 2,
                    };
                }

                const bbox = ((shape.node as any) as SVGRectElement).getBBox();
                const points = [bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height];
                return {
                    points: points.map((coord: number): number => coord - this.geometry.offset),
                    shapeType: 'rectangle',
                    button: 0,
                };
            },
        );
    }

    private shouldRaiseEvent(ctrlKey: boolean): boolean {
        const { interactionData, interactionShapes, shapesWereUpdated } = this;
        const { minPosVertices, minNegVertices, enabled } = interactionData;

        const positiveShapes = interactionShapes.filter(
            (shape: SVG.Shape): boolean => (shape as any).attr('stroke') === 'green',
        );
        const negativeShapes = interactionShapes.filter(
            (shape: SVG.Shape): boolean => (shape as any).attr('stroke') !== 'green',
        );

        if (interactionData.shapeType === 'rectangle') {
            return enabled && !ctrlKey && !!interactionShapes.length;
        }

        const minimumVerticesAchieved =
            (typeof minPosVertices === 'undefined' || minPosVertices <= positiveShapes.length) &&
            (typeof minNegVertices === 'undefined' || minPosVertices <= negativeShapes.length);
        return enabled && !ctrlKey && minimumVerticesAchieved && shapesWereUpdated;
    }

    private addCrosshair(): void {
        const { x, y } = this.cursorPosition;
        this.crosshair.show(this.canvas, x, y, this.geometry.scale);
    }

    private removeCrosshair(): void {
        this.crosshair.hide();
    }

    private interactPoints(): void {
        const eventListener = (e: MouseEvent): void => {
            if ((e.button === 0 || e.button === 2) && !e.altKey) {
                e.preventDefault();
                const [cx, cy] = translateToSVG((this.canvas.node as any) as SVGSVGElement, [e.clientX, e.clientY]);
                this.currentInteractionShape = this.canvas
                    .circle((consts.BASE_POINT_SIZE * 2) / this.geometry.scale)
                    .center(cx, cy)
                    .fill('white')
                    .stroke(e.button === 0 ? 'green' : 'red')
                    .addClass('cvat_interaction_point')
                    .attr({
                        'stroke-width': consts.POINTS_STROKE_WIDTH / this.geometry.scale,
                    });

                this.interactionShapes.push(this.currentInteractionShape);
                this.shapesWereUpdated = true;
                if (this.shouldRaiseEvent(e.ctrlKey)) {
                    this.onInteraction(this.prepareResult(), true, false);
                }

                const self = this.currentInteractionShape;
                self.on('mouseenter', (): void => {
                    self.attr({
                        'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / this.geometry.scale,
                    });

                    self.on('mousedown', (_e: MouseEvent): void => {
                        _e.preventDefault();
                        _e.stopPropagation();
                        self.remove();
                        this.interactionShapes = this.interactionShapes.filter(
                            (shape: SVG.Shape): boolean => shape !== self,
                        );
                        this.shapesWereUpdated = true;
                        if (this.shouldRaiseEvent(_e.ctrlKey)) {
                            this.onInteraction(this.prepareResult(), true, false);
                        }
                    });
                });

                self.on('mouseleave', (): void => {
                    self.attr({
                        'stroke-width': consts.POINTS_STROKE_WIDTH / this.geometry.scale,
                    });

                    self.off('mousedown');
                });
            }
        };

        // clear this listener in relese()
        this.canvas.on('mousedown.interaction', eventListener);
    }

    private interactRectangle(): void {
        let initialized = false;
        const eventListener = (e: MouseEvent): void => {
            if (e.button === 0 && !e.altKey) {
                if (!initialized) {
                    (this.currentInteractionShape as any).draw(e, { snapToGrid: 0.1 });
                    initialized = true;
                } else {
                    (this.currentInteractionShape as any).draw(e);
                }
            }
        };

        this.currentInteractionShape = this.canvas.rect();
        this.canvas.on('mousedown.interaction', eventListener);
        this.currentInteractionShape
            .on('drawstop', (): void => {
                this.interactionShapes.push(this.currentInteractionShape);
                this.shapesWereUpdated = true;

                this.canvas.off('mousedown.interaction', eventListener);
                this.interact({ enabled: false });
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
    }

    private initInteraction(): void {
        if (this.interactionData.crosshair) {
            this.addCrosshair();
        }
    }

    private startInteraction(): void {
        if (this.interactionData.shapeType === 'rectangle') {
            this.interactRectangle();
        } else if (this.interactionData.shapeType === 'points') {
            this.interactPoints();
        } else {
            throw new Error('Interactor implementation supports only rectangle and points');
        }
    }

    private release(): void {
        if (this.crosshair) {
            this.removeCrosshair();
        }

        this.canvas.off('mousedown.interaction');
        this.interactionShapes.forEach((shape: SVG.Shape): SVG.Shape => shape.remove());
        this.interactionShapes = [];
        if (this.currentInteractionShape) {
            this.currentInteractionShape.remove();
            this.currentInteractionShape = null;
        }
    }

    public constructor(
        onInteraction: (shapes: InteractionResult[] | null, shapesUpdated?: boolean, isDone?: boolean) => void,
        canvas: SVG.Container,
        geometry: Geometry,
    ) {
        this.onInteraction = (shapes: InteractionResult[] | null, shapesUpdated?: boolean, isDone?: boolean): void => {
            this.shapesWereUpdated = false;
            onInteraction(shapes, shapesUpdated, isDone);
        };
        this.canvas = canvas;
        this.geometry = geometry;
        this.shapesWereUpdated = false;
        this.interactionShapes = [];
        this.interactionData = { enabled: false };
        this.currentInteractionShape = null;
        this.crosshair = new Crosshair();
        this.cursorPosition = {
            x: 0,
            y: 0,
        };

        this.canvas.on('mousemove.interaction', (e: MouseEvent): void => {
            const [x, y] = translateToSVG((this.canvas.node as any) as SVGSVGElement, [e.clientX, e.clientY]);
            this.cursorPosition = { x, y };
            if (this.crosshair) {
                this.crosshair.move(x, y);
            }
        });

        document.body.addEventListener('keyup', (e: KeyboardEvent): void => {
            if (e.keyCode === 17 && this.shouldRaiseEvent(false)) {
                // 17 is ctrl
                this.onInteraction(this.prepareResult(), true, false);
            }
        });
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

        if (this.crosshair) {
            this.crosshair.scale(this.geometry.scale);
        }

        const shapesToBeScaled = this.currentInteractionShape
            ? [...this.interactionShapes, this.currentInteractionShape]
            : [...this.interactionShapes];
        for (const shape of shapesToBeScaled) {
            if (shape.type === 'circle') {
                (shape as SVG.Circle).radius(consts.BASE_POINT_SIZE / this.geometry.scale);
                shape.attr('stroke-width', consts.POINTS_STROKE_WIDTH / this.geometry.scale);
            } else {
                shape.attr('stroke-width', consts.BASE_STROKE_WIDTH / this.geometry.scale);
            }
        }
    }

    public interact(interactionData: InteractionData): void {
        if (interactionData.enabled) {
            this.interactionData = interactionData;
            this.initInteraction();
            this.startInteraction();
        } else {
            this.onInteraction(this.prepareResult(), this.shouldRaiseEvent(false), true);
            this.release();
            this.interactionData = interactionData;
        }
    }

    public cancel(): void {
        this.release();
        this.onInteraction(null);
    }
}
