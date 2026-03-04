// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';
import Crosshair from './crosshair';
import {
    translateToSVG, stringifyPoints, translateToCanvas,
    expandChannels, imageDataToDataURL, translateFromCanvas,
} from './shared';
import {
    InteractionData, InteractionResult, Geometry, Configuration, CanvasHint,
} from './canvasModel';

export interface InteractionHandler {
    transform(geometry: Geometry): void;
    interact(interactData: InteractionData): void;
    configure(config: Configuration): void;
    destroy(): void;
    cancel(): void;
}

type InteractorSettings = Required<InteractionData['settings']>;
type SupportedShapes = SVG.Rect | SVG.Circle;

const DELETE_BUTTON_OFFSET = 10;

function getTopRightPosition(shape: SVG.Rect | SVG.Circle): { x: number; y: number } {
    if (shape instanceof SVG.Rect) {
        return {
            x: shape.x() + shape.width(),
            y: shape.y(),
        };
    } else if (shape instanceof SVG.Circle) {
        return {
            x: shape.cx() + shape.attr('r'),
            y: shape.cy() - shape.attr('r'),
        }
    } else {
        throw new Error('Unsupported shape type');
    }
}

export class InteractionHandlerImpl implements InteractionHandler {
    private settings: InteractorSettings;
    private enabled: boolean;
    private command: 'draw_box' | 'draw_points' | 'put_shapes' | 'refine' | 'idle';
    private currentRectangle: SVG.Rect | null;
    private rectanglePrompts: SVG.Rect[];
    private pointPrompts: SVG.Circle[];
    private allPrompts: SupportedShapes[];
    private deletionButtons: Map<SupportedShapes, SVG.G>;
    private intermediateShapes: (SVG.Image | SVG.Polygon)[];
    private onInteraction: (interactionResult: InteractionResult[], finished?: boolean) => void;
    private onMessage: (messages: CanvasHint[] | null, topic: string) => void;
    private geometry: Geometry;
    private container: SVG.Container;
    private configuration: Configuration;
    private effectiveStrokeWidth: number;
    private effectivePointSize: number;
    private effectiveShapeOpacity: number;
    private lastMousePosition: { x: number; y: number };
    private crosshair: Crosshair;

    public constructor(
        onInteraction: InteractionHandlerImpl['onInteraction'],
        onMessage: InteractionHandlerImpl['onMessage'],
        adoptedContent: SVG.Container,
        geometry: Geometry,
        configuration: Configuration,
    ) {
        this.onInteraction = onInteraction;
        this.onMessage = onMessage;
        this.enabled = false;
        this.command = 'idle';
        this.crosshair = new Crosshair();
        this.settings = {
            crosshair: false,
            points_type: 'any',
            removalStrategy: 'any',
            allowPointsSliding: false,
        };
        this.container = adoptedContent;
        this.geometry = geometry;
        this.configuration = configuration;
        this.currentRectangle = null;
        this.rectanglePrompts = [];
        this.pointPrompts = [];
        this.allPrompts = [];
        this.intermediateShapes = [];
        this.deletionButtons = new Map();
        this.effectiveStrokeWidth = consts.BASE_STROKE_WIDTH / this.geometry.scale;
        this.effectivePointSize = (configuration.controlPointsSize ?? consts.BASE_POINT_SIZE) / this.geometry.scale;
        this.effectiveShapeOpacity = configuration.selectedShapeOpacity ?? 0.5;
        this.lastMousePosition = { x: 0, y: 0 };
        this.container.on('mousedown', this.onMouseDown);
        this.container.on('mousemove', this.onMouseMove);
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        this.effectiveStrokeWidth = consts.BASE_STROKE_WIDTH / this.geometry.scale;
        this.effectivePointSize = (this.configuration.controlPointsSize ?? consts.BASE_POINT_SIZE) / this.geometry.scale;

        if (this.currentRectangle) {
            this.currentRectangle.stroke({ width: this.effectiveStrokeWidth });
            this.currentRectangle.opacity(this.effectiveShapeOpacity);
        }

        this.allPrompts.forEach((shape) => {
            shape.stroke({ width: this.effectiveStrokeWidth });
            if (shape instanceof SVG.Rect) {
                shape.opacity(this.effectiveShapeOpacity);
            } else if (shape instanceof SVG.Circle) {
                shape.attr('r', this.effectivePointSize);
            }
        });

        this.deletionButtons.forEach((deleteButtonGroup, shape) => {
            const { scale } = this.geometry;
            const group = deleteButtonGroup;

            const { x, y } = getTopRightPosition(shape);
            group.children().forEach((child) => {
                if (child instanceof SVG.Circle) {
                    child.attr('r', this.effectivePointSize);
                    child.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });
                } else if (child instanceof SVG.Path) {
                    const coords = [3, 7].map((val) => (val / 10) * this.effectivePointSize * 2);
                    const pathData = `M ${coords[0]} ${coords[0]} L ${coords[1]} ${coords[1]} M ${coords[1]} ${coords[0]} L ${coords[0]} ${coords[1]}`;
                    (child as SVG.Path).plot(pathData);
                    child.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth, linecap: 'round', linejoin: 'round' });
                }
                child.center(x + DELETE_BUTTON_OFFSET / scale, y - DELETE_BUTTON_OFFSET / scale);
            });
        });
    }

    public interact(interactData: InteractionData): void {
        if (interactData.hasOwnProperty('settings')) {
            this.settings = {
                ...this.settings,
                ...interactData.settings,
            };
        }

        if (interactData.enabled) {
            this.enabled = true;
        } else if (this.enabled) {
            this.notify(true);
            this.onInteraction(null);
            this.release();
        }

        if (this.enabled) {
            if (this.settings.crosshair) {
                this.crosshair.show(this.container, this.lastMousePosition.x, this.lastMousePosition.y, this.geometry.scale);
            } else {
                this.crosshair.hide();
            }

            if (this.settings.removalStrategy === 'last') {
                this.deletionButtons.values().forEach((deleteBtn) => deleteBtn.hide());
                const lastShape = this.allPrompts?.[this.allPrompts.length - 1];
                if (lastShape) {
                    this.deletionButtons.get(lastShape)?.show();
                }
            } else {
                this.deletionButtons.forEach((deleteBtn) => deleteBtn.show());
            }

            const { command } = interactData;
            if (['draw_box', 'draw_points'].includes(command)) {
                if (command === 'draw_box') {
                    this.drawBox();
                } else {
                    this.drawPoints();
                    this.currentRectangle?.off('drawstop');
                    this.currentRectangle?.remove();
                    this.currentRectangle = null;
                }
            } else if (command === 'put_shapes') {
                this.putShapes(interactData.payload.shapes);
            } else if (command === 'refine') {
                this.refine();
            }
        }
    }

    public configure(config: Configuration): void {
        this.configuration = config;
        this.effectivePointSize = (config.controlPointsSize ?? consts.BASE_POINT_SIZE) / this.geometry.scale;
        this.effectiveShapeOpacity = config.selectedShapeOpacity ?? 0.5;
    }

    public destroy(): void {
        this.container.off('mousedown', this.onMouseDown);
        this.container.off('mousemove', this.onMouseMove);
        this.release();
    }

    public cancel(): void {
        this.onInteraction(null);
        this.release();
    }

    private release(): void {
        this.enabled = false;
        this.command = 'idle';
        this.onMessage(null, 'interaction');

        if (this.currentRectangle) {
            this.currentRectangle.off('drawstop');
            this.currentRectangle.remove();
            this.currentRectangle = null;
        }

        this.rectanglePrompts.forEach((rect) => {
            rect.remove();
        });

        this.pointPrompts.forEach((point) => {
            point.off('mouseenter');
            point.off('mouseleave');
            point.off('mousedown');
            point.remove();
        });

        this.deletionButtons.forEach((deleteBtn) => {
            deleteBtn.off('mouseover');
            deleteBtn.off('mouseout');
            deleteBtn.off('mousedown');
            deleteBtn.remove();
        });

        this.intermediateShapes.forEach((shape) => {
            shape.remove();
        });

        this.rectanglePrompts = [];
        this.pointPrompts = [];
        this.allPrompts = [];
        this.intermediateShapes = [];
        this.deletionButtons.clear();
        this.crosshair.hide();
    }

    private onMouseMove = (e: MouseEvent) => {
        const [x, y] = [e.offsetX, e.offsetY];
        this.lastMousePosition = { x, y };
        this.crosshair.move(x, y);

        if (this.command === 'draw_points' && this.settings.allowPointsSliding && this.pointPrompts.length) {
            const lastPoint = this.pointPrompts[this.pointPrompts.length - 1];
            const [cx, cy] = [lastPoint.cx(), lastPoint.cy()];
            const threshold = 5;
            if (Math.hypot(cx - x, cy - y) > threshold) {
                this.notify(false, [{
                    points: translateFromCanvas(this.geometry.offset, [x, y]),
                    shapeType: 'points',
                    type: 'positive' as const,
                }]);
            }
        }
    }

    private onMouseDown = (e: MouseEvent) => {
        if (!this.enabled) {
            return;
        }

        if (this.command === 'draw_box') {
            (this.currentRectangle as any).draw(e);
        } else if (this.command === 'draw_points') {
            if (e.button !== 0 && e.button !== 2) {
                return;
            }

            let color = 'green';
            if (this.settings.points_type === 'any') {
                color = e.button === 0 ? 'green' : 'red';
            } else if (this.settings.points_type === 'positive') {
                color = 'green';
            } else if (this.settings.points_type === 'negative') {
                color = 'red';
            }

            const point = this.container.circle(this.effectivePointSize * 2)
                .fill('white')
                .stroke(color)
                .addClass('cvat_interaction_point')
                .center(e.offsetX, e.offsetY);

            const pointCanBeRemoved = () => {
                return this.settings.removalStrategy === 'any' || (
                    this.settings.removalStrategy === 'last' &&
                    this.allPrompts.indexOf(point) === this.allPrompts.length - 1
                );
            };

            point.on('mouseenter', (e: MouseEvent) => {
                if (pointCanBeRemoved()) {
                    e.preventDefault();
                    e.stopPropagation();
                    point.addClass('cvat_canvas_removable_interaction_point');
                    point.attr({ 'stroke-width': this.effectiveStrokeWidth * 1.5, r: this.effectivePointSize * 1.1 });
                }
            });

            point.on('mouseleave', (): void => {
                point.removeClass('cvat_canvas_removable_interaction_point');
                point.attr({ 'stroke-width': this.effectiveStrokeWidth, r: this.effectivePointSize });
            });

            point.on('mousedown', (e: MouseEvent): void => {
                if (pointCanBeRemoved()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteShape(point);
                }
            });

            this.pointPrompts.push(point);
            this.allPrompts.push(point);
            this.drawDeleteButton(point);
            this.notify();
        }
    };

    private drawBox(): void {
        if (this.command === 'draw_box') {
            return;
        }

        this.command = 'draw_box';
        const initNewDrawingBox = () => {
            this.currentRectangle = this.container.rect()
                .fill('rgba(0, 0, 0, 0)')
                .stroke({ color: '#000000', width: this.effectiveStrokeWidth })
                .opacity(this.effectiveShapeOpacity)
                .addClass('cvat_canvas_shape_drawing');
        };

        this.onMessage([{
            type: 'text',
            content: 'Draw a prompt rectangle using top-left and bottom-right points.',
            icon: 'info',
        }], 'interaction');

        initNewDrawingBox();
        this.currentRectangle.on('drawstop', (e) => {
            this.currentRectangle.off('drawstop');
            this.rectanglePrompts.push(this.currentRectangle as SVG.Rect);
            this.allPrompts.push(this.currentRectangle);
            this.drawDeleteButton(this.currentRectangle);
            this.currentRectangle = null;
            initNewDrawingBox();
            this.notify();
        });
    }

    private drawPoints(): void {
        const { points_type } = this.settings;

        this.command = 'draw_points';
        let text = 'Draw prompt points. Use left/right mouse button for positive/negative prompts.';
        if (points_type === 'positive') {
            text = 'Draw positive prompt points by clicking the canvas.';
        } else if (points_type === 'negative') {
            text = 'Draw negative prompt points by clicking the canvas.';
        }

        this.onMessage([{
            type: 'text',
            content: text,
            icon: 'info',
        }], 'interaction');
    }

    private drawDeleteButton(shape: SVG.Rect | SVG.Circle): void {
        const { scale } = this.geometry;
        let { x, y } = getTopRightPosition(shape);

        const deleteButtonGroup = this.container.group().addClass('cvat_interaction_delete_button') as SVG.G;
        const circleBg = deleteButtonGroup.circle(this.effectivePointSize * 2)
            .fill('#ff3333')
            .stroke({ color: '#ffffff', width: this.effectiveStrokeWidth })
            .center(x + DELETE_BUTTON_OFFSET / scale, y - DELETE_BUTTON_OFFSET / scale);

        const p = [3, 7].map((val) => (val / 10) * this.effectivePointSize * 2);
        deleteButtonGroup.path(`M ${p[0]} ${p[0]} L ${p[1]} ${p[1]} M ${p[1]} ${p[0]} L ${p[0]} ${p[1]}`)
            .stroke({ color: '#ffffff', width: this.effectiveStrokeWidth, linecap: 'round', linejoin: 'round' })
            .center(x + DELETE_BUTTON_OFFSET / scale, y - DELETE_BUTTON_OFFSET / scale)
            .fill('none');

        deleteButtonGroup.on('mouseover', () => {
            circleBg.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth * 1.5 });
        });

        deleteButtonGroup.on('mouseout', () => {
            circleBg.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });
        });

        deleteButtonGroup.on('mousedown', (e: any) => {
            e.stopPropagation();
            this.deleteShape(shape);
        });

        this.deletionButtons.set(shape, deleteButtonGroup);
    }

    private deleteShape(shape: SupportedShapes): void {
        const shapeIndex = this.allPrompts.indexOf(shape);
        if (shapeIndex > -1) {
            this.allPrompts.splice(shapeIndex, 1);
        }

        if (shape instanceof SVG.Circle) {
            const pointIndex = this.pointPrompts.findIndex((p) => p === shape);
            if (pointIndex !== -1) {
                this.pointPrompts.splice(pointIndex, 1);
            }
        } else if (shape instanceof SVG.Rect) {
            const rectIndex = this.rectanglePrompts.findIndex((r) => r === shape);
            if (rectIndex !== -1) {
                this.rectanglePrompts.splice(rectIndex, 1);
            }
        }

        // Remove delete button from map and canvas
        const deleteBtn = this.deletionButtons.get(shape);
        if (deleteBtn) {
            deleteBtn.remove();
            this.deletionButtons.delete(shape);
        }

        shape.remove();
        this.notify();
    }

    private putShapes(shapes: InteractionData['payload']['shapes']): void {
        // TODO: add ID and incremental update
        this.intermediateShapes.forEach((shape) => shape.remove());
        this.intermediateShapes = [];

        for (const shape of shapes) {
            const { points, shapeType } = shape;
            if (shapeType === 'polygon') {
                const isInvalidShape = points.length < 3 * 2;
                const shape = this.container
                .polygon(stringifyPoints(translateToCanvas(this.geometry.offset, points)))
                .attr({
                    'color-rendering': 'optimizeQuality',
                    'shape-rendering': 'geometricprecision',
                    'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                    stroke: isInvalidShape ? 'red' : 'black',
                })
                .fill({ opacity: this.effectiveShapeOpacity, color: 'white' })
                .addClass('cvat_canvas_interact_intermediate_shape');
                this.container.node.prepend(shape.node);
                this.intermediateShapes.push(shape);
            } else if (shapeType === 'mask') {
                const [left, top, right, bottom] = points.slice(-4);
                const imageBitmap = expandChannels(255, 255, 255, points);
                const image = this.container.image().attr({
                    'color-rendering': 'optimizeQuality',
                    'shape-rendering': 'geometricprecision',
                    'pointer-events': 'none',
                    opacity: 0.5,
                }).addClass('cvat_canvas_interact_intermediate_shape');
                image.move(this.geometry.offset + left, this.geometry.offset + top);
                this.container.node.prepend(image.node);
                this.intermediateShapes.push(image);

                imageDataToDataURL(
                    imageBitmap,
                    right - left + 1,
                    bottom - top + 1,
                    (dataURL: string) => new Promise<void>((resolve, reject) => {
                        image.loaded(() => resolve());
                        image.error(() => reject());
                        image.load(dataURL);
                    })
                );
            }
        }
    }

    private refine(): void {
        // TODO: implement
    }

    private notify(finished = false, extras: InteractionResult[] = []): void {
        const transformed = this.allPrompts.map((shape) => {
            if (shape instanceof SVG.Rect) {
                const [x, y] = [shape.x(), shape.y()];
                const [width, height] = [shape.width(), shape.height()];
                return {
                    points: translateFromCanvas(this.geometry.offset, [x, y, x + width, y + height]),
                    shapeType: 'rectangle',
                    type: 'positive' as const,
                };
            }

            if (shape instanceof SVG.Circle) {
                return {
                    points: translateFromCanvas(this.geometry.offset, [shape.cx(), shape.cy()]),
                    shapeType: 'points',
                    type: shape.attr('stroke') === 'green' ? 'positive' as const : 'negative' as const,
                 };
            }

            throw new Error('Unknown shape type');
        });

        this.onInteraction(transformed.concat(extras), finished);
    }
}
