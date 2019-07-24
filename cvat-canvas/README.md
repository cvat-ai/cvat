## Module

- Written on typescript
- Contains the class ```Canvas```

## Creation
Canvas is created by using constructor:

```js
    const canvas = new Canvas();
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

```js
    html() => canvas HTML element
    setup(const FrameData: frameData, [{
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
    - canvas.setup
    - canvas.activated => ObjectState
    - canvas.deactivated
    - canvas.moved => [ObjectState], x, y
    - canvas.drawn => ObjectState
    - canvas.edited => ObjectState
    - canvas.splitted => ObjectState
    - canvas.groupped => [ObjectState]
    - canvas.merged => [ObjectState]
```

## States

 ![](images/states.png)

## API Reaction

|            | FREE | GROUPING | SPLITTING | DRAWING | MERGING | EDITING |
|------------|------|----------|-----------|---------|---------|---------|
| html()     | +    | +        | +         | +       | +       | +       |
| setup()    | +    | +        | +         | +       | +       | -       |
| activate() | +    | -        | -         | -       | -       | -       |
| rotate()   | +    | +        | +         | +       | +       | +       |
| focus()    | +    | +        | +         | +       | +       | +       |
| fit()      | +    | +        | +         | +       | +       | +       |
| grid()     | +    | +        | +         | +       | +       | +       |
| adjust()   | +    | +        | +         | +       | +       | +       |
| draw()     | +    | -        | -         | -       | -       | -       |
| split()    | +    | -        | +         | -       | -       | -       |
| group      | +    | +        | -         | -       | -       | -       |
| merge()    | +    | -        | -         | -       | +       | -       |
| cancel()   | -    | +        | +         | +       | +       | +       |