// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import consts from './consts';
import { MasterImpl } from './master';

export interface Size {
    width: number;
    height: number;
}

export interface Image {
    renderWidth: number;
    renderHeight: number;
    imageData: ImageBitmap;
}

export interface Position {
    x: number;
    y: number;
}

export interface CanvasHint {
    type: 'text' | 'list';
    content: string | string[];
    className?: string;
    icon?: 'info' | 'loading';
}

export interface Geometry {
    image: Size;
    canvas: Size;
    grid: Size;
    top: number;
    left: number;
    scale: number;
    offset: number;
    angle: number;
}

export interface FocusData {
    clientID: number;
    padding: number;
}

export interface ActiveElement {
    clientID: number | null;
    attributeID: number | null;
}

export enum HighlightSeverity {
    ERROR = 'error',
    WARNING = 'warning',
}

export interface HighlightedElements {
    elementsIDs: number[];
    severity: HighlightSeverity | null;
}

export enum RectDrawingMethod {
    CLASSIC = 'By 2 points',
    EXTREME_POINTS = 'By 4 points',
}

export enum CuboidDrawingMethod {
    CLASSIC = 'From rectangle',
    CORNER_POINTS = 'By 4 points',
}

export enum ColorBy {
    INSTANCE = 'Instance',
    GROUP = 'Group',
    LABEL = 'Label',
}

export interface Configuration {
    smoothImage?: boolean;
    autoborders?: boolean;
    displayAllText?: boolean;
    textFontSize?: number;
    textPosition?: 'auto' | 'center';
    textContent?: string;
    undefinedAttrValue?: string;
    showProjections?: boolean;
    showConflicts?: boolean;
    forceDisableEditing?: boolean;
    intelligentPolygonCrop?: boolean;
    forceFrameUpdate?: boolean;
    CSSImageFilter?: string;
    colorBy?: ColorBy;
    selectedShapeOpacity?: number;
    shapeOpacity?: number;
    controlPointsSize?: number;
    outlinedBorders?: string | false;
    resetZoom?: boolean;
    hideEditedObject?: boolean;
}

export interface BrushTool {
    type: 'brush' | 'eraser' | 'polygon-plus' | 'polygon-minus';
    color: string;
    form: 'circle' | 'square';
    size: number;
    onBlockUpdated: (blockedTools: Record<'eraser' | 'polygon-minus', boolean>) => void;
}

export interface DrawData {
    enabled: boolean;
    continue?: boolean;
    shapeType?: string;
    rectDrawingMethod?: RectDrawingMethod;
    cuboidDrawingMethod?: CuboidDrawingMethod;
    skeletonSVG?: string;
    numberOfPoints?: number;
    initialState?: any;
    crosshair?: boolean;
    brushTool?: BrushTool;
    redraw?: number;
    onDrawDone?: (data: object) => void;
    onUpdateConfiguration?: (configuration: { brushTool?: Pick<BrushTool, 'size'> }) => void;
}

export interface InteractionData {
    enabled: boolean;
    shapeType?: string;
    crosshair?: boolean;
    minPosVertices?: number;
    minNegVertices?: number;
    startWithBox?: boolean;
    enableSliding?: boolean;
    allowRemoveOnlyLast?: boolean;
    intermediateShape?: {
        shapeType: string;
        points: number[];
    };
}

export interface InteractionResult {
    points: number[];
    shapeType: string;
    button: number;
}

export interface PolyEditData {
    enabled: boolean;
    state?: any;
    pointID?: number;
}

export interface MasksEditData {
    enabled: boolean;
    state?: any;
    brushTool?: BrushTool;
    onUpdateConfiguration?: (configuration: { brushTool?: Pick<BrushTool, 'size'> }) => void;
}

export interface GroupData {
    enabled: boolean;
}

export interface MergeData {
    enabled: boolean;
}

export interface SplitData {
    enabled: boolean;
}

export interface JoinData {
    enabled: boolean;
}

export interface SliceData {
    enabled: boolean;
    clientID?: number;
    getContour?: (state: any) => Promise<number[]>;
}

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum UpdateReasons {
    IMAGE_CHANGED = 'image_changed',
    IMAGE_ZOOMED = 'image_zoomed',
    IMAGE_FITTED = 'image_fitted',
    IMAGE_MOVED = 'image_moved',
    IMAGE_ROTATED = 'image_rotated',
    GRID_UPDATED = 'grid_updated',

    ISSUE_REGIONS_UPDATED = 'issue_regions_updated',
    OBJECTS_UPDATED = 'objects_updated',
    SHAPE_ACTIVATED = 'shape_activated',
    SHAPE_FOCUSED = 'shape_focused',
    SHAPE_HIGHLIGHTED = 'shape_highlighted',

    FITTED_CANVAS = 'fitted_canvas',

    INTERACT = 'interact',
    DRAW = 'draw',
    EDIT = 'edit',
    MERGE = 'merge',
    SPLIT = 'split',
    GROUP = 'group',
    JOIN = 'join',
    SLICE = 'slice',
    SELECT = 'select',
    CANCEL = 'cancel',
    BITMAP = 'bitmap',
    SELECT_REGION = 'select_region',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
    CONFIG_UPDATED = 'config_updated',
    DATA_FAILED = 'data_failed',
    DESTROY = 'destroy',
}

export enum Mode {
    IDLE = 'idle',
    DRAG = 'drag',
    RESIZE = 'resize',
    DRAW = 'draw',
    EDIT = 'edit',
    MERGE = 'merge',
    SPLIT = 'split',
    GROUP = 'group',
    JOIN = 'join',
    SLICE = 'slice',
    INTERACT = 'interact',
    SELECT_REGION = 'select_region',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
}

export interface CanvasModel {
    readonly imageBitmap: boolean;
    readonly imageIsDeleted: boolean;
    readonly image: Image | null;
    readonly issueRegions: Record<number, { hidden: boolean; points: number[] }>;
    readonly objects: any[];
    readonly zLayer: number | null;
    readonly gridSize: Size;
    readonly focusData: FocusData;
    readonly activeElement: ActiveElement;
    readonly highlightedElements: HighlightedElements;
    readonly drawData: DrawData;
    readonly editData: MasksEditData | PolyEditData;
    readonly interactionData: InteractionData;
    readonly mergeData: MergeData;
    readonly splitData: SplitData;
    readonly groupData: GroupData;
    readonly joinData: JoinData;
    readonly sliceData: SliceData;
    readonly configuration: Configuration;
    readonly selected: any;
    geometry: Geometry;
    mode: Mode;
    exception: Error | null;

    zoom(x: number, y: number, direction: number): void;
    move(topOffset: number, leftOffset: number): void;

    setup(frameData: any, objectStates: any[], zLayer: number): void;
    setupIssueRegions(issueRegions: Record<number, { hidden: boolean; points: number[] }>): void;
    activate(clientID: number | null, attributeID: number | null): void;
    highlight(clientIDs: number[], severity: HighlightSeverity): void;
    rotate(rotationAngle: number): void;
    focus(clientID: number, padding: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(drawData: DrawData): void;
    edit(editData: MasksEditData | PolyEditData): void;
    group(groupData: GroupData): void;
    join(joinData: JoinData): void;
    slice(sliceData: SliceData): void;
    split(splitData: SplitData): void;
    merge(mergeData: MergeData): void;
    select(objectState: any): void;
    interact(interactionData: InteractionData): void;

    fitCanvas(width: number, height: number): void;
    bitmap(enabled: boolean): void;
    selectRegion(enabled: boolean): void;
    dragCanvas(enable: boolean): void;
    zoomCanvas(enable: boolean): void;

    isAbleToChangeFrame(): boolean;
    configure(configuration: Configuration): void;
    cancel(): void;
    destroy(): void;
}

const defaultData = {
    drawData: {
        enabled: false,
    },
    editData: {
        enabled: false,
    },
    interactionData: {
        enabled: false,
    },
    mergeData: {
        enabled: false,
    },
    groupData: {
        enabled: false,
    },
    splitData: {
        enabled: false,
    },
    joinData: {
        enabled: false,
    },
    sliceData: {
        enabled: false,
    },
};

function hasShapeIsBeingDrawn(): boolean {
    const [element] = window.document.getElementsByClassName('cvat_canvas_shape_drawing');
    if (element) {
        return !!(element as any).instance.remember('_paintHandler');
    }

    return false;
}

function disableInternalSVGDrawing(data: DrawData | MasksEditData, currentData: DrawData | MasksEditData): boolean {
    // P.S. spaghetti code, but probably significant refactoring needed to find a better solution
    // when it is a mask drawing/editing using polygon fill
    // a user needs to close drawing/editing twice
    // first close stops internal drawing/editing with svg.js
    // the second one stops drawing/editing mask itself

    return !data.enabled && currentData.enabled &&
        (('shapeType' in currentData && currentData.shapeType === 'mask') ||
        ('state' in currentData && currentData.state.shapeType === 'mask')) &&
        currentData.brushTool?.type?.startsWith('polygon-') &&
        hasShapeIsBeingDrawn();
}

export class CanvasModelImpl extends MasterImpl implements CanvasModel {
    private data: {
        activeElement: ActiveElement;
        highlightedElements: HighlightedElements;
        angle: number;
        canvasSize: Size;
        configuration: Configuration;
        imageBitmap: boolean;
        image: Image | null;
        imageID: number | null;
        imageOffset: number;
        imageSize: Size;
        imageIsDeleted: boolean;
        focusData: FocusData;
        gridSize: Size;
        objects: any[];
        issueRegions: Record<number, { hidden: boolean; points: number[] }>;
        scale: number;
        top: number;
        left: number;
        fittedScale: number;
        zLayer: number | null;
        drawData: DrawData;
        editData: MasksEditData | PolyEditData;
        interactionData: InteractionData;
        mergeData: MergeData;
        groupData: GroupData;
        joinData: JoinData;
        sliceData: SliceData;
        splitData: SplitData;
        selected: any;
        mode: Mode;
        exception: Error | null;
    };

    public constructor() {
        super();

        this.data = {
            activeElement: {
                clientID: null,
                attributeID: null,
            },
            highlightedElements: {
                elementsIDs: [],
                severity: null,
            },
            angle: 0,
            canvasSize: {
                height: 0,
                width: 0,
            },
            configuration: {
                smoothImage: true,
                autoborders: false,
                displayAllText: false,
                showProjections: false,
                showConflicts: false,
                forceDisableEditing: false,
                intelligentPolygonCrop: false,
                forceFrameUpdate: false,
                CSSImageFilter: '',
                colorBy: ColorBy.LABEL,
                selectedShapeOpacity: 0.5,
                shapeOpacity: 0.2,
                outlinedBorders: false,
                resetZoom: true,
                textFontSize: consts.DEFAULT_SHAPE_TEXT_SIZE,
                controlPointsSize: consts.BASE_POINT_SIZE,
                textPosition: consts.DEFAULT_SHAPE_TEXT_POSITION,
                textContent: consts.DEFAULT_SHAPE_TEXT_CONTENT,
                undefinedAttrValue: consts.DEFAULT_UNDEFINED_ATTR_VALUE,
                hideEditedObject: false,
            },
            imageBitmap: false,
            image: null,
            imageID: null,
            imageOffset: 0,
            imageSize: {
                height: 0,
                width: 0,
            },
            imageIsDeleted: false,
            focusData: {
                clientID: 0,
                padding: 0,
            },
            gridSize: {
                height: 100,
                width: 100,
            },
            objects: [],
            issueRegions: {},
            scale: 1,
            top: 0,
            left: 0,
            fittedScale: 0,
            zLayer: null,
            selected: null,
            mode: Mode.IDLE,
            exception: null,
            ...defaultData,
        };
    }

    public zoom(x: number, y: number, direction: number): void {
        const oldScale: number = this.data.scale;
        const newScale: number = direction > 0 ? (oldScale * 6) / 5 : (oldScale * 5) / 6;
        this.data.scale = Math.min(Math.max(newScale, FrameZoom.MIN), FrameZoom.MAX);

        const { angle } = this.data;

        const mutiplier = Math.sin((angle * Math.PI) / 180) + Math.cos((angle * Math.PI) / 180);
        if ((angle / 90) % 2) {
            // 90, 270, ..
            const topMultiplier = (x - this.data.imageSize.width / 2) * (oldScale / this.data.scale - 1);
            const leftMultiplier = (y - this.data.imageSize.height / 2) * (oldScale / this.data.scale - 1);
            this.data.top += mutiplier * topMultiplier * this.data.scale;
            this.data.left -= mutiplier * leftMultiplier * this.data.scale;
        } else {
            const leftMultiplier = (x - this.data.imageSize.width / 2) * (oldScale / this.data.scale - 1);
            const topMultiplier = (y - this.data.imageSize.height / 2) * (oldScale / this.data.scale - 1);
            this.data.left += mutiplier * leftMultiplier * this.data.scale;
            this.data.top += mutiplier * topMultiplier * this.data.scale;
        }

        this.notify(UpdateReasons.IMAGE_ZOOMED);
    }

    public move(topOffset: number, leftOffset: number): void {
        this.data.top += topOffset;
        this.data.left += leftOffset;
        this.notify(UpdateReasons.IMAGE_MOVED);
    }

    public fitCanvas(width: number, height: number): void {
        this.data.canvasSize.height = height;
        this.data.canvasSize.width = width;

        this.data.imageOffset = Math.floor(
            Math.max(this.data.canvasSize.height / FrameZoom.MIN, this.data.canvasSize.width / FrameZoom.MIN),
        );

        this.notify(UpdateReasons.FITTED_CANVAS);
        this.notify(UpdateReasons.OBJECTS_UPDATED);
        this.notify(UpdateReasons.ISSUE_REGIONS_UPDATED);
    }

    public bitmap(enabled: boolean): void {
        this.data.imageBitmap = enabled;
        this.notify(UpdateReasons.BITMAP);
    }

    public selectRegion(enable: boolean): void {
        if (enable && this.data.mode !== Mode.IDLE) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (!enable && this.data.mode !== Mode.SELECT_REGION) {
            throw Error(`Canvas is not in the region selecting mode. Action: ${this.data.mode}`);
        }

        this.data.mode = enable ? Mode.SELECT_REGION : Mode.IDLE;
        this.notify(UpdateReasons.SELECT_REGION);
    }

    public dragCanvas(enable: boolean): void {
        if (enable && this.data.mode !== Mode.IDLE) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (!enable && this.data.mode !== Mode.DRAG_CANVAS) {
            throw Error(`Canvas is not in the drag mode. Action: ${this.data.mode}`);
        }

        this.data.mode = enable ? Mode.DRAG_CANVAS : Mode.IDLE;
        this.notify(UpdateReasons.DRAG_CANVAS);
    }

    public zoomCanvas(enable: boolean): void {
        if (enable && this.data.mode !== Mode.IDLE) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (!enable && this.data.mode !== Mode.ZOOM_CANVAS) {
            throw Error(`Canvas is not in the zoom mode. Action: ${this.data.mode}`);
        }

        this.data.mode = enable ? Mode.ZOOM_CANVAS : Mode.IDLE;
        this.notify(UpdateReasons.ZOOM_CANVAS);
    }

    public setup(frameData: any, objectStates: any[], zLayer: number): void {
        if (this.data.imageID !== frameData.number) {
            if ([Mode.EDIT, Mode.DRAG, Mode.RESIZE].includes(this.data.mode)) {
                throw Error(`Canvas is busy. Action: ${this.data.mode}`);
            }
        }
        if (frameData.number === this.data.imageID &&
            frameData.deleted === this.data.imageIsDeleted &&
            !this.data.configuration.forceFrameUpdate
        ) {
            this.data.zLayer = zLayer;
            this.data.objects = objectStates;
            if (this.data.image) {
                // display objects only if there is a drawn image
                // if there is not, UpdateReasons.OBJECTS_UPDATED will be triggered after image is set
                // it covers cases when annotations are changed while image is being received from the server
                // e.g. with UI buttons (lock, unlock), shortcuts, delete/restore frames,
                // and anytime when a list of objects updated in cvat-ui
                this.notify(UpdateReasons.OBJECTS_UPDATED);
            }
            return;
        }

        this.data.imageID = frameData.number;
        this.data.imageIsDeleted = frameData.deleted;
        if (this.data.imageIsDeleted) {
            this.data.angle = 0;
        }

        const { zLayer: prevZLayer, objects: prevObjects } = this.data;
        frameData
            .data((): void => {
                this.data.image = null;
                this.notify(UpdateReasons.IMAGE_CHANGED);
            })
            .then((data: Image): void => {
                if (frameData.number !== this.data.imageID) {
                    // check that request is still relevant after async image data fetching
                    return;
                }

                const relativeScaling = this.data.scale / this.data.fittedScale;
                const prevImageLeft = this.data.left;
                const prevImageTop = this.data.top;
                const prevImageWidth = this.data.imageSize.width;
                const prevImageHeight = this.data.imageSize.height;

                this.data.imageSize = {
                    height: frameData.height as number,
                    width: frameData.width as number,
                };

                this.data.image = data;
                this.fit();

                // restore correct image position after switching to a new frame
                // if corresponding option is disabled
                // prevImageHeight and prevImageWidth are initialized by 0 by default
                if (prevImageHeight !== 0 && prevImageWidth !== 0 && !this.data.configuration.resetZoom) {
                    const leftOffset = Math.round((this.data.imageSize.width - prevImageWidth) / 2);
                    const topOffset = Math.round((this.data.imageSize.height - prevImageHeight) / 2);
                    this.data.left = prevImageLeft - leftOffset;
                    this.data.top = prevImageTop - topOffset;
                    this.data.scale *= relativeScaling;
                }

                this.notify(UpdateReasons.IMAGE_CHANGED);

                if (prevZLayer === this.data.zLayer && prevObjects === this.data.objects) {
                    // check the request is relevant, other setup() may have been called while promise resolving
                    this.data.zLayer = zLayer;
                    this.data.objects = objectStates;
                }

                this.notify(UpdateReasons.OBJECTS_UPDATED);
            })
            .catch((exception: unknown): void => {
                if (typeof exception !== 'number') {
                    // don't notify when the frame is no longer needed
                    if (exception instanceof Error) {
                        this.data.exception = exception;
                    } else {
                        this.data.exception = new Error('Unknown error occured when fetching image data');
                    }
                    this.notify(UpdateReasons.DATA_FAILED);
                }
            });
    }

    public setupIssueRegions(issueRegions: Record<number, { hidden: boolean; points: number[] }>): void {
        this.data.issueRegions = issueRegions;
        this.notify(UpdateReasons.ISSUE_REGIONS_UPDATED);
    }

    public activate(clientID: number | null, attributeID: number | null): void {
        if (this.data.activeElement.clientID === clientID && this.data.activeElement.attributeID === attributeID) {
            return;
        }

        if (this.data.mode !== Mode.IDLE && clientID !== null) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (typeof clientID === 'number') {
            const [state] = this.objects.filter((_state: any): boolean => _state.clientID === clientID);
            if (!state || state.objectType === 'tag') {
                return;
            }
        }

        this.data.activeElement = {
            clientID,
            attributeID,
        };

        this.notify(UpdateReasons.SHAPE_ACTIVATED);
    }

    public highlight(clientIDs: number[], severity: HighlightSeverity | null): void {
        const elementsIDs = clientIDs.filter((id: number): boolean => (
            this.objects.find((_state: any): boolean => _state.clientID === id)
        ));

        this.data.highlightedElements = {
            elementsIDs,
            severity,
        };

        this.notify(UpdateReasons.SHAPE_HIGHLIGHTED);
    }

    public rotate(rotationAngle: number): void {
        if (this.data.angle !== rotationAngle && !this.data.imageIsDeleted) {
            this.data.angle = (360 + Math.floor(rotationAngle / 90) * 90) % 360;
            this.notify(UpdateReasons.IMAGE_ROTATED);
        }
    }

    public focus(clientID: number, padding: number): void {
        this.data.focusData = {
            clientID,
            padding,
        };

        this.notify(UpdateReasons.SHAPE_FOCUSED);
    }

    public fit(): void {
        const { angle } = this.data;

        let updatedScale = this.data.scale;
        if ((angle / 90) % 2) {
            // 90, 270, ..
            updatedScale = Math.min(
                this.data.canvasSize.width / this.data.imageSize.height,
                this.data.canvasSize.height / this.data.imageSize.width,
            );
        } else {
            updatedScale = Math.min(
                this.data.canvasSize.width / this.data.imageSize.width,
                this.data.canvasSize.height / this.data.imageSize.height,
            );
        }

        updatedScale = Math.min(Math.max(updatedScale, FrameZoom.MIN), FrameZoom.MAX);
        const updatedTop = this.data.canvasSize.height / 2 - this.data.imageSize.height / 2;
        const updatedLeft = this.data.canvasSize.width / 2 - this.data.imageSize.width / 2;

        if (updatedScale !== this.data.scale || updatedTop !== this.data.top || updatedLeft !== this.data.left) {
            this.data.scale = updatedScale;
            this.data.top = updatedTop;
            this.data.left = updatedLeft;

            // scale is changed during zooming or translating
            // so, remember fitted scale to compute fit-relative scaling
            this.data.fittedScale = this.data.scale;
            this.notify(UpdateReasons.IMAGE_FITTED);
        }
    }

    public grid(stepX: number, stepY: number): void {
        this.data.gridSize = {
            height: stepY,
            width: stepX,
        };

        this.notify(UpdateReasons.GRID_UPDATED);
    }

    public draw(drawData: DrawData): void {
        const supportedShapes = [
            'rectangle', 'polygon', 'polyline', 'points', 'ellipse', 'cuboid', 'skeleton', 'mask',
        ];
        if (![Mode.IDLE, Mode.DRAW].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (drawData.enabled) {
            if (drawData.shapeType === 'skeleton' && !drawData.skeletonSVG) {
                throw new Error('Skeleton template must be specified when drawing a skeleton');
            }

            if (!drawData.shapeType && !drawData.initialState) {
                throw new Error('A shape type is not specified');
            }

            if (drawData.shapeType && !supportedShapes.includes(drawData.shapeType)) {
                throw new Error(`Drawing method for type "${drawData.shapeType}" is not implemented`);
            }

            if (typeof drawData.numberOfPoints !== 'undefined') {
                if (drawData.shapeType === 'polygon' && drawData.numberOfPoints < 3) {
                    throw new Error('A polygon consists of at least 3 points');
                } else if (drawData.shapeType === 'polyline' && drawData.numberOfPoints < 2) {
                    throw new Error('A polyline consists of at least 2 points');
                }
            }
        }

        if (typeof drawData.redraw === 'number') {
            const clientID = drawData.redraw;
            const [state] = this.data.objects.filter((_state: any): boolean => _state.clientID === clientID);

            if (state) {
                this.data.drawData = { ...drawData };
                this.data.drawData.shapeType = state.shapeType;
            } else {
                return;
            }
        } else {
            if (disableInternalSVGDrawing(drawData, this.data.drawData)) {
                this.notify(UpdateReasons.DRAW);
                return;
            }

            this.data.drawData = { ...drawData };
            if (this.data.drawData.initialState) {
                this.data.drawData.shapeType = this.data.drawData.initialState.shapeType;
            }
        }

        // install default values for drawing method
        if (drawData.enabled) {
            if (drawData.shapeType === 'rectangle') {
                this.data.drawData.rectDrawingMethod = drawData.rectDrawingMethod || RectDrawingMethod.CLASSIC;
            }
            if (drawData.shapeType === 'cuboid') {
                this.data.drawData.cuboidDrawingMethod = drawData.cuboidDrawingMethod || CuboidDrawingMethod.CLASSIC;
            }
        }

        this.notify(UpdateReasons.DRAW);
    }

    public edit(editData: MasksEditData | PolyEditData): void {
        if (![Mode.IDLE, Mode.EDIT].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if (editData.enabled && !editData.state) {
            throw Error('State must be specified when call edit() editing process');
        }

        if (this.data.editData.enabled && editData.enabled &&
            editData.state.clientID !== this.data.editData.state.clientID
        ) {
            throw Error('State cannot be updated during editing, need to finish current editing first');
        }

        if (editData.enabled) {
            this.data.editData = { ...editData };
        } else if (disableInternalSVGDrawing(editData, this.data.editData)) {
            this.notify(UpdateReasons.EDIT);
            return;
        } else {
            this.data.editData = { enabled: false };
        }

        this.notify(UpdateReasons.EDIT);
    }

    public interact(interactionData: InteractionData): void {
        if (![Mode.IDLE, Mode.INTERACT].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }
        if (interactionData.enabled) {
            if (!this.data.interactionData.enabled && !interactionData.shapeType) {
                throw new Error('A shape type was not specified');
            }
        }
        this.data.interactionData = interactionData;
        if (typeof this.data.interactionData.crosshair !== 'boolean') {
            this.data.interactionData.crosshair = true;
        }

        this.notify(UpdateReasons.INTERACT);
    }

    public split(splitData: SplitData): void {
        if (![Mode.IDLE, Mode.SPLIT].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if ((this.data.splitData.enabled && splitData.enabled) || (
            !this.data.splitData.enabled && !splitData.enabled
        )) {
            return;
        }

        this.data.splitData = { ...splitData };
        this.notify(UpdateReasons.SPLIT);
    }

    public group(groupData: GroupData): void {
        if (![Mode.IDLE, Mode.GROUP].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if ((this.data.groupData.enabled && groupData.enabled) || (
            !this.data.groupData.enabled && !groupData.enabled
        )) {
            return;
        }

        this.data.groupData = { ...groupData };
        this.notify(UpdateReasons.GROUP);
    }

    public join(joinData: JoinData): void {
        if (![Mode.IDLE, Mode.JOIN].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if ((this.data.joinData.enabled && joinData.enabled) || (
            !this.data.joinData.enabled && !joinData.enabled
        )) {
            return;
        }

        this.data.joinData = { ...joinData };
        this.notify(UpdateReasons.JOIN);
    }

    public slice(sliceData: SliceData): void {
        if (![Mode.IDLE, Mode.SLICE].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if ((this.data.sliceData.enabled && sliceData.enabled) || (
            !this.data.sliceData.enabled && !sliceData.enabled
        )) {
            return;
        }

        if (sliceData.enabled && !sliceData.getContour) {
            throw Error('Contours computing method was not provided');
        }

        this.data.sliceData = { ...sliceData };
        this.notify(UpdateReasons.SLICE);
    }

    public merge(mergeData: MergeData): void {
        if (![Mode.IDLE, Mode.MERGE].includes(this.data.mode)) {
            throw Error(`Canvas is busy. Action: ${this.data.mode}`);
        }

        if ((this.data.mergeData.enabled && mergeData.enabled) || (
            !this.data.mergeData.enabled && !mergeData.enabled
        )) {
            return;
        }

        this.data.mergeData = { ...mergeData };
        this.notify(UpdateReasons.MERGE);
    }

    public select(objectState: any): void {
        this.data.selected = objectState;
        this.notify(UpdateReasons.SELECT);
        this.data.selected = null;
    }

    public configure(configuration: Configuration): void {
        if (typeof configuration.displayAllText === 'boolean') {
            this.data.configuration.displayAllText = configuration.displayAllText;
        }

        if (typeof configuration.textFontSize === 'number' && configuration.textFontSize >= consts.MINIMUM_TEXT_FONT_SIZE) {
            this.data.configuration.textFontSize = configuration.textFontSize;
        }

        if (typeof configuration.controlPointsSize === 'number') {
            this.data.configuration.controlPointsSize = configuration.controlPointsSize;
        }

        if (['auto', 'center'].includes(configuration.textPosition)) {
            this.data.configuration.textPosition = configuration.textPosition;
        }

        if (typeof configuration.textContent === 'string') {
            const splitted = configuration.textContent.split(',').filter((entry: string) => !!entry);
            if (splitted.every((entry: string) => ['id', 'label', 'attributes', 'source', 'descriptions'].includes(entry))) {
                this.data.configuration.textContent = configuration.textContent;
            }
        }

        if (typeof configuration.showProjections === 'boolean') {
            this.data.configuration.showProjections = configuration.showProjections;
        }
        if (typeof configuration.autoborders === 'boolean') {
            this.data.configuration.autoborders = configuration.autoborders;
        }
        if (typeof configuration.smoothImage === 'boolean') {
            this.data.configuration.smoothImage = configuration.smoothImage;
        }
        if (typeof configuration.undefinedAttrValue === 'string') {
            this.data.configuration.undefinedAttrValue = configuration.undefinedAttrValue;
        }
        if (typeof configuration.forceDisableEditing === 'boolean') {
            this.data.configuration.forceDisableEditing = configuration.forceDisableEditing;
        }
        if (typeof configuration.intelligentPolygonCrop === 'boolean') {
            this.data.configuration.intelligentPolygonCrop = configuration.intelligentPolygonCrop;
        }
        if (typeof configuration.forceFrameUpdate === 'boolean') {
            this.data.configuration.forceFrameUpdate = configuration.forceFrameUpdate;
        }
        if (typeof configuration.resetZoom === 'boolean') {
            this.data.configuration.resetZoom = configuration.resetZoom;
        }
        if (typeof configuration.selectedShapeOpacity === 'number') {
            this.data.configuration.selectedShapeOpacity = configuration.selectedShapeOpacity;
        }
        if (typeof configuration.shapeOpacity === 'number') {
            this.data.configuration.shapeOpacity = configuration.shapeOpacity;
        }
        if (['string', 'boolean'].includes(typeof configuration.outlinedBorders)) {
            this.data.configuration.outlinedBorders = configuration.outlinedBorders;
        }
        if (Object.values(ColorBy).includes(configuration.colorBy)) {
            this.data.configuration.colorBy = configuration.colorBy;
        }

        if (typeof configuration.showConflicts === 'boolean') {
            this.data.configuration.showConflicts = configuration.showConflicts;
        }

        if (typeof configuration.CSSImageFilter === 'string') {
            this.data.configuration.CSSImageFilter = configuration.CSSImageFilter;
        }

        if (typeof configuration.hideEditedObject === 'boolean') {
            this.data.configuration.hideEditedObject = configuration.hideEditedObject;
        }

        this.notify(UpdateReasons.CONFIG_UPDATED);
    }

    public isAbleToChangeFrame(): boolean {
        const isUnable = [Mode.SLICE, Mode.DRAG, Mode.EDIT, Mode.RESIZE, Mode.INTERACT].includes(this.data.mode) ||
            (this.data.mode === Mode.DRAW && typeof this.data.drawData.redraw === 'number');

        return !isUnable;
    }

    public cancel(): void {
        this.data = {
            ...this.data,
            ...defaultData,
        };
        this.notify(UpdateReasons.CANCEL);
    }

    public destroy(): void {
        this.notify(UpdateReasons.DESTROY);
    }

    public get configuration(): Configuration {
        return { ...this.data.configuration };
    }

    public get geometry(): Geometry {
        return {
            angle: this.data.angle,
            canvas: { ...this.data.canvasSize },
            image: { ...this.data.imageSize },
            grid: { ...this.data.gridSize },
            left: this.data.left,
            offset: this.data.imageOffset,
            scale: this.data.scale,
            top: this.data.top,
        };
    }

    public set geometry(geometry: Geometry) {
        this.data.angle = geometry.angle;
        this.data.canvasSize = { ...geometry.canvas };
        this.data.imageSize = { ...geometry.image };
        this.data.gridSize = { ...geometry.grid };
        this.data.left = geometry.left;
        this.data.top = geometry.top;
        this.data.imageOffset = geometry.offset;
        this.data.scale = geometry.scale;

        this.data.imageOffset = Math.floor(
            Math.max(this.data.canvasSize.height / FrameZoom.MIN, this.data.canvasSize.width / FrameZoom.MIN),
        );
    }

    public get zLayer(): number | null {
        return this.data.zLayer;
    }

    public get imageBitmap(): boolean {
        return this.data.imageBitmap;
    }

    public get imageIsDeleted(): boolean {
        return this.data.imageIsDeleted;
    }

    public get image(): Image | null {
        return this.data.image;
    }

    public get issueRegions(): Record<number, { hidden: boolean; points: number[] }> {
        return { ...this.data.issueRegions };
    }

    public get objects(): any[] {
        if (this.data.zLayer !== null) {
            return this.data.objects.filter((object: any): boolean => object.zOrder <= this.data.zLayer);
        }

        return this.data.objects;
    }

    public get gridSize(): Size {
        return { ...this.data.gridSize };
    }

    public get focusData(): FocusData {
        return { ...this.data.focusData };
    }

    public get activeElement(): ActiveElement {
        return { ...this.data.activeElement };
    }

    public get highlightedElements(): HighlightedElements {
        return { ...this.data.highlightedElements };
    }

    public get drawData(): DrawData {
        return { ...this.data.drawData };
    }

    public get editData(): MasksEditData | PolyEditData {
        return { ...this.data.editData };
    }

    public get interactionData(): InteractionData {
        return { ...this.data.interactionData };
    }

    public get mergeData(): MergeData {
        return { ...this.data.mergeData };
    }

    public get splitData(): SplitData {
        return { ...this.data.splitData };
    }

    public get joinData(): JoinData {
        return { ...this.data.joinData };
    }

    public get sliceData(): SliceData {
        return { ...this.data.sliceData };
    }

    public get groupData(): GroupData {
        return { ...this.data.groupData };
    }

    public get selected(): any {
        return this.data.selected;
    }

    public set mode(value: Mode) {
        this.data.mode = value;
    }

    public get mode(): Mode {
        return this.data.mode;
    }
    public get exception(): Error {
        return this.data.exception;
    }
}
