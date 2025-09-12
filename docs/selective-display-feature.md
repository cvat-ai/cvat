# Selective Display Feature

## Overview

The Selective Display feature allows users to control which object details are displayed in the annotation workspace. Users can choose to show details only for specific labels and their associated attributes, helping to reduce visual clutter and focus on relevant information during annotation tasks.

## How to Use

### Enabling Selective Display

1. Open the **Settings** menu (gear icon in the header)
2. Navigate to the **Workspace** tab
3. Find the **Selective Display** section
4. Check **"Enable selective object details display"**

### Configuring Label Selection

Once selective display is enabled:

1. A **"Select labels to show"** dropdown will appear
2. Use this multi-select dropdown to choose which labels should have their details displayed
3. Only objects with the selected labels will show their details in both canvas text and sidebar

### Configuring Attribute Selection

For each selected label:

1. An **"Attributes for [Label Name]"** dropdown will appear
2. Use this multi-select dropdown to choose which attributes should be displayed for that specific label
3. Only the selected attributes will be shown in object details

## Behavior

### Canvas Text Display
- When selective display is enabled, only objects from selected labels will show text on the canvas
- Only the selected attributes for each label will be included in the canvas text
- The feature works independently of the "Always show object details" setting

### Sidebar Object Details
- Object details in the sidebar will only show attributes that are selected in the selective display settings
- Non-selected attributes will be hidden from the object details panel

### Real-time Updates
- Changes to selective display settings are applied immediately
- No workspace reload is required
- Settings persist across browser sessions

## Use Cases

### Complex Projects with Many Labels
In projects with numerous label types, you can focus on specific categories:
- Select only "Person" and "Vehicle" labels when reviewing traffic scenes
- Hide irrelevant labels like "Background" or "Noise"

### Attribute-heavy Workflows
For objects with many attributes, you can show only relevant ones:
- Show only "Color" and "Size" attributes while hiding "Timestamp" or "Source"
- Focus on quality-related attributes during review tasks

### Quality Assurance
During QA reviews, focus on specific aspects:
- Show only attributes that need verification
- Hide automatically generated attributes that don't require review

## Technical Details

### Settings Storage
- Selective display settings are stored in the user's workspace preferences
- Settings are preserved across browser sessions and workspace reloads

### Performance
- The feature is optimized for real-time updates
- Changes to settings trigger immediate re-rendering of affected elements
- No impact on annotation performance or data loading

### Compatibility
- Works with all annotation types (bounding boxes, polygons, keypoints, etc.)
- Compatible with all workspace modes (standard, review, etc.)
- Integrates seamlessly with existing "Always show object details" functionality

## Limitations

- Selective display only affects the visual presentation of object details
- It does not filter the actual annotation data or affect export functionality
- All attributes remain accessible through the object properties panel regardless of selective display settings