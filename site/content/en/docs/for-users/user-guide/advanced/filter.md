---
title: "Filter"
linkTitle: "Filter"
weight: 16
---

![](/images/image059.jpg)

There are some reasons to use the feature:

1. When you use a filter, objects that don't match the filter will be hidden.
1. The fast navigation between frames which have an object of interest.
   Use the `Left Arrow` / `Right Arrow` keys for this purpose
   or customize the UI buttons by right-clicking and select "switching by filter".
   If there are no objects which correspond to the filter,
   you will go to the previous / next frame which contains any annotated objects.
1. The list contains frequently used and recent filters.

To use the function, it is enough to specify a value inside the `Filter` text
field and press `Enter`. After that, the filter will be applied.

---

**Supported properties:**

| Properties | Supported values                                       | Description                                                                                                |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `width`    | number of px or `height`                               | shape width                                                                                                |
| `height`   | number of px or `width`                                | shape height                                                                                               |
| `label`    | `"text"` or `["text"]`                                 | label name                                                                                                 |
| `serverID` | number                                                 | ID of the object on server <br> (You can find out by forming a link to the object through the Action menu) |
| `clientID` | number                                                 | ID of the object in your client (indicated on the objects sidebar)                                         |
| `type`     | `"shape"`, `"track"`, `"tag"`                          | type of object                                                                                             |
| `shape`    | `"rectangle"`,`"polygon"`, <br>`"polyline"`,`"points"` | type of shape                                                                                              |
| `occluded` | `true` or `false`                                      | occluded properties                                                                                        |
| `attr`     | `"text"`                                               | attribute name                                                                                             |

**Supported operators:**

`==` - Equally; `!=` - Not equal; `>` - More; `>=` - More or equal; `<` - Less; `<=` - Less or equal;
`()` - Brackets; `&` - And; `|`- Or.

If you have double quotes in your query string, please escape them using backslash: `\"` (see the latest example)
All properties and values are case-sensitive. CVAT uses json queries to perform search.

---

**Examples filters**

- `label=="car" | label==["road sign"]` - this filter will show only objects with the car or road sign label.
- `shape == "polygon"` - this filter will show only polygons.
- `width >= height` - this filter will show only those objects whose width will be greater than
  or equal to the height.
- `attr["color"] == "black"` - this filter will show objects whose color attribute is black.
- `clientID == 50` - this filter will show the object with id equal to 50 (e.g. rectangle 50).
- `(label=="car" & attr["parked"]==true) | (label=="pedestrian" & width > 150)` - this filter will display objects
  with the “car” label and the parking attribute enabled or objects with the “pedestrian” label with a height of more
  than 150 pixels
- `(( label==["car \"mazda\""]) | (attr["parked"]==true & width > 150)) & (height > 150 & (clientID == serverID)))` -
  This filter will show objects with the label "car" mazda "" or objects that have the parked attribute turned on
  and have a width of more than 150 pixels, and those listed should have a height of more than 150 pixels
  and their clientID is equal to serverID.

**Filter history**

![](/images/image175.jpg)

You can add previously entered filters and combine them. To do so, click on the input field and a list of previously
entered filters will open. Click on the filters to add them to the input field.
Combined filters occur with the "or" operator.
