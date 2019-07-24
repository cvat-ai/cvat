## Module

- Written on typescript
- Contains the class ```Canvas```

## Creation
Canvas is created by using constructor:

```js
    const canvas = new Canvas({
        size: {
            width: 1024,
            height: 768,
        },
        shapeSelector: callback,
        captureMode: 'move' | 'click',
        backgroundColor: '#0320fd',
    });
```

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

```js
    html() => canvas HTML element
    initialize(const FrameData: frameData, [{
        state: ObjectState,
        appearance: {   // all these fields are optional
            borderColor: 'color',
            fillColor: 'color',
            fillOpacity: 50,
            selectedFillOpacity: 50,
        }
    }]) => undefined

    activate(const number: clientID, const number: attributeID = null) => undefined // select if can't activate
    rotate(const number: degrees = 90) => undefined
    focus(const number: id, const number: padding) => undefined
    fit() => undefined
    grid(stepX, stepY, color, opacity) => undefined
    adjust({
        brightness: 50,
        contrast: 50,
        saturation: 50,
    }) => undefined

    draw(shapeType, numberOfPoints = null, initializeState = null) => ObjectState
    split(const boolean: enabled = false) => ObjectState || undefined
    group(const boolean: enabled = false) => [ObjectState] || undefined
    merge(const boolean: enabled = false) => [ObjectState] || undefined

    cancel() => undefined
```

### Events
Standard JS events are used.
```js
    - canvas.initialized
    - canvas.activated => ObjectState
    - canvas.deactivated
    - canvas.selected => ObjectState
    - canvas.unselected
    - canvas.clicked => ObjectState
    - canvas.drawn => ObjectState
    - canvas.edited => ObjectState
    - canvas.splitted => ObjectState
    - canvas.groupped => [ObjectState]
    - canvas.edited => ObjectState
    - canvas.merged => [ObjectState]
```
