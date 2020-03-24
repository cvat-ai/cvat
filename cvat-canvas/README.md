# Module CVAT-CANVAS

## Description
The CVAT module written in TypeScript language.
It presents a canvas to viewing, drawing and editing of annotations.

## Commands
- Building of the module from sources in the ```dist``` directory:

```bash
npm run build
npm run build -- --mode=development     # without a minification
```

- Updating of a module version:
```bash
npm version patch   # updated after minor fixes
npm version minor   # updated after major changes which don't affect API compatibility with previous versions
npm version major   # updated after major changes which affect API compatibility with previous versions
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

    enum Mode {
        IDLE = 'idle',
        DRAG = 'drag',
        RESIZE = 'resize',
        DRAW = 'draw',
        EDIT = 'edit',
        MERGE = 'merge',
        SPLIT = 'split',
        GROUP = 'group',
        DRAG_CANVAS = 'drag_canvas',
        ZOOM_CANVAS = 'zoom_canvas',
    }

    interface DrawData {
        enabled: boolean;
        shapeType?: string;
        rectDrawingMethod?: RectDrawingMethod;
        numberOfPoints?: number;
        initialState?: any;
        crosshair?: boolean;
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
        mode(): Mode;
        html(): HTMLDivElement;
        setZLayer(zLayer: number | null): void;
        setup(frameData: any, objectStates: any[]): void;
        activate(clientID: number, attributeID?: number): void;
        rotate(frameAngle: number): void;
        focus(clientID: number, padding?: number): void;
        fit(): void;
        grid(stepX: number, stepY: number): void;

        draw(drawData: DrawData): void;
        group(groupData: GroupData): void;
        split(splitData: SplitData): void;
        merge(mergeData: MergeData): void;
        select(objectState: any): void;

        fitCanvas(): void;
        dragCanvas(enable: boolean): void;
        zoomCanvas(enable: boolean): void;

        cancel(): void;
    }
```

### API CSS

- All drawn objects (shapes, tracks) have an id ```cvat_canvas_shape_{objectState.clientID}```
- Drawn shapes and tracks have classes ```cvat_canvas_shape```,
 ```cvat_canvas_shape_activated```,
 ```cvat_canvas_shape_grouping```,
 ```cvat_canvas_shape_merging```,
 ```cvat_canvas_shape_drawing```,
 ```cvat_canvas_shape_occluded```
- Drawn texts have the class ```cvat_canvas_text```
- Tags have the class ```cvat_canvas_tag```
- Canvas image has ID ```cvat_canvas_image```
- Grid on the canvas has ID ```cvat_canvas_grid``` and ```cvat_canvas_grid_pattern```
- Crosshair during a draw has class ```cvat_canvas_crosshair```

### Events

Standard JS events are used.
```js
    - canvas.setup
    - canvas.activated => {state: ObjectState}
    - canvas.clicked => {state: ObjectState}
    - canvas.moved => {states: ObjectState[], x: number, y: number}
    - canvas.find => {states: ObjectState[], x: number, y: number}
    - canvas.drawn => {state: DrawnData}
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

|              | IDLE | GROUPING | SPLITTING | DRAWING | MERGING | EDITING | DRAG | ZOOM |
|--------------|------|----------|-----------|---------|---------|---------|------|------|
| html()       | +    | +        | +         | +       | +       | +       | +    | +    |
| setup()      | +    | +        | +         | +       | +       | -       | +    | +    |
| activate()   | +    | -        | -         | -       | -       | -       | -    | -    |
| rotate()     | +    | +        | +         | +       | +       | +       | +    | +    |
| focus()      | +    | +        | +         | +       | +       | +       | +    | +    |
| fit()        | +    | +        | +         | +       | +       | +       | +    | +    |
| grid()       | +    | +        | +         | +       | +       | +       | +    | +    |
| draw()       | +    | -        | -         | -       | -       | -       | -    | -    |
| split()      | +    | -        | +         | -       | -       | -       | -    | -    |
| group()      | +    | +        | -         | -       | -       | -       | -    | -    |
| merge()      | +    | -        | -         | -       | +       | -       | -    | -    |
| fitCanvas()  | +    | +        | +         | +       | +       | +       | +    | +    |
| dragCanvas() | +    | -        | -         | -       | -       | -       | +    | -    |
| zoomCanvas() | +    | -        | -         | -       | -       | -       | -    | +    |
| cancel()     | -    | +        | +         | +       | +       | +       | +    | +    |
| setZLayer()  | +    | +        | +         | +       | +       | +       | +    | +    |
