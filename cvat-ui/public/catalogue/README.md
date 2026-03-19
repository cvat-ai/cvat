# Catalogue Reference Attributes

This directory contains catalogue JSON files for use with catalogue reference attributes in CVAT.

## Overview

Catalogue reference attributes allow users to select attribute values from a predefined catalogue via an interactive modal dialog, rather than typing text manually. This is particularly useful for standardized references like road signs, product codes, or any other categorized items.

## How It Works

### 1. Attribute Naming Convention

To enable catalogue reference behavior, name your text attribute with the prefix `catalogue_ref__` followed by the catalogue name:

```
catalogue_ref__<catalogue_name>
```

**Example:** An attribute named `catalogue_ref__road_signs` will automatically:
- Display a special input field with a book icon
- Open a modal when clicked
- Load data from `/catalogue/road_signs.json`

### 2. Catalogue JSON Structure

Each catalogue JSON file should be an array of objects with the following structure:

```json
[
  {
    "reference": "UNIQUE-ID",
    "iconPath": "/catalogue/icons/icon_name.png",
    "description": "Human-readable description",
    "confidence": 0.95
  }
]
```

**Fields:**
- `reference` (string, required): Unique identifier that will be stored as the attribute value
- `iconPath` (string, required): Path to an icon image (can use Ant Design icon mapping)
- `description` (string, required): Human-readable description of the item
- `confidence` (number, required): Confidence score between 0 and 1

### 3. Creating a New Catalogue

**Step 1:** Create a JSON file in this directory

```bash
# Example: creating a product catalogue
touch cvat-ui/public/catalogue/products.json
```

**Step 2:** Add your catalogue data

```json
[
  {
    "reference": "PROD-001",
    "iconPath": "/catalogue/icons/product1.png",
    "description": "Product Name - Brief description",
    "confidence": 0.92
  },
  {
    "reference": "PROD-002",
    "iconPath": "/catalogue/icons/product2.png",
    "description": "Another Product - Brief description",
    "confidence": 0.88
  }
]
```

**Step 3:** Create a label with a text attribute named `catalogue_ref__products`

**Step 4:** When annotating, click the attribute field to open the catalogue modal

## Modal Features

The catalogue reference modal provides:

### Grid View
- Visual card-based layout
- Icons, references, descriptions, and confidence badges
- Click to select, double-click to select and close
- Hover effects and selection highlighting

### Table View
- Compact tabular layout
- Sortable columns (Reference, Description, Confidence)
- Click to select, double-click to select and close
- Pagination controls

### Search & Filter
- Real-time search across references and descriptions
- Case-insensitive filtering
- Results update as you type

### View Toggle
- Switch between Grid and Table views
- Preference persists during session
- Use the view that works best for your data

## Example: Road Signs Catalogue

The included `road_signs.json` demonstrates a complete catalogue implementation:

```json
[
  {
    "reference": "RS-001",
    "iconPath": "/catalogue/icons/stop_sign.png",
    "description": "Stop Sign - Octagonal red sign requiring complete vehicle stop",
    "confidence": 0.95
  },
  {
    "reference": "RS-002",
    "iconPath": "/catalogue/icons/yield_sign.png",
    "description": "Yield Sign - Triangular sign indicating right of way",
    "confidence": 0.88
  }
  // ... more items
]
```

### Testing the Road Signs Example

1. Create a new label in CVAT
2. Add a text attribute named: `catalogue_ref__road_signs`
3. Create an annotation with this label
4. In the objects sidebar, click on the `catalogue_ref__road_signs` attribute
5. The modal will open showing 8 road sign options
6. Toggle between Grid and Table views
7. Search for "speed" to filter results
8. Select a sign and click "Select" (or double-click an item)
9. The attribute value will be set to the reference (e.g., "RS-003")

## Icon Handling

For this demo implementation, icons are mapped to Ant Design icons in the modal component. In a production environment, you can:

1. Add actual image files to `cvat-ui/public/catalogue/icons/`
2. Update the modal to load real images instead of using the icon map
3. Use external URLs for icon paths

## Best Practices

1. **Unique References**: Ensure all reference IDs are unique within a catalogue
2. **Clear Descriptions**: Write descriptive text that helps users identify items
3. **Confidence Scores**: Use meaningful confidence values (0.0 to 1.0)
4. **Catalogue Size**: Keep catalogues focused; split large datasets into multiple catalogues
5. **File Names**: Use lowercase, alphanumeric characters and underscores in catalogue filenames

## Troubleshooting

**Modal doesn't open:**
- Check that the attribute name starts with `catalogue_ref__`
- Ensure you're not in read-only mode

**Catalogue not loading:**
- Verify the JSON file exists in `cvat-ui/public/catalogue/`
- Check that the filename matches the attribute name (without the `catalogue_ref__` prefix)
- Validate JSON syntax using a JSON validator

**No items showing:**
- Check browser console for errors
- Verify JSON structure matches the expected format
- Ensure the JSON array is not empty

## Technical Details

**Files Modified/Created:**
- `cvat-ui/src/components/annotation-page/standard-workspace/objects-side-bar/catalogue-reference-modal.tsx` - Modal component
- `cvat-ui/src/components/annotation-page/standard-workspace/objects-side-bar/catalogue-reference-modal.scss` - Modal styles
- `cvat-ui/src/components/annotation-page/standard-workspace/objects-side-bar/object-item-attribute.tsx` - Modified to detect and handle catalogue references

**Attribute Storage:**
Only the `reference` value is stored as the attribute value, making it compact and efficient for export and API operations.

## Future Enhancements

Potential improvements for production use:

1. Backend API integration for dynamic catalogues
2. Image upload and management for catalogue icons
3. Catalogue versioning and updates
4. Multi-language support for descriptions
5. Advanced filtering (by confidence threshold, categories, etc.)
6. Recent selections history
7. Favorites/bookmarks within catalogues
8. Bulk import/export of catalogues

---

For more information about CVAT attributes, see the [CVAT documentation](https://opencv.github.io/cvat/docs/).
