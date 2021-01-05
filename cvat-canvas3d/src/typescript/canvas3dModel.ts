import {MasterImpl} from './master';

export interface Size {
    width: number;
    height: number;
}

export interface Image {
    renderWidth: number;
    renderHeight: number;
    imageData: ImageData | CanvasImageSource;
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

export enum RectDrawingMethod {
    CLASSIC = 'By 2 points',
    EXTREME_POINTS = 'By 4 points',
}

export enum CuboidDrawingMethod {
    CLASSIC = 'From rectangle',
    CORNER_POINTS = 'By 4 points',
}

export interface Configuration {
    autoborders?: boolean;
    displayAllText?: boolean;
    undefinedAttrValue?: string;
    showProjections?: boolean;
    forceDisableEditing?: boolean;
}

export interface DrawData {
    enabled: boolean;
    shapeType?: string;
    rectDrawingMethod?: RectDrawingMethod;
    cuboidDrawingMethod?: CuboidDrawingMethod;
    numberOfPoints?: number;
    initialState?: any;
    crosshair?: boolean;
    redraw?: number;
}

export interface InteractionData {
    enabled: boolean;
    shapeType?: string;
    crosshair?: boolean;
    minPosVertices?: number;
    minNegVertices?: number;
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

export enum FrameZoom {
    MIN = 0.1,
    MAX = 10,
}

export enum UpdateReasons {
    IMAGE_CHANGED = 'image_changed',
    IMAGE_ZOOMED = 'image_zoomed',
    IMAGE_FITTED = 'image_fitted',
    IMAGE_MOVED = 'image_moved',
    GRID_UPDATED = 'grid_updated',
    ISSUE_REGIONS_UPDATED = 'issue_regions_updated',
    OBJECTS_UPDATED = 'objects_updated',
    SHAPE_ACTIVATED = 'shape_activated',
    SHAPE_FOCUSED = 'shape_focused',
    FITTED_CANVAS = 'fitted_canvas',
    INTERACT = 'interact',
    DRAW = 'draw',
    MERGE = 'merge',
    SPLIT = 'split',
    GROUP = 'group',
    SELECT = 'select',
    CANCEL = 'cancel',
    BITMAP = 'bitmap',
    SELECT_REGION = 'select_region',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
    CONFIG_UPDATED = 'config_updated',
    DATA_FAILED = 'data_failed',
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
    INTERACT = 'interact',
    SELECT_REGION = 'select_region',
    DRAG_CANVAS = 'drag_canvas',
    ZOOM_CANVAS = 'zoom_canvas',
}

export interface Canvas3dModel {
    mode: Mode;
    readonly configuration: Configuration;

    configure(configuration: Configuration): void;

    setup(frameData: any, objectStates: any[], zLayer: number): void;

    fit(): void;

    isAbleToChangeFrame(): boolean;

    fitCanvas(width: number, height: number): void;

}

export class Canvas3dModelImpl extends MasterImpl implements Canvas3dModel {

    private data: {
        activeElement: ActiveElement;
        angle: number;
        canvasSize: Size;
        configuration: Configuration;
        imageBitmap: boolean;
        image: Image | null;
        imageID: number | null;
        imageOffset: number;
        imageSize: Size;
        focusData: FocusData;
        gridSize: Size;
        left: number;
        objects: any[];
        issueRegions: Record<number, number[]>;
        scale: number;
        top: number;
        zLayer: number | null;
        drawData: DrawData;
        interactionData: InteractionData;
        mergeData: MergeData;
        groupData: GroupData;
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
            angle: 0,
            canvasSize: {
                height: 0,
                width: 0,
            },
            configuration: {
                displayAllText: false,
                autoborders: false,
                undefinedAttrValue: '',
            },
            imageBitmap: false,
            image: null,
            imageID: null,
            imageOffset: 0,
            imageSize: {
                height: 0,
                width: 0,
            },
            focusData: {
                clientID: 0,
                padding: 0,
            },
            gridSize: {
                height: 100,
                width: 100,
            },
            left: 0,
            objects: [],
            issueRegions: {},
            scale: 1,
            top: 0,
            zLayer: null,
            drawData: {
                enabled: false,
                initialState: null,
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
            selected: null,
            mode: Mode.IDLE,
            exception: null,
        };
    }

    public configure(configuration: Configuration): void {
        if (typeof configuration.displayAllText !== 'undefined') {
            this.data.configuration.displayAllText = configuration.displayAllText;
        }

        if (typeof configuration.showProjections !== 'undefined') {
            this.data.configuration.showProjections = configuration.showProjections;
        }
        if (typeof configuration.autoborders !== 'undefined') {
            this.data.configuration.autoborders = configuration.autoborders;
        }

        if (typeof configuration.undefinedAttrValue !== 'undefined') {
            this.data.configuration.undefinedAttrValue = configuration.undefinedAttrValue;
        }

        if (typeof configuration.forceDisableEditing !== 'undefined') {
            this.data.configuration.forceDisableEditing = configuration.forceDisableEditing;
        }

        this.notify(UpdateReasons.CONFIG_UPDATED);
    }

    public fit(): void {
        const {angle} = this.data;

        if ((angle / 90) % 2) {
            // 90, 270, ..
            this.data.scale = Math.min(
                this.data.canvasSize.width / this.data.imageSize.height,
                this.data.canvasSize.height / this.data.imageSize.width,
            );
        } else {
            this.data.scale = Math.min(
                this.data.canvasSize.width / this.data.imageSize.width,
                this.data.canvasSize.height / this.data.imageSize.height,
            );
        }

        this.data.scale = Math.min(Math.max(this.data.scale, FrameZoom.MIN), FrameZoom.MAX);

        this.data.top = this.data.canvasSize.height / 2 - this.data.imageSize.height / 2;
        this.data.left = this.data.canvasSize.width / 2 - this.data.imageSize.width / 2;

        this.notify(UpdateReasons.IMAGE_FITTED);
    }


    public get configuration(): Configuration {
        return {...this.data.configuration};
    }

    public setup(frameData: any, objectStates: any[], zLayer: number): void {
        if (this.data.imageID !== frameData.number) {
            // @ts-ignore
            if ([Mode.EDIT, Mode.DRAG, Mode.RESIZE].includes(this.data.mode)) {
                throw Error(`Canvas is busy. Action: ${this.data.mode}`);
            }
        }

        if (frameData.number === this.data.imageID) {
            this.data.zLayer = zLayer;
            this.data.objects = objectStates;
            this.notify(UpdateReasons.OBJECTS_UPDATED);
            return;
        }

        this.data.imageID = frameData.number;
        frameData
            .data((): void => {
                this.data.image = null;
                this.notify(UpdateReasons.IMAGE_CHANGED);
            })
            .then((data: Image): void => {
                if (frameData.number !== this.data.imageID) {
                    // already another image
                    return;
                }

                this.data.imageSize = {
                    height: frameData.height as number,
                    width: frameData.width as number,
                    frameData: frameData.number
                };

                this.data.image = data;
                this.notify(UpdateReasons.IMAGE_CHANGED);
                this.data.zLayer = zLayer;
                this.data.objects = objectStates;
                this.notify(UpdateReasons.OBJECTS_UPDATED);
            })
            .catch((exception: any): void => {
                this.data.exception = exception;
                this.notify(UpdateReasons.DATA_FAILED);
                throw exception;
            });
    }

    public set mode(value: Mode) {
        this.data.mode = value;
    }

    public get mode(): Mode {
        return this.data.mode;
    }

    public isAbleToChangeFrame(): boolean {
        const isUnable = [Mode.DRAG, Mode.EDIT, Mode.RESIZE, Mode.INTERACT].includes(this.data.mode)
            || (this.data.mode === Mode.DRAW && typeof this.data.drawData.redraw === 'number');

        return !isUnable;
    }

    public fitCanvas(width: number, height: number): void {
        this.data.canvasSize.height = height;
        this.data.canvasSize.width = width;

        this.data.imageOffset = Math.floor(
            Math.max(this.data.canvasSize.height / FrameZoom.MIN, this.data.canvasSize.width / FrameZoom.MIN),
        );

        this.notify(UpdateReasons.FITTED_CANVAS);
        this.notify(UpdateReasons.OBJECTS_UPDATED);
    }

}
