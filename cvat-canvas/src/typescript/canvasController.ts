// Copyright (C) 2019-2022 Intel Corporation
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
    Mode,
    InteractionData,
    Configuration,
} from './canvasModel';

export interface CanvasController {
    readonly objects: any[];
    readonly issueRegions: Record<number, { hidden: boolean; points: number[] }>;
    readonly zLayer: number | null;
    readonly focusData: FocusData;
    readonly activeElement: ActiveElement;
    readonly drawData: DrawData;
    readonly interactionData: InteractionData;
    readonly mergeData: MergeData;
    readonly splitData: SplitData;
    readonly groupData: GroupData;
    readonly selected: any;
    readonly configuration: Configuration;
    mode: Mode;
    geometry: Geometry;

    zoom(x: number, y: number, direction: number): void;
    draw(drawData: DrawData): void;
    interact(interactionData: InteractionData): void;
    merge(mergeData: MergeData): void;
    split(splitData: SplitData): void;
    group(groupData: GroupData): void;
    selectRegion(enabled: boolean): void;
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

    public interact(interactionData: InteractionData): void {
        this.model.interact(interactionData);
    }

    public merge(mergeData: MergeData): void {
        this.model.merge(mergeData);
    }

    public split(splitData: SplitData): void {
        this.model.split(splitData);
    }

    public group(groupData: GroupData): void {
        this.model.group(groupData);
    }

    public selectRegion(enable: boolean): void {
        this.model.selectRegion(enable);
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

    public get drawData(): DrawData {
        return this.model.drawData;
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
