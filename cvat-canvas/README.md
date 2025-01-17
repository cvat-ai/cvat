# Module CVAT-CANVAS

## Description

The CVAT module written in TypeScript language.
It presents a canvas to viewing, drawing and editing of annotations.

## Commands

- Building of the module from sources in the `dist` directory:

```bash
yarn run build
yarn run build --mode=development     # without a minification
```

### API Methods

For API methods, their arguments and return types, please look at ``canvas.ts``.

### API CSS

- All drawn objects (shapes, tracks) have an id `cvat_canvas_shape_{objectState.clientID}`
- Drawn shapes and tracks have classes `cvat_canvas_shape`,
  `cvat_canvas_shape_activated`,
  `cvat_canvas_shape_selection`,
  `cvat_canvas_shape_merging`,
  `cvat_canvas_shape_drawing`,
  `cvat_canvas_shape_occluded`
- Drawn review ROIs have an id `cvat_canvas_issue_region_{issue.id}`
- Drawn review roi has the class `cvat_canvas_issue_region`
- Drawn texts have the class `cvat_canvas_text`
- Tags have the class `cvat_canvas_tag`
- Canvas image has ID `cvat_canvas_image`
- Grid on the canvas has ID `cvat_canvas_grid` and `cvat_canvas_grid_pattern`
- Crosshair during a draw has class `cvat_canvas_crosshair`
- To stick something to a specific position you can use an element with id `cvat_canvas_attachment_board`

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
    - canvas.edited => {state: ObjectState, points: number[], rotation?: number}
    - canvas.splitted => {state: ObjectState, frame: number, duration: number}
    - canvas.groupped => {states: ObjectState[], duration: number}
    - canvas.joined => {states: ObjectState[], points: number[], duration: number}
    - canvas.sliced => {state: ObjectState, results: number[][], duration: number}
    - canvas.merged => {states: ObjectState[], duration: number}
    - canvas.canceled
    - canvas.dragstart
    - canvas.dragstop
    - canvas.zoomstart
    - canvas.zoomstop
    - canvas.zoom
    - canvas.reshape
    - canvas.fit
    - canvas.regionselected => {points: number[]}
    - canvas.dragshape => {duration: number, state: ObjectState}
    - canvas.roiselected => {points: number[]}
    - canvas.resizeshape => {duration: number, state: ObjectState}
    - canvas.contextmenu => { mouseEvent: MouseEvent, objectState: ObjectState,  pointID: number }
    - canvas.message => { messages: { type: 'text' | 'list'; content: string | string[]; className?: string; icon?: 'info' | 'loading' }[] | null, topic: string }
    - canvas.error => { exception: Error, domain?: string }
    - canvas.destroy
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

<!--lint disable maximum-line-length-->

## API Reaction

|                | IDLE | GROUP | SPLIT | DRAW | MERGE | EDIT | DRAG | RESIZE | ZOOM_CANVAS | DRAG_CANVAS | INTERACT | JOIN | SLICE | SELECT_REGION |
| -------------- | ---- | ----- | ----- | ---- | ----- | ---- | ---- | ------ | ----------- | ----------- | -------- | ---- | ----- | ------------- |
| setup()        | +    | +     | +     | +/-  | +     | +/-  | +/-  | +/-    | +           | +           | +        | +    | +     | +             |
| activate()     | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | -        | -    | -     | -             |
| rotate()       | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| focus()        | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| fit()          | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| grid()         | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| draw()         | +    | -     | -     | +    | -     | -    | -    | -      | -           | -           | -        | -    | -     | -             |
| interact()     | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | +        | -    | -     | -             |
| split()        | +    | -     | +     | -    | -     | -    | -    | -      | -           | -           | -        | -    | -     | -             |
| group()        | +    | +     | -     | -    | -     | -    | -    | -      | -           | -           | -        | -    | -     | -             |
| merge()        | +    | -     | -     | -    | +     | -    | -    | -      | -           | -           | -        | -    | -     | -             |
| edit()         | +    | -     | -     | -    | -     | +    | -    | -      | -           | -           | -        | -    | -     | -             |
| join()         | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | -        | +    | -     | -             |
| slice()        | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | -        | -    | +     | -             |
| selectRegion() | +    | -     | -     | -    | -     | -    | -    | -      | -           | -           | -        | -    | -     | +             |
| fitCanvas()    | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| dragCanvas()   | +    | -     | -     | -    | -     | -    | +    | -      | -           | +           | -        | -    | -     | -             |
| zoomCanvas()   | +    | -     | -     | -    | -     | -    | -    | +      | +           | -           | -        | -    | -     | -             |
| cancel()       | -    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| configure()    | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| bitmap()       | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| setZLayer()    | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |
| destroy()      | +    | +     | +     | +    | +     | +    | +    | +      | +           | +           | +        | +    | +     | +             |

<!--lint enable maximum-line-length-->

You can call setup() during editing, dragging, and resizing only to update objects, not to change a frame.
You can change frame during draw only when you do not redraw an existing object

Other methods do not change state and can be used at any time.
