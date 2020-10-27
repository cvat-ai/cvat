# Module CVAT-CANVAS

## Description

The CVAT module written in TypeScript language.
It presents a canvas to viewing, drawing and editing of annotations.

## Versioning

If you make changes in this package, please do following:

- After not important changes (typos, backward compatible bug fixes, refactoring) do: `npm version patch`
- After changing API (backward compatible new features) do: `npm version minor`
- After changing API (changes that break backward compatibility) do: `npm version major`

## Commands

- Building of the module from sources in the `dist` directory:

```bash
npm run build
npm run build -- --mode=development     # without a minification
```

## Using

Canvas itself handles:

- Shape context menu (PKM)
- Image moving (mousedrag)
- Image resizing (mousewheel)
- Image fit (dblclick)
- Remove point (PKM)
- Polyshape editing (Shift + LKM)

### API Methods

```ts
    enum RectDrawingMethod {
        CLASSIC = 'By 2 points',
        EXTREME_POINTS = 'By 4 points'
    }

    enum CuboidDrawingMethod {
        CLASSIC = 'From rectangle',
        CORNER_POINTS = 'By 4 points',
    }

    enum Mode {
        IDLE = 'idle',
        DRAG = 'drag',
        RESIZE = 'resize',
        INTERACT = 'interact',
        DRAW = 'draw',
        EDIT = 'edit',
        MERGE = 'merge',
        SPLIT = 'split',
        GROUP = 'group',
        DRAG_CANVAS = 'drag_canvas',
        ZOOM_CANVAS = 'zoom_canvas',
    }

    interface Configuration {
        displayAllText?: boolean;
        undefinedAttrValue?: string;
    }

    interface DrawData {
        enabled: boolean;
        shapeType?: string;
        rectDrawingMethod?: RectDrawingMethod;
        cuboidDrawingMethod?: CuboidDrawingMethod;
        numberOfPoints?: number;
        initialState?: any;
        crosshair?: boolean;
    }

    interface InteractionData {
        shapeType: string;
        minVertices?: number;
    }

    interface GroupData {
        enabled: boolean;
        resetGroup?: boolean;
    }

    interface MergeData {
        enabled: boolean;
    }

    interface SplitData {
        enabled: boolean;
    }

    interface InteractionResult {
        points: number[];
        shapeType: string;
        button: number;
    };

    interface DrawnData {
        shapeType: string;
        points: number[];
        objectType?: string;
        occluded?: boolean;
        attributes?: [index: number]: string;
        label?: Label;
        color?: string;
    }

    interface Canvas {
        html(): HTMLDivElement;
        setZLayer(zLayer: number | null): void;
        setup(frameData: any, objectStates: any[]): void;
        activate(clientID: number, attributeID?: number): void;
        rotate(frameAngle: number): void;
        focus(clientID: number, padding?: number): void;
        fit(): void;
        grid(stepX: number, stepY: number): void;

        draw(drawData: DrawData): void;
        interact(interactionData: InteractionData): void;
        group(groupData: GroupData): void;
        split(splitData: SplitData): void;
        merge(mergeData: MergeData): void;
        select(objectState: any): void;

        fitCanvas(): void;
        bitmap(enabled: boolean): void;
        dragCanvas(enable: boolean): void;
        zoomCanvas(enable: boolean): void;

        mode(): Mode;
        cancel(): void;
        configure(configuration: Configuration): void;
        isAbleToChangeFrame(): boolean;
    }
```

### API CSS

- All drawn objects (shapes, tracks) have an id `cvat_canvas_shape_{objectState.clientID}`
- Drawn shapes and tracks have classes `cvat_canvas_shape`,
  `cvat_canvas_shape_activated`,
  `cvat_canvas_shape_grouping`,
  `cvat_canvas_shape_merging`,
  `cvat_canvas_shape_drawing`,
  `cvat_canvas_shape_occluded`
- Drawn texts have the class `cvat_canvas_text`
- Tags have the class `cvat_canvas_tag`
- Canvas image has ID `cvat_canvas_image`
- Grid on the canvas has ID `cvat_canvas_grid` and `cvat_canvas_grid_pattern`
- Crosshair during a draw has class `cvat_canvas_crosshair`

### Events

Standard JS events are used.

```js
    - canvas.setup
    - canvas.activated => {state: ObjectState}
    - canvas.clicked => {state: ObjectState}
    - canvas.moved => {states: ObjectState[], x: number, y: number}
    - canvas.find => {states: ObjectState[], x: number, y: number}
    - canvas.drawn => {state: DrawnData}
    - canvas.interacted => {shapes: InteractionResult[]}
    - canvas.editstart
    - canvas.edited => {state: ObjectState, points: number[]}
    - canvas.splitted => {state: ObjectState}
    - canvas.groupped => {states: ObjectState[]}
    - canvas.merged => {states: ObjectState[]}
    - canvas.canceled
    - canvas.dragstart
    - canvas.dragstop
    - canvas.zoomstart
    - canvas.zoomstop
    - canvas.zoom
    - canvas.fit
    - canvas.dragshape => {id: number}
    - canvas.resizeshape => {id: number}
    - canvas.contextmenu => { mouseEvent: MouseEvent, objectState: ObjectState,  pointID: number }
```

### WEB

```js
// Create an instance of a canvas
const canvas = new window.canvas.Canvas();

console.log('Version ', window.canvas.CanvasVersion);
console.log('Current mode is ', window.canvas.mode());

// Put canvas to a html container
htmlContainer.appendChild(canvas.html());
canvas.fitCanvas();

// Next you can use its API methods. For example:
canvas.rotate(270);
canvas.draw({
  enabled: true,
  shapeType: 'rectangle',
  crosshair: true,
  rectDrawingMethod: window.Canvas.RectDrawingMethod.CLASSIC,
});
```

## API Reaction

|              | IDLE | GROUP | SPLIT | DRAW | MERGE | EDIT | DRAG | RESIZE | ZOOM_CANVAS | DRAG_CANVAS | INTERACT |
| ------------ | ---- | ----- | ----- | ---- | ----- | ---- | ---- | ------ | ----------- | ----------- | -------- |
| setup()      | +    | +     | +     | +/-  | +     | +/-  | +/-  | +/-    | +           | +           | +        |
| activate()   | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | -        |
| rotate()     | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| focus()      | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| fit()        | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| grid()       | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| draw()       | +    | -     | -     | +    | -     | -    | -    | -      | -           | -           | -        |
| interact()   | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | +        |
| split()      | +    | -     | +     | -    | -     | -    | -    | -      | -           | -           | -        |
| group()      | +    | +     | -     | -    | -     | -    | -    | -      | -           | -           | -        |
| merge()      | +    | -     | -     | -    | +     | -    | -    | -      | -           | -           | -        |
| fitCanvas()  | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| dragCanvas() | +    | -     | -     | -    | -     | -    | +    | -      | -           | +           | -        |
| zoomCanvas() | +    | -     | -     | -    | -     | -    | -    | +      | +           | -           | -        |
| cancel()     | -    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| configure()  | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| bitmap()     | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |
| setZLayer()  | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        |

You can call setup() during editing, dragging, and resizing only to update objects, not to change a frame.
You can change frame during draw only when you do not redraw an existing object

Other methods do not change state and can be used everytime.
