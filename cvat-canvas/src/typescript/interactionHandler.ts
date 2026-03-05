// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';
import Crosshair from './crosshair';
import {
    stringifyPoints, translateToCanvas,
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

const DELETE_BUTTON_OFFSET = 8;

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
        this.container.on('mousedown.interaction', this.onMouseDown);
        this.container.on('mousemove.interaction', this.onMouseMove);
    }

    private clearCurrentRectangle(): void {
        if (this.currentRectangle) {
            this.currentRectangle.off('drawstop.interaction');
            this.currentRectangle.remove();
            this.currentRectangle = null;
        }
    }

    private clearPromptsAndButtons() {
        this.rectanglePrompts.forEach((rect) => {
            rect.remove();
        });

        this.pointPrompts.forEach((point) => {
            point.off('mouseenter.interaction');
            point.off('mouseleave.interaction');
            point.off('mousedown.interaction');
            point.remove();
        });

        this.deletionButtons.forEach((deleteBtn) => {
            deleteBtn.off('mouseover.interaction');
            deleteBtn.off('mouseout.interaction');
            deleteBtn.off('mousedown.interaction');
            deleteBtn.remove();
        });

        this.deletionButtons.clear();
        this.rectanglePrompts = [];
        this.pointPrompts = [];
        this.allPrompts = [];
    }

    private clearIntermediateShapes(): void {
        this.intermediateShapes.forEach((shape) => {
            if (shape.node instanceof SVGImageElement) {
                URL.revokeObjectURL(shape.node.href.baseVal);
            }
            shape.remove();
        });
        this.intermediateShapes = [];
    }

    private release(): void {
        this.enabled = false;
        this.command = 'idle';
        this.onMessage(null, 'interaction');
        this.clearCurrentRectangle();
        this.clearPromptsAndButtons();
        this.clearIntermediateShapes();
        this.crosshair.hide();
    }

    private isWithinFrame(x: number, y: number): boolean {
        const { offset, image } = this.geometry;
        const { width, height } = image;
        const [imageX, imageY] = [x - offset, y - offset];
        return imageX >= 0 && imageX < width && imageY >= 0 && imageY < height;
    }

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

            this.currentRectangle.on('drawstop.interaction', () => {
                const rectangle = this.currentRectangle.clone() as SVG.Rect;
                this.clearCurrentRectangle();

                const { offset, image: { width: imWidth, height: imHeight } } = this.geometry;
                const [x, y, width, height] = [rectangle.x(), rectangle.y(), rectangle.width(), rectangle.height()];
                const right = offset + imWidth;
                const bottom = offset + imHeight;

                const xtl = Math.max(x, offset);
                const ytl = Math.max(y, offset);
                const xbr = Math.min(x + width, right);
                const ybr = Math.min(y + height, bottom);

                if (xbr - xtl < 1 || ybr - ytl < 1) {
                    rectangle.remove();
                    initNewDrawingBox();
                    return;
                }

                rectangle.x(xtl);
                rectangle.y(ytl);
                rectangle.width(xbr - xtl);
                rectangle.height(ybr - ytl);

                this.rectanglePrompts.push(rectangle);
                this.allPrompts.push(rectangle);
                this.drawDeleteButton(rectangle);

                initNewDrawingBox();
                this.notify();
            });
        };


        this.onMessage([{
            type: 'text',
            icon: 'info',
            content: 'Draw rectangle prompts',
        }, {
            type: 'list',
            content: [
                'Hold <Mouse Wheel> to drag the image',
            ],
            className: 'cvat-canvas-notification-list-shortcuts',
        }], 'interaction');

        initNewDrawingBox();
    }

    private drawPoints(): void {
        const { points_type } = this.settings;

        this.command = 'draw_points';
        const textPrompts = [];
        if (points_type === 'any') {
            textPrompts.push(
                'Click <Left Button> to add a positive point',
                'Click <Right Button> to add a negative point',
            );
        }

        this.onMessage([{
            type: 'text',
            icon: 'info',
            content: 'Draw point prompts',
        }, {
            type: 'list',
            content: [
                ...textPrompts,
                'Hold <Mouse Wheel> to drag the image',
            ],
            className: 'cvat-canvas-notification-list-shortcuts',
        }], 'interaction');
    }

    private putShapes(shapes: InteractionData['payload']['shapes']): void {
        // TODO: add ID and incremental update
        this.clearIntermediateShapes();

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
                const left = points[points.length - 4];
                const top = points[points.length - 3];
                const right = points[points.length - 2];
                const bottom = points[points.length - 1];
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
                    (dataURL: string) => {
                        const destroy = () => URL.revokeObjectURL(dataURL);
                        if (image.parent() !== null) {
                            // still in DOM
                            image.loaded(destroy);
                            image.error(destroy);
                            image.load(dataURL);
                        } else {
                            destroy();
                        }
                    },
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

    private drawDeleteButton(shape: SVG.Rect | SVG.Circle): void {
        const { scale } = this.geometry;
        const r = consts.BASE_POINT_SIZE / scale;
        let { x, y } = getTopRightPosition(shape);

        const deleteButtonGroup = this.container.group().addClass('cvat_interaction_delete_button') as SVG.G;
        const circleBg = deleteButtonGroup.circle(r * 2)
            .fill('#ff3333')
            .stroke({ color: '#ffffff', width: this.effectiveStrokeWidth })
            .center(x + DELETE_BUTTON_OFFSET / scale, y - DELETE_BUTTON_OFFSET / scale);

        const p = [3, 7].map((val) => (val / 10) * r * 2);
        deleteButtonGroup.path(`M ${p[0]} ${p[0]} L ${p[1]} ${p[1]} M ${p[1]} ${p[0]} L ${p[0]} ${p[1]}`)
            .stroke({ color: '#ffffff', width: this.effectiveStrokeWidth, linecap: 'round', linejoin: 'round' })
            .center(x + DELETE_BUTTON_OFFSET / scale, y - DELETE_BUTTON_OFFSET / scale)
            .fill('none');

        deleteButtonGroup.on('mouseover.interaction', () => {
            circleBg.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth * 1.5 });
        });

        deleteButtonGroup.on('mouseout.interaction', () => {
            circleBg.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });
        });

        deleteButtonGroup.on('mousedown.interaction', (e: any) => {
            e.stopPropagation();
            this.deleteShape(shape);
        });

        this.deletionButtons.set(shape, deleteButtonGroup);
    }

    private onMouseMove = (e: MouseEvent) => {
        const [x, y] = [e.offsetX, e.offsetY];
        this.lastMousePosition = { x, y };
        this.crosshair.move(x, y);

        if (
            this.command === 'draw_points' &&
            this.settings.allowPointsSliding &&
            this.pointPrompts.length &&
            this.isWithinFrame(x, y)
        ) {
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
        if (!(this.enabled && [0, 2].includes(e.button))) {
            return;
        }

        const [x, y] = [e.offsetX, e.offsetY];
        if (this.command === 'draw_box') {
            (this.currentRectangle as any).draw(e);
        } else if (this.command === 'draw_points') {
            if (!this.isWithinFrame(x, y)) {
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
                .center(x, y);

            const pointCanBeRemoved = () => {
                return this.settings.removalStrategy === 'any' || (
                    this.settings.removalStrategy === 'last' &&
                    this.allPrompts.indexOf(point) === this.allPrompts.length - 1
                );
            };

            point.on('mouseenter.interaction', (e: MouseEvent) => {
                if (pointCanBeRemoved()) {
                    point.addClass('cvat_canvas_removable_interaction_point');
                    point.attr({ 'stroke-width': this.effectiveStrokeWidth * 1.5, r: this.effectivePointSize * 1.1 });
                }
            });

            point.on('mouseleave.interaction', (): void => {
                point.removeClass('cvat_canvas_removable_interaction_point');
                point.attr({ 'stroke-width': this.effectiveStrokeWidth, r: this.effectivePointSize });
            });

            point.on('mousedown.interaction', (e: MouseEvent): void => {
                e.preventDefault();
                e.stopPropagation();
                if (pointCanBeRemoved()) {
                    this.deleteShape(point);
                }
            });

            this.pointPrompts.push(point);
            this.allPrompts.push(point);
            this.drawDeleteButton(point);
            this.notify();
        }
    };

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
            const r = consts.BASE_POINT_SIZE / scale;
            group.children().forEach((child) => {
                if (child instanceof SVG.Circle) {
                    child.attr('r', r);
                    child.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });
                } else if (child instanceof SVG.Path) {
                    const coords = [3, 7].map((val) => (val / 10) * r * 2);
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
                    this.clearCurrentRectangle();
                    this.drawPoints();
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
        this.container.off('mousedown.interaction', this.onMouseDown);
        this.container.off('mousemove.interaction', this.onMouseMove);
        this.release();
    }

    public cancel(): void {
        this.onInteraction(null);
        this.release();
    }
}
