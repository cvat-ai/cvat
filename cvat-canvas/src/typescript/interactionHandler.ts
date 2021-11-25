// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';
import Crosshair from './crosshair';
import {
    translateToSVG, PropType, stringifyPoints, translateToCanvas,
} from './shared';

import {
    InteractionData, InteractionResult, Geometry, Configuration,
} from './canvasModel';

export interface InteractionHandler {
    transform(geometry: Geometry): void;
    interact(interactData: InteractionData): void;
    configurate(config: Configuration): void;
    destroy(): void;
    cancel(): void;
}

export class InteractionHandlerImpl implements InteractionHandler {
    private onInteraction: (shapes: InteractionResult[] | null, shapesUpdated?: boolean, isDone?: boolean) => void;
    private configuration: Configuration;
    private geometry: Geometry;
    private canvas: SVG.Container;
    private interactionData: InteractionData;
    private cursorPosition: { x: number; y: number };
    private shapesWereUpdated: boolean;
    private interactionShapes: SVG.Shape[];
    private currentInteractionShape: SVG.Shape | null;
    private crosshair: Crosshair;
    private threshold: SVG.Rect | null;
    private thresholdRectSize: number;
    private intermediateShape: PropType<InteractionData, 'intermediateShape'>;
    private drawnIntermediateShape: SVG.Shape;
    private thresholdWasModified: boolean;

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

        const minPosVerticesDefined = Number.isInteger(minPosVertices);
        const minNegVerticesDefined = Number.isInteger(minNegVertices) && minNegVertices >= 0;
        const minPosVerticesAchieved = !minPosVerticesDefined || minPosVertices <= positiveShapes.length;
        const minNegVerticesAchieved = !minNegVerticesDefined || minNegVertices <= negativeShapes.length;
        const minimumVerticesAchieved = minPosVerticesAchieved && minNegVerticesAchieved;
        return enabled && !ctrlKey && minimumVerticesAchieved && shapesWereUpdated;
    }

    private addThreshold(): void {
        const { x, y } = this.cursorPosition;
        this.threshold = this.canvas
            .rect(this.thresholdRectSize, this.thresholdRectSize)
            .fill('none')
            .addClass('cvat_canvas_threshold');
        this.threshold.center(x, y);
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
            if ((e.button === 0 || (e.button === 2 && this.interactionData.minNegVertices >= 0)) && !e.altKey) {
                e.preventDefault();
                const [cx, cy] = translateToSVG((this.canvas.node as any) as SVGSVGElement, [e.clientX, e.clientY]);
                if (!this.isWithinFrame(cx, cy)) return;
                if (!this.isWithinThreshold(cx, cy)) return;

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
                    if (this.interactionData.allowRemoveOnlyLast) {
                        if (this.interactionShapes.indexOf(self) !== this.interactionShapes.length - 1) {
                            return;
                        }
                    }

                    self.addClass('cvat_canvas_removable_interaction_point');
                    self.attr({
                        'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / this.geometry.scale,
                        r: (consts.BASE_POINT_SIZE * 1.5) / this.geometry.scale,
                    });

                    self.on('mousedown', (_e: MouseEvent): void => {
                        _e.preventDefault();
                        _e.stopPropagation();
                        self.remove();
                        this.shapesWereUpdated = true;
                        const shouldRaiseEvent = this.shouldRaiseEvent(_e.ctrlKey);
                        this.interactionShapes = this.interactionShapes.filter(
                            (shape: SVG.Shape): boolean => shape !== self,
                        );
                        if (this.interactionData.startWithBox && this.interactionShapes.length === 1) {
                            this.interactionShapes[0].style({ visibility: '' });
                        }
                        if (shouldRaiseEvent) {
                            this.onInteraction(this.prepareResult(), true, false);
                        }
                    });
                });

                self.on('mouseleave', (): void => {
                    self.removeClass('cvat_canvas_removable_interaction_point');
                    self.attr({
                        'stroke-width': consts.POINTS_STROKE_WIDTH / this.geometry.scale,
                        r: consts.BASE_POINT_SIZE / this.geometry.scale,
                    });

                    self.off('mousedown');
                });
            }
        };

        // clear this listener in release()
        this.canvas.on('mousedown.interaction', eventListener);
    }

    private interactRectangle(shouldFinish: boolean, onContinue?: () => void): void {
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
                this.canvas.off('mousedown.interaction', eventListener);
                this.interactionShapes.push(this.currentInteractionShape);
                this.shapesWereUpdated = true;

                if (shouldFinish) {
                    this.interact({ enabled: false });
                } else if (onContinue) {
                    onContinue();
                }
            })
            .addClass('cvat_canvas_shape_drawing')
            .attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            })
            .fill({ opacity: this.configuration.creationOpacity, color: 'white' });
    }

    private initInteraction(): void {
        if (this.interactionData.crosshair) {
            this.addCrosshair();
        } else if (this.crosshair) {
            this.removeCrosshair();
        }
        if (this.interactionData.enableThreshold) {
            this.addThreshold();
        } else if (this.threshold) {
            this.threshold.remove();
            this.threshold = null;
        }
    }

    private startInteraction(): void {
        if (this.interactionData.shapeType === 'rectangle') {
            this.interactRectangle(true);
        } else if (this.interactionData.shapeType === 'points') {
            if (this.interactionData.startWithBox) {
                this.interactRectangle(false, (): void => this.interactPoints());
            } else {
                this.interactPoints();
            }
        } else {
            throw new Error('Interactor implementation supports only rectangle and points');
        }
    }

    private release(): void {
        if (this.drawnIntermediateShape) {
            this.selectize(false, this.drawnIntermediateShape);
            this.drawnIntermediateShape.remove();
            this.drawnIntermediateShape = null;
        }

        if (this.crosshair) {
            this.removeCrosshair();
        }

        if (this.threshold) {
            this.threshold.remove();
            this.threshold = null;
        }

        this.canvas.off('mousedown.interaction');
        this.interactionShapes.forEach((shape: SVG.Shape): SVG.Shape => shape.remove());
        this.interactionShapes = [];
        if (this.currentInteractionShape) {
            this.currentInteractionShape.remove();
            this.currentInteractionShape = null;
        }
    }

    private isWithinThreshold(x: number, y: number): boolean {
        const [prev] = this.interactionShapes.slice(-1);
        if (!this.interactionData.enableThreshold || !prev) {
            return true;
        }

        const [prevCx, prevCy] = [(prev as SVG.Circle).cx(), (prev as SVG.Circle).cy()];
        const xDiff = Math.abs(prevCx - x);
        const yDiff = Math.abs(prevCy - y);

        return xDiff < this.thresholdRectSize / 2 && yDiff < this.thresholdRectSize / 2;
    }

    private isWithinFrame(x: number, y: number): boolean {
        const { offset, image } = this.geometry;
        const { width, height } = image;
        const [imageX, imageY] = [Math.round(x - offset), Math.round(y - offset)];
        return imageX >= 0 && imageX < width && imageY >= 0 && imageY < height;
    }

    private updateIntermediateShape(): void {
        const { intermediateShape, geometry } = this;
        if (this.drawnIntermediateShape) {
            this.selectize(false, this.drawnIntermediateShape);
            this.drawnIntermediateShape.remove();
        }

        if (!intermediateShape) return;
        const { shapeType, points } = intermediateShape;
        if (shapeType === 'polygon') {
            const erroredShape = shapeType === 'polygon' && points.length < 3 * 2;
            this.drawnIntermediateShape = this.canvas
                .polygon(stringifyPoints(translateToCanvas(geometry.offset, points)))
                .attr({
                    'color-rendering': 'optimizeQuality',
                    'shape-rendering': 'geometricprecision',
                    'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                    stroke: erroredShape ? 'red' : 'black',
                })
                .fill({ opacity: this.configuration.creationOpacity, color: 'white' })
                .addClass('cvat_canvas_interact_intermediate_shape');
            this.selectize(true, this.drawnIntermediateShape, erroredShape);
        } else {
            throw new Error(
                `Shape type "${shapeType}" was not implemented at interactionHandler::updateIntermediateShape`,
            );
        }
    }

    private selectize(value: boolean, shape: SVG.Element, erroredShape = false): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        if (value) {
            (shape as any).selectize(value, {
                deepSelect: true,
                pointSize: consts.BASE_POINT_SIZE / self.geometry.scale,
                rotationPoint: false,
                classPoints: 'cvat_canvas_interact_intermediate_shape_point',
                pointType(cx: number, cy: number): SVG.Circle {
                    return this.nested
                        .circle(this.options.pointSize)
                        .stroke(erroredShape ? 'red' : 'black')
                        .fill('black')
                        .center(cx, cy)
                        .attr({
                            'fill-opacity': 1,
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });
                },
            });
        } else {
            (shape as any).selectize(false, {
                deepSelect: true,
            });
        }

        const handler = shape.remember('_selectHandler');
        if (handler && handler.nested) {
            handler.nested.fill(shape.attr('fill'));
            // move green circle group(anchors) and polygon(lastChild) to the top of svg to make anchors hoverable
            handler.parent.node.prepend(handler.nested.node);
            handler.parent.node.prepend(handler.parent.node.lastChild);
        }
    }

    private visualComponentsChanged(interactionData: InteractionData): boolean {
        const allowedKeys = ['enabled', 'crosshair', 'enableThreshold', 'onChangeToolsBlockerState'];
        if (Object.keys(interactionData).every((key: string): boolean => allowedKeys.includes(key))) {
            if (this.interactionData.enableThreshold !== undefined && interactionData.enableThreshold !== undefined &&
                this.interactionData.enableThreshold !== interactionData.enableThreshold) {
                return true;
            }
            if (this.interactionData.crosshair !== undefined && interactionData.crosshair !== undefined &&
                this.interactionData.crosshair !== interactionData.crosshair) {
                return true;
            }
        }
        return false;
    }

    private onKeyUp = (e: KeyboardEvent): void => {
        if (this.interactionData.enabled && e.keyCode === 17) {
            if (this.interactionData.onChangeToolsBlockerState && !this.thresholdWasModified) {
                this.interactionData.onChangeToolsBlockerState('keyup');
            }
            if (this.shouldRaiseEvent(false)) {
                // 17 is ctrl
                this.onInteraction(this.prepareResult(), true, false);
            }
        }
    };

    private onKeyDown = (e: KeyboardEvent): void => {
        if (!e.repeat && this.interactionData.enabled && e.keyCode === 17) {
            if (this.interactionData.onChangeToolsBlockerState && !this.thresholdWasModified) {
                this.interactionData.onChangeToolsBlockerState('keydown');
            }
            this.thresholdWasModified = false;
        }
    };

    public constructor(
        onInteraction: (
            shapes: InteractionResult[] | null,
            shapesUpdated?: boolean,
            isDone?: boolean,
            threshold?: number,
        ) => void,
        canvas: SVG.Container,
        geometry: Geometry,
        configuration: Configuration,
    ) {
        this.onInteraction = (shapes: InteractionResult[] | null, shapesUpdated?: boolean, isDone?: boolean): void => {
            this.shapesWereUpdated = false;
            onInteraction(shapes, shapesUpdated, isDone, this.threshold ? this.thresholdRectSize / 2 : null);
        };
        this.canvas = canvas;
        this.configuration = configuration;
        this.geometry = geometry;
        this.shapesWereUpdated = false;
        this.interactionShapes = [];
        this.interactionData = { enabled: false };
        this.currentInteractionShape = null;
        this.crosshair = new Crosshair();
        this.threshold = null;
        this.thresholdRectSize = 300;
        this.intermediateShape = null;
        this.drawnIntermediateShape = null;
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
            if (this.threshold) {
                this.threshold.center(x, y);
            }
            if (this.interactionData.enableSliding && this.interactionShapes.length) {
                if (this.isWithinFrame(x, y)) {
                    if (this.interactionData.enableThreshold && !this.isWithinThreshold(x, y)) return;
                    this.onInteraction(
                        [
                            ...this.prepareResult(),
                            {
                                points: [x - this.geometry.offset, y - this.geometry.offset],
                                shapeType: 'points',
                                button: 0,
                            },
                        ],
                        true,
                        false,
                    );
                }
            }
        });

        this.canvas.on('wheel.interaction', (e: WheelEvent): void => {
            if (e.ctrlKey) {
                if (this.threshold) {
                    this.thresholdWasModified = true;
                    const { x, y } = this.cursorPosition;
                    e.preventDefault();
                    if (e.deltaY > 0) {
                        this.thresholdRectSize *= 6 / 5;
                    } else {
                        this.thresholdRectSize *= 5 / 6;
                    }
                    this.threshold.size(this.thresholdRectSize, this.thresholdRectSize);
                    this.threshold.center(x, y);
                }
            }
        });

        window.document.addEventListener('keyup', this.onKeyUp);
        window.document.addEventListener('keydown', this.onKeyDown);
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;

        if (this.crosshair) {
            this.crosshair.scale(this.geometry.scale);
        }

        const shapesToBeScaled = this.currentInteractionShape ?
            [...this.interactionShapes, this.currentInteractionShape] :
            [...this.interactionShapes];
        for (const shape of shapesToBeScaled) {
            if (shape.type === 'circle') {
                if (shape.hasClass('cvat_canvas_removable_interaction_point')) {
                    (shape as SVG.Circle).radius((consts.BASE_POINT_SIZE * 1.5) / this.geometry.scale);
                    shape.attr('stroke-width', consts.POINTS_SELECTED_STROKE_WIDTH / this.geometry.scale);
                } else {
                    (shape as SVG.Circle).radius(consts.BASE_POINT_SIZE / this.geometry.scale);
                    shape.attr('stroke-width', consts.POINTS_STROKE_WIDTH / this.geometry.scale);
                }
            } else {
                shape.attr('stroke-width', consts.BASE_STROKE_WIDTH / this.geometry.scale);
            }
        }

        for (const element of window.document.getElementsByClassName('cvat_canvas_interact_intermediate_shape_point')) {
            element.setAttribute('stroke-width', `${consts.POINTS_STROKE_WIDTH / (2 * this.geometry.scale)}`);
            element.setAttribute('r', `${consts.BASE_POINT_SIZE / this.geometry.scale}`);
        }

        if (this.drawnIntermediateShape) {
            this.drawnIntermediateShape.stroke({ width: consts.BASE_STROKE_WIDTH / this.geometry.scale });
        }
    }

    public interact(interactionData: InteractionData): void {
        if (interactionData.intermediateShape) {
            this.intermediateShape = interactionData.intermediateShape;
            this.updateIntermediateShape();
            if (this.interactionData.startWithBox) {
                this.interactionShapes[0].style({ visibility: 'hidden' });
            }
        } else if (interactionData.enabled && this.visualComponentsChanged(interactionData)) {
            this.interactionData = { ...this.interactionData, ...interactionData };
            this.initInteraction();
        } else if (interactionData.enabled) {
            this.interactionData = interactionData;
            this.initInteraction();
            this.startInteraction();
        } else {
            this.onInteraction(this.prepareResult(), this.shouldRaiseEvent(false), true);
            this.release();
            this.interactionData = interactionData;
        }
    }

    public configurate(configuration: Configuration): void {
        this.configuration = configuration;
        if (this.drawnIntermediateShape) {
            this.drawnIntermediateShape.fill({
                opacity: configuration.creationOpacity,
            });
        }

        // when interactRectangle
        if (this.currentInteractionShape && this.currentInteractionShape.type === 'rect') {
            this.currentInteractionShape.fill({ opacity: configuration.creationOpacity });
        }

        // when interactPoints with startwithbbox
        if (this.interactionShapes[0] && this.interactionShapes[0].type === 'rect') {
            this.interactionShapes[0].fill({ opacity: configuration.creationOpacity });
        }
    }

    public cancel(): void {
        this.release();
        this.onInteraction(null);
    }

    public destroy(): void {
        window.document.removeEventListener('keyup', this.onKeyUp);
        window.document.removeEventListener('keydown', this.onKeyDown);
    }
}
