// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { IssueView } from 'cvat-core/src/issue';
import { Canvas3dController, Canvas3dControllerImpl } from './canvas3dController';
import {
    Canvas3dModel,
    Canvas3dModelImpl,
    Mode,
    DrawData,
    ViewType,
    MouseInteraction,
    CameraRayData,
    Configuration,
    GroupData,
    SplitData,
    MergeData,
} from './canvas3dModel';
import {
    Canvas3dView, Canvas3dViewImpl, ViewsDOM, CameraAction, PickResult,
} from './canvas3dView';
import {
    cameraRayFromImagePoint, projectCuboid, projectPoint,
} from './geometry/camera-projection';
import { CUBOID_EDGES, CUBOID_FACES } from './cuboid';
import type { CameraCalibration } from './geometry/camera-projection';
import type { Master } from './master';
import type { IssueRegion } from './issueRegion';
import type { IssueCuboid } from './issueCuboid';
import type { IssueSprite } from './issueSprite';

interface Canvas3d {
    html(): ViewsDOM;
    setup(frameData: any, objectStates: any[]): void;
    isAbleToChangeFrame(): boolean;
    mode(): Mode;
    render(): void;
    keyControls(keys: KeyboardEvent): void;
    draw(drawData: DrawData): void;
    cancel(): void;
    dragCanvas(enable: boolean): void;
    activate(clientID: number | null, attributeID?: number): void;
    configure(configuration: Configuration): void;
    fitCanvas(): void;
    fit(): void;
    focus(clientID: number): void;
    setupIssueRegions(regions: Record<number, IssueRegion>): void;
    setupIssueCuboids(regions: IssueCuboid[], activeID?: number | null): void;
    setupIssueSprites(sprites: IssueSprite[]): void;
    pickIssueCuboid(clientX: number, clientY: number, view: ViewType): number | null;
    projectIssueCuboid(position: number[], view: ViewType): ([number, number] | null)[];
    resizeIssueCuboid(
        position: number[], corner: number, view: ViewType, from: [number, number], to: [number, number],
    ): number[] | null;
    selectRegion(enabled: boolean): void;
    pick(clientX: number, clientY: number, view?: ViewType): PickResult | null;
    projectPosition(position: number[], view: ViewType): [number, number] | null;
    focusPosition(position: number[]): void;
    getReviewView(): IssueView | null;
    restoreReviewView(view: IssueView): void;
    movePosition(position: number[], view: ViewType, from: [number, number], to: [number, number]): number[] | null;
    group(groupData: GroupData): void;
    merge(mergeData: MergeData): void;
    setCameraRays(cameraRays: CameraRayData[]): void;
    split(splitData: SplitData): void;
    destroy(): void;
}

class Canvas3dImpl implements Canvas3d {
    private readonly model: Canvas3dModel & Master;
    private readonly controller: Canvas3dController;
    private view: Canvas3dView;

    public constructor() {
        this.model = new Canvas3dModelImpl();
        this.controller = new Canvas3dControllerImpl(this.model);
        this.view = new Canvas3dViewImpl(this.model, this.controller);
    }

    public html(): ViewsDOM {
        return this.view.html();
    }

    public keyControls(keys: KeyboardEvent): void {
        this.view.keyControls(keys);
    }

    public render(): void {
        this.view.render();
    }

    public draw(drawData: DrawData): void {
        this.model.draw(drawData);
    }

    public setup(frameData: any, objectStates: any[]): void {
        this.model.setup(frameData, objectStates);
    }

    public mode(): Mode {
        return this.model.mode;
    }

    public group(groupData: GroupData): void {
        this.model.group(groupData);
    }

    public split(splitData: SplitData): void {
        this.model.split(splitData);
    }

    public merge(mergeData: MergeData): void {
        this.model.merge(mergeData);
    }

    public setCameraRays(cameraRays: CameraRayData[]): void {
        this.model.setCameraRays(cameraRays);
    }

    public isAbleToChangeFrame(): boolean {
        return this.model.isAbleToChangeFrame();
    }

    public cancel(): void {
        this.model.cancel();
    }

    public dragCanvas(enable: boolean): void {
        this.model.dragCanvas(enable);
    }

    public configure(configuration: Partial<Configuration>): void {
        this.model.configure(configuration);
    }

    public activate(clientID: number | null, attributeID: number | null = null): void {
        this.model.activate(typeof clientID === 'number' ? String(clientID) : null, attributeID);
    }

    public focus(clientID: number): void {
        this.view.focusObjectByClientId(clientID, true);
    }

    public setupIssueRegions(regions: Record<number, IssueRegion>): void {
        this.view.setupIssueRegions(regions);
    }

    public setupIssueCuboids(regions: IssueCuboid[], activeID: number | null = null): void {
        this.view.setupIssueCuboids(regions, activeID);
    }

    public setupIssueSprites(sprites: IssueSprite[]): void {
        this.view.setupIssueSprites(sprites);
    }

    public pickIssueCuboid(clientX: number, clientY: number, view: ViewType): number | null {
        return this.view.pickIssueCuboid(clientX, clientY, view);
    }

    public projectIssueCuboid(position: number[], view: ViewType): ([number, number] | null)[] {
        return this.view.projectIssueCuboid(position, view);
    }

    public resizeIssueCuboid(
        position: number[], corner: number, view: ViewType, from: [number, number], to: [number, number],
    ): number[] | null {
        return this.view.resizeIssueCuboid(position, corner, view, from, to);
    }

    public selectRegion(enabled: boolean): void {
        this.model.mode = enabled ? Mode.SELECT_REGION : Mode.IDLE;
    }

    public pick(clientX: number, clientY: number, view: ViewType = ViewType.PERSPECTIVE): PickResult | null {
        return this.view.pick(clientX, clientY, view);
    }

    public projectPosition(position: number[], view: ViewType): [number, number] | null {
        return this.view.projectPosition(position, view);
    }

    public focusPosition(position: number[]): void {
        this.view.focusPosition(position);
    }

    public getReviewView(): IssueView | null {
        return this.view.getReviewView();
    }

    public restoreReviewView(view: IssueView): void {
        this.view.restoreReviewView(view);
    }

    public movePosition(
        position: number[], view: ViewType, from: [number, number], to: [number, number],
    ): number[] | null {
        return this.view.movePosition(position, view, from, to);
    }

    public fit(): void {
        this.model.fit();
    }

    public fitCanvas(): void {
        // in spite of 2D canvas, 3D version fits automatically when external container resized
        // so, nothing to do here, but keep the method to keep the same interface as 2D canvas
    }

    public destroy(): void {
        this.model.destroy();
    }
}

export {
    cameraRayFromImagePoint, CUBOID_EDGES, CUBOID_FACES, projectCuboid, projectPoint, Canvas3dImpl as Canvas3d,
    ViewType, MouseInteraction, CameraAction, Mode as CanvasMode,
};

export type {
    ViewsDOM, PickResult, CameraCalibration, CameraRayData, IssueCuboid, IssueSprite,
};

export { isIssueCuboid, isIssuePoint } from './issueCuboid';
