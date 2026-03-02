// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';
import Crosshair from './crosshair';
import {
    translateToSVG, PropType, stringifyPoints, translateToCanvas, expandChannels, imageDataToDataURL,
    translateFromCanvas,
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

export class InteractionHandlerImpl implements InteractionHandler {
    private settings: InteractorSettings;
    private enabled: boolean;
    private command: 'draw_box' | 'draw_points' | 'put_shapes' | 'refine' | 'idle';
    private currentRectangle: SVG.Rect | null;
    private currentRectangles: SVG.Rect[];
    private currentPoints: SVG.Circle[];
    private allShapes: SVG.Element[];
    private intermediateShapes: (SVG.Image | SVG.Polygon)[];
    private shapeDeletionMap: Map<SVG.Element, SVG.Element>;
    private onInteraction: (interactionResult: InteractionResult[], finished?: boolean) => void;
    private onMessage: (messages: CanvasHint[] | null, topic: string) => void;

    private geometry: Geometry;
    private container: SVG.Container;
    private configuration: Configuration;
    private effectiveStrokeWidth: number;
    private effectivePointSize: number;
    private effectiveShapeOpacity: number;

    public constructor(
        onInteraction: InteractionHandlerImpl['onInteraction'],
        onMessage: InteractionHandlerImpl['onMessage'],
        adoptedContent: SVG.Container,
        geometry: Geometry,
        configuration: Configuration,
    ) {
        this.enabled = false;
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
        this.currentRectangles = [];
        this.currentPoints = [];
        this.allShapes = [];
        this.intermediateShapes = [];
        this.shapeDeletionMap = new Map();
        this.onInteraction = onInteraction;
        this.onMessage = onMessage;
        this.effectiveStrokeWidth = consts.BASE_STROKE_WIDTH / this.geometry.scale;
        this.effectivePointSize = (configuration.controlPointsSize ?? consts.BASE_POINT_SIZE) / this.geometry.scale;
        this.effectiveShapeOpacity = configuration.selectedShapeOpacity ?? 0.5;
        this.container.on('mousedown', this.onMouseDown);
        this.container.on('mouseup', this.onMouseUp);
    }


    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        this.effectiveStrokeWidth = consts.BASE_STROKE_WIDTH / this.geometry.scale;
        this.effectivePointSize = (this.configuration.controlPointsSize ?? consts.BASE_POINT_SIZE) / this.geometry.scale;

        // Update current rectangle if it exists
        if (this.currentRectangle) {
            this.currentRectangle.stroke({ width: this.effectiveStrokeWidth });
            this.currentRectangle.opacity(this.effectiveShapeOpacity);
        }

        // Update all current points
        this.currentPoints.forEach((point) => {
            point.attr('r', this.effectivePointSize);
        });

        // Update all shapes in allShapes array
        this.allShapes.forEach((shape) => {
            if (shape instanceof SVG.Rect) {
                shape.stroke({ width: this.effectiveStrokeWidth });
                shape.opacity(this.effectiveShapeOpacity);
            } else if (shape instanceof SVG.Circle) {
                shape.attr('r', this.effectivePointSize);
            }
        });

        // Update delete buttons
        this.shapeDeletionMap.forEach((deleteButtonGroup, shape) => {
            const group = deleteButtonGroup as SVG.G;

            // Recalculate button position based on new effective size
            // Make offsets dynamic based on scale to maintain visual distance
            const offsetX = 8 / this.geometry.scale;
            const offsetY = -8 / this.geometry.scale;
            let x = 0;
            let y = 0;

            if (shape instanceof SVG.Rect) {
                x = shape.x() + shape.width();
                y = shape.y();
            } else if (shape instanceof SVG.Circle) {
                x = shape.cx() + this.effectivePointSize * 2;
                y = shape.cy() - this.effectivePointSize;
            }

            // Update group position
            group.move(x + offsetX, y + offsetY);

            const children = group.children();
            children.forEach((child) => {
                if (child instanceof SVG.Circle) {
                    // Update circle: radius should be scaled down with geometry scale
                    // Base size is 10, so radius is 5. Scale it down by dividing by geometry.scale
                    const scaledRadius = 5 / this.geometry.scale;
                    child.attr('r', scaledRadius);
                    child.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });
                } else if (child instanceof SVG.Path) {
                    // Update path: recalculate coordinates based on the scaled circle size
                    // Original path is for 10x10 circle, coordinates go from 3 to 7
                    // Scale factor: scaledRadius / 5 (original radius)
                    const scaledRadius = 5 / this.geometry.scale;
                    const scaleFactor = scaledRadius / 5;
                    const coords = [3, 7].map(c => (c * scaleFactor).toFixed(2));
                    const pathData = `M ${coords[0]} ${coords[0]} L ${coords[1]} ${coords[1]} M ${coords[1]} ${coords[0]} L ${coords[0]} ${coords[1]}`;
                    child.attr('d', pathData);
                    child.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth, linecap: 'round', linejoin: 'round' });
                }
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
            this.command = interactData.command ?? 'idle';
        } else if (this.enabled) {
            this.onInteraction(null, true);
            this.release();
        }

        if (this.enabled) {
            if (interactData.hasOwnProperty('command')) {
                const { command } = interactData;
                if (command === 'draw_box') {
                    this.drawBox();
                } else if (command === 'draw_points') {
                    this.drawPoints();
                } else if (command === 'put_shapes') {
                    this.putShapes(interactData.payload.shapes);
                } else if (command === 'refine') {
                    this.refine();
                }
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
        this.container.off('mouseup', this.onMouseUp);
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
            this.currentRectangles.push(this.currentRectangle);
            this.currentRectangle.remove();
            this.currentRectangle = null;
        }

        if (this.currentRectangles.length > 0) {
            this.currentRectangles.forEach((rect) => rect.remove());
            this.currentRectangles = [];
        }

        if (this.currentPoints.length > 0) {
            this.currentPoints.forEach((point) => point.remove());
            this.currentPoints = [];
        }

        this.allShapes = [];

        this.intermediateShapes.forEach((shape) => shape.remove());
        this.intermediateShapes = [];

        // Clean up delete buttons
        this.shapeDeletionMap.forEach((deleteBtn) => {
            deleteBtn.remove();
        });
        this.shapeDeletionMap.clear();
    }

    private onMouseDown = (e: MouseEvent) => {
        if (!this.enabled) {
            return;
        }

        if (this.command === 'draw_box') {
            (this.currentRectangle as any).draw(e);
        } else if (this.command === 'draw_points') {
            let color = 'green';
            if (this.settings.points_type === 'any') {
                color = e.button === 0 ? 'green' : 'red';
            } else if (this.settings.points_type === 'positive') {
                color = 'green';
            } else if (this.settings.points_type === 'negative') {
                color = 'red';
            }

            const point = this.container.circle(this.effectivePointSize * 2).fill(color).center(e.offsetX, e.offsetY);
            this.currentPoints.push(point);
            this.allShapes.push(point);
            this.drawDeleteButton(point);
            this.notify();
        }
    };

    private onMouseUp = () => {

    };

    // Рисование bbox
    private drawBox(): void {
        this.currentRectangle = this.container.rect()
            .fill('rgba(0, 0, 0, 0)')
            .stroke({ color: '#000000', width: this.effectiveStrokeWidth })
            .opacity(this.effectiveShapeOpacity);
        this.onMessage([{
            type: 'text',
            content: 'Draw a prompt rectangle using top-left and bottom-right points.',
            icon: 'info',
        }], 'interaction');

        this.currentRectangle.on('drawstop', (e) => {
            this.currentRectangle.off('drawstop');
            this.currentRectangles.push(this.currentRectangle as SVG.Rect);
            this.allShapes.push(this.currentRectangle);
            this.drawDeleteButton(this.currentRectangle);
            this.currentRectangle = null;
            this.notify();
        });
    }

    private drawPoints(): void {
        const { points_type } = this.settings;
        let text = 'Add prompt points. Use left/right mouse button for positive/negative prompts.';
        if (points_type === 'positive') {
            text = 'Add positive prompt points by clicking the canvas.';
        } else if (points_type === 'negative') {
            text = 'Add negative prompt points by clicking the canvas.';
        }

        this.onMessage([{
            type: 'text',
            content: text,
            icon: 'info',
        }], 'interaction');
    }

    private drawDeleteButton(shape: SVG.Element): void {
        // Get shape bounds - position at top-right with offset
        let x = 0;
        let y = 0;
        // Make offsets dynamic based on scale to maintain visual distance
        const offsetX = 8 / this.geometry.scale; // pixels to the right, scaled
        const offsetY = -8 / this.geometry.scale; // pixels upward, scaled

        if (shape instanceof SVG.Rect) {
            x = shape.x() + shape.width();
            y = shape.y();
        } else if (shape instanceof SVG.Circle) {
            x = shape.cx() + this.effectivePointSize * 2;
            y = shape.cy() - this.effectivePointSize;
        }

        // Create a group for the delete button (single parent element)
        const deleteButtonGroup = this.container.group() as SVG.G;

        // Add red background circle with base color
        const circleBg = deleteButtonGroup.circle(10)
            .fill('#ff3333')
            .stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });

        // Add X symbol using path (more professional than text)
        // This creates an X by drawing two diagonal lines
        const xPath = deleteButtonGroup.path('M 3 3 L 7 7 M 7 3 L 3 7')
            .stroke({ color: '#ffffff', width: this.effectiveStrokeWidth, linecap: 'round', linejoin: 'round' })
            .fill('none');

        // Position the group
        deleteButtonGroup.move(x + offsetX, y + offsetY);

        // Make button interactive with smooth transitions via CSS
        const groupNode = deleteButtonGroup.node as any;
        groupNode.style.cursor = 'pointer';
        groupNode.style.transition = 'all 0.2s ease-out';
        groupNode.style.filter = 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3))';

        // Hover effects
        deleteButtonGroup.on('mouseover', () => {
            // Increase brightness on hover
            circleBg.fill('#ff5555');

            // Enhance stroke
            circleBg.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth * 2.4 });
        });

        deleteButtonGroup.on('mouseout', () => {
            // Return to original color
            circleBg.fill('#ff3333');

            // Restore stroke
            circleBg.stroke({ color: '#ffffff', width: this.effectiveStrokeWidth });
        });

        // Add mousedown handler to delete the shape
        deleteButtonGroup.on('mousedown', (e: any) => {
            e.stopPropagation();
            this.deleteShape(shape);
        });

        // Store the delete button in map (only the group, which contains everything)
        this.shapeDeletionMap.set(shape, deleteButtonGroup);
    }

    private deleteShape(shape: SVG.Element): void {
        // Remove from allShapes
        const shapeIndex = this.allShapes.indexOf(shape);
        if (shapeIndex > -1) {
            this.allShapes.splice(shapeIndex, 1);
        }

        // Remove from specific arrays (points or rectangles)
        if (shape instanceof SVG.Circle) {
            const pointIndex = this.currentPoints.findIndex((p) => p === shape);
            if (pointIndex > -1) {
                this.currentPoints.splice(pointIndex, 1);
            }
        } else if (shape instanceof SVG.Rect) {
            const rectIndex = this.currentRectangles.findIndex((r) => r === shape);
            if (rectIndex > -1) {
                this.currentRectangles.splice(rectIndex, 1);
            }
        }

        // Remove delete button from map and canvas
        const deleteBtn = this.shapeDeletionMap.get(shape);
        if (deleteBtn) {
            deleteBtn.remove();
            this.shapeDeletionMap.delete(shape);
        }

        // Remove shape from canvas
        shape.remove();

        // Notify about the change
        this.notify();
    }

    // Отображение фигур (ма ски, полигоны, боксы)
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
                    (dataURL: string) => new Promise((resolve, reject) => {
                        image.loaded(() => {
                            resolve();
                        });
                        image.error(() => {
                            reject();
                        });
                        image.load(dataURL);
                    }),
                );
            }
        }
    }

    // Выбор отображенных фигур (refine)
    private refine(): void {
        // TODO: реализовать выбор/уточнение фигур
        // Пример: выделить фигуру, изменить стиль, добавить обработчики событий
    }

    private notify(): void {
        const transformed = this.allShapes.map((shape) => {
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
                    type: shape.attr('fill') === 'green' ? 'positive' as const : 'negative' as const,
                 };
            }

            throw new Error('Unknown shape type');
        });

        if (transformed.length) {
            this.onInteraction(transformed);
        }
    }
}
