# Computer Vision Annotation Tool (CVAT) - Bossa Nova Fork

- [Official CVAT Repo](https://github.com/opencv/cvat)
- [CVAT documentation](https://opencv.github.io/cvat/docs)


# Running CVAT in Bossa Nova GCP

- Docker and other pre-reqs come installed in the Compute Engine VMs
- cvat-server and cvat-ui images built from our changes pushed to Container Registry (currently in the cvat-dev-rob project)
- docker-compose.no-infra.yaml uses those images, and doesn't run postgres or redis since we have the managed instances
- Endpoints for managed Postgres and Redis instances need to be configured as environment variables
  - CVAT_REDIS_HOST - url of redis instance
  - CVAT_POSTGRES_HOST - url of postgres instance


A theoretical startup script to run everything:
```
export CVAT_REDIS_HOST=whatever
export CVAT_POSTGRES_HOST=whatever
cd ~
git clone https://github.com/BossaNova/cvat.git
cd cvat
docker-compose -f docker-compose.no-infra.yml up
```

We can docker-compose up/down just the cvat-ui service to deploy new versions

# Changes made to CVAT for Bossa Nova

## UX changes:
  - multiselect
    - select objects by clicking on them instead of auto-selection on mouseover
    - select multiple objects with shift+click
    - select multiple objects with click-drag selection box
    - keyboard shortcuts apply to all selected objects
    - canvas context menu now shows all selected objects
      - added a 'change label' field for changing the label of all selected objects
  - grouped object list
    - object list is grouped by label
    - label-item component re-used as a header for each group of objects
    - label groups can be collapsed
    - expand/collapse all affects the label groups too

## Technical changes to React app

#### redux changes:
- state:
  - state.annotations.activatedStateID (number) changed to activatedStateIDs (number[])
  - added state.annotations.collapsedLabels
  - added state.job.labelShortcuts
  - state.canvas.contextmenu.clientID (number) changed to state.canvas.contextmenu.clientIDs (number[])
- actions:
  - ACTIVATE_OBJECT changed to ACTIVATE_OBJECTS
  - DEACTIVATE_OBJECTS added
  - COLLAPSE_LABEL_GROUPS added
  - COLLAPSE_ALL added
  - UPDATE_LABEL_SHORTCUTS added

#### major component changes:
- label-item
  - converted a functional component
  - label shortcuts are in redux state now instead of local component state to enable the label-item to be re-used in the object list
- object-list
  - displays grouped objects instead of a flat object list

#### canvas changes
- everything is based on multiple activate objects instead of only 1
- added SelectionBoxHandler for selection box behavior, refactored out BoxSelector class to handle drawing boxes in a reusable way