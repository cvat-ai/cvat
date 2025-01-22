# Module CVAT-CANVAS-3D

## Description

The CVAT module written in TypeScript language.
It presents a canvas to viewing, drawing and editing of 3D annotations.

## Commands

- Building of the module from sources in the `dist` directory:

```bash
yarn run build
yarn run build --mode=development     # without a minification
```

### API Methods

```ts
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
  configureShapes(shapeProperties: ShapeProperties): void;
  fitCanvas(): void;
  fit(): void;
  group(groupData: GroupData): void;
}
```

### WEB

```js
// Create an instance of a canvas
const canvas = new window.canvas.Canvas3d();

console.log('Version ', window.canvas.CanvasVersion);
console.log('Current mode is ', window.canvas.mode());

// Put canvas to a html container
const views = canvas.html();
htmlContainer.appendChild(views.perspective);
htmlContainer.appendChild(views.top);
htmlContainer.appendChild(views.side);
htmlContainer.appendChild(views.front);
```
