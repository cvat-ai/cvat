# Module CVAT-CANVAS

## Description
The CVAT module presents a canvas to viewing, drawing and editing of annotations.

- It has been written on typescript
- It contains the class ```Canvas``` and the enum ```Rotation```

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

## Creation
Canvas is created by using constructor:

```js
    const { Canvas } = require('./canvas');
    const canvas = new Canvas(ObjectStateClass);
```

- Canvas has transparent background

Canvas itself handles:
- Shape context menu (PKM)
- Image moving (mousedrag)
- Image resizing (mousewheel)
- Image fit (dblclick)
- Remove point (PKM)
- Polyshape editing (Shift + LKM)

## API
### Methods

All methods are sync.

```ts
    interface DrawData {
        enabled: boolean;
        shapeType?: string;
        numberOfPoints?: number;
        initialState?: any;
        crosshair?: boolean;
    }

    html(): HTMLDivElement;
    setup(frameData: FrameData, objectStates: ObjectState): void;
    activate(clientID: number, attributeID?: number): void;
    rotate(rotation: Rotation, remember?: boolean): void;
    focus(clientID: number, padding?: number): void;
    fit(): void;
    grid(stepX: number, stepY: number): void;

    draw(drawData: DrawData): void;
    split(enabled?: boolean): void;
    group(enabled?: boolean): void;
    merge(enabled?: boolean): void;

    cancel(): any;
```

### CSS Classes/IDs

- All drawn objects (shapes, tracks) have an id ```cvat_canvas_object_{objectState.id}```
- Drawn shapes and tracks have classes ```cvat_canvas_shape```,
 ```cvat_canvas_shape_activated```,
 ```cvat_canvas_shape_grouping```,
 ```cvat_canvas_shape_merging```,
 ```cvat_canvas_shape_drawing```
- Drawn texts have the class ```cvat_canvas_text```
- Tags have the class ```cvat_canvas_tag```
- Canvas image has ID ```cvat_canvas_image```
- Grid on the canvas has ID ```cvat_canvas_grid_pattern```
- Crosshair during a draw has class ```cvat_canvas_crosshair```

### Events

Standard JS events are used.
```js
    - canvas.setup
    - canvas.activated => ObjectState
    - canvas.deactivated
    - canvas.moved => [ObjectState], x, y
    - canvas.drawn => ObjectState
    - canvas.edited => ObjectState
    - canvas.splitted => ObjectState
    - canvas.groupped => [ObjectState]
    - canvas.merged => [ObjectState]
    - canvas.canceled
```

## States

 ![](images/states.svg)

## API Reaction

|            | IDLE | GROUPING | SPLITTING | DRAWING | MERGING | EDITING |
|------------|------|----------|-----------|---------|---------|---------|
| html()     | +    | +        | +         | +       | +       | +       |
| setup()    | +    | +        | +         | +       | +       | -       |
| activate() | +    | -        | -         | -       | -       | -       |
| rotate()   | +    | +        | +         | +       | +       | +       |
| focus()    | +    | +        | +         | +       | +       | +       |
| fit()      | +    | +        | +         | +       | +       | +       |
| grid()     | +    | +        | +         | +       | +       | +       |
| draw()     | +    | -        | -         | -       | -       | -       |
| split()    | +    | -        | +         | -       | -       | -       |
| group      | +    | +        | -         | -       | -       | -       |
| merge()    | +    | -        | -         | -       | +       | -       |
| cancel()   | -    | +        | +         | +       | +       | +       |
