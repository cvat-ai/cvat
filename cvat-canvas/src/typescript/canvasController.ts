// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    CanvasModel,
    Geometry,
    Position,
    FocusData,
    ActiveElement,
    DrawData,
    MergeData,
    SplitData,
    GroupData,
    JoinData,
    SliceData,
    Mode,
    InteractionData,
    Configuration,
    MasksEditData,
    HighlightedElements,
} from './canvasModel';

export interface CanvasController {
    readonly objects: any[];
    readonly issueRegions: Record<number, { hidden: boolean; points: number[] }>;
    readonly zLayer: number | null;
    readonly focusData: FocusData;
    readonly activeElement: ActiveElement;
    readonly highlightedElements: HighlightedElements;
    readonly drawData: DrawData;
    readonly editData: MasksEditData;
    readonly interactionData: InteractionData;
    readonly mergeData: MergeData;
    readonly splitData: SplitData;
    readonly groupData: GroupData;
    readonly joinData: JoinData;
    readonly sliceData: SliceData;
    readonly selected: any;
    readonly configuration: Configuration;
    mode: Mode;
    geometry: Geometry;

    zoom(x: number, y: number, direction: number): void;
    draw(drawData: DrawData): void;
    edit(editData: MasksEditData): void;
    enableDrag(x: number, y: number): void;
    drag(x: number, y: number): void;
    disableDrag(): void;
    fit(): void;
}

export class CanvasControllerImpl implements CanvasController {
    private model: CanvasModel;
    private lastDragPosition: Position;
    private isDragging: boolean;

    public constructor(model: CanvasModel) {
        this.model = model;
    }

    public zoom(x: number, y: number, direction: number): void {
        this.model.zoom(x, y, direction);
    }

    public fit(): void {
        this.model.fit();
    }

    public enableDrag(x: number, y: number): void {
        this.lastDragPosition = {
            x,
            y,
        };
        this.isDragging = true;
    }

    public drag(x: number, y: number): void {
        if (this.isDragging) {
            const topOffset: number = y - this.lastDragPosition.y;
            const leftOffset: number = x - this.lastDragPosition.x;
            this.lastDragPosition = {
                x,
                y,
            };
            this.model.move(topOffset, leftOffset);
        }
    }

    public disableDrag(): void {
        this.isDragging = false;
    }

    public draw(drawData: DrawData): void {
        this.model.draw(drawData);
    }

    public edit(editData: MasksEditData): void {
        this.model.edit(editData);
    }

    public get geometry(): Geometry {
        return this.model.geometry;
    }

    public set geometry(geometry: Geometry) {
        this.model.geometry = geometry;
    }

    public get zLayer(): number | null {
        return this.model.zLayer;
    }

    public get issueRegions(): Record<number, { hidden: boolean; points: number[] }> {
        return this.model.issueRegions;
    }

    public get objects(): any[] {
        return this.model.objects;
    }

    public get focusData(): FocusData {
        return this.model.focusData;
    }

    public get activeElement(): ActiveElement {
        return this.model.activeElement;
    }

    public get highlightedElements(): HighlightedElements {
        return this.model.highlightedElements;
    }

    public get drawData(): DrawData {
        return this.model.drawData;
    }

    public get editData(): MasksEditData {
        return this.model.editData;
    }

    public get interactionData(): InteractionData {
        return this.model.interactionData;
    }

    public get mergeData(): MergeData {
        return this.model.mergeData;
    }

    public get splitData(): SplitData {
        return this.model.splitData;
    }

    public get groupData(): GroupData {
        return this.model.groupData;
    }

    public get joinData(): JoinData {
        return this.model.joinData;
    }

    public get sliceData(): SliceData {
        return this.model.sliceData;
    }

    public get selected(): any {
        return this.model.selected;
    }

    public get configuration(): Configuration {
        return this.model.configuration;
    }

    public set mode(value: Mode) {
        this.model.mode = value;
    }

    public get mode(): Mode {
        return this.model.mode;
    }
}
