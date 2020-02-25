import React from 'react';

import {
    Layout,
    Slider,
    Icon,
    Tooltip,
} from 'antd';

import { SliderValue } from 'antd/lib//slider';

import {
    ColorBy,
    GridColor,
    ObjectType,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

import getCore from 'cvat-core';

const cvat = getCore();

const MAX_DISTANCE_TO_OPEN_SHAPE = 50;

interface Props {
    sidebarCollapsed: boolean;
    canvasInstance: Canvas;
    jobInstance: any;
    activatedStateID: number | null;
    selectedStatesID: number[];
    annotations: any[];
    frameData: any;
    frame: number;
    opacity: number;
    colorBy: ColorBy;
    selectedOpacity: number;
    blackBorders: boolean;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    activeLabelID: number;
    activeObjectType: ObjectType;
    curZLayer: number;
    minZLayer: number;
    maxZLayer: number;
    onSetupCanvas: () => void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onMergeObjects: (enabled: boolean) => void;
    onGroupObjects: (enabled: boolean) => void;
    onSplitTrack: (enabled: boolean) => void;
    onEditShape: (enabled: boolean) => void;
    onShapeDrawn: () => void;
    onResetCanvas: () => void;
    onUpdateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onSplitAnnotations(sessionInstance: any, frame: number, state: any): void;
    onActivateObject(activatedStateID: number | null): void;
    onSelectObjects(selectedStatesID: number[]): void;
    onUpdateContextMenu(visible: boolean, left: number, top: number): void;
    onAddZLayer(): void;
    onSwitchZLayer(cur: number): void;
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const {
            canvasInstance,
            curZLayer,
        } = this.props;

        // It's awful approach from the point of view React
        // But we do not have another way because cvat-canvas returns regular DOM element
        const [wrapper] = window.document
            .getElementsByClassName('cvat-canvas-container');
        wrapper.appendChild(canvasInstance.html());

        canvasInstance.setZLayer(curZLayer);
        this.initialSetup();
        this.updateCanvas();
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            opacity,
            colorBy,
            selectedOpacity,
            blackBorders,
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            frameData,
            annotations,
            canvasInstance,
            sidebarCollapsed,
            activatedStateID,
            curZLayer,
        } = this.props;

        if (prevProps.sidebarCollapsed !== sidebarCollapsed) {
            const [sidebar] = window.document.getElementsByClassName('cvat-objects-sidebar');
            if (sidebar) {
                sidebar.addEventListener('transitionend', () => {
                    canvasInstance.fitCanvas();
                }, { once: true });
            }
        }

        if (prevProps.grid !== grid) {
            const gridElement = window.document.getElementById('cvat_canvas_grid');
            if (gridElement) {
                gridElement.style.display = grid ? 'block' : 'none';
            }
        }

        if (prevProps.gridSize !== gridSize) {
            canvasInstance.grid(gridSize, gridSize);
        }

        if (prevProps.gridColor !== gridColor) {
            const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
            if (gridPattern) {
                gridPattern.style.stroke = gridColor.toLowerCase();
            }
        }

        if (prevProps.gridOpacity !== gridOpacity) {
            const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
            if (gridPattern) {
                gridPattern.style.opacity = `${gridOpacity / 100}`;
            }
        }

        if (prevProps.activatedStateID !== null
            && prevProps.activatedStateID !== activatedStateID) {
            canvasInstance.activate(null);
            const el = window.document.getElementById(`cvat_canvas_shape_${prevProps.activatedStateID}`);
            if (el) {
                (el as any).instance.fill({ opacity: opacity / 100 });
            }
        }

        if (prevProps.annotations !== annotations || prevProps.frameData !== frameData) {
            this.updateCanvas();
        }

        if (prevProps.opacity !== opacity || prevProps.blackBorders !== blackBorders
            || prevProps.selectedOpacity !== selectedOpacity || prevProps.colorBy !== colorBy) {
            this.updateShapesView();
        }

        if (prevProps.curZLayer !== curZLayer) {
            canvasInstance.setZLayer(curZLayer);
        }

        this.activateOnCanvas();
    }

    public componentWillUnmount(): void {
        window.removeEventListener('resize', this.fitCanvas);
    }

    private onShapeDrawn(event: any): void {
        const {
            jobInstance,
            activeLabelID,
            activeObjectType,
            frame,
            onShapeDrawn,
            onCreateAnnotations,
        } = this.props;

        if (!event.detail.continue) {
            onShapeDrawn();
        }

        const { state } = event.detail;
        if (!state.objectType) {
            state.objectType = activeObjectType;
        }

        if (!state.label) {
            [state.label] = jobInstance.task.labels
                .filter((label: any) => label.id === activeLabelID);
        }

        if (typeof (state.occluded) === 'undefined') {
            state.occluded = false;
        }

        state.frame = frame;
        const objectState = new cvat.classes.ObjectState(state);
        onCreateAnnotations(jobInstance, frame, [objectState]);
    }

    private onShapeEdited(event: any): void {
        const {
            jobInstance,
            frame,
            onEditShape,
            onUpdateAnnotations,
        } = this.props;

        onEditShape(false);

        const {
            state,
            points,
        } = event.detail;
        state.points = points;
        onUpdateAnnotations(jobInstance, frame, [state]);
    }

    private onObjectsMerged(event: any): void {
        const {
            jobInstance,
            frame,
            onMergeAnnotations,
            onMergeObjects,
        } = this.props;

        onMergeObjects(false);

        const { states } = event.detail;
        onMergeAnnotations(jobInstance, frame, states);
    }

    private onObjectsGroupped(event: any): void {
        const {
            jobInstance,
            frame,
            onGroupAnnotations,
            onGroupObjects,
        } = this.props;

        onGroupObjects(false);

        const { states } = event.detail;
        onGroupAnnotations(jobInstance, frame, states);
    }

    private onTrackSplitted(event: any): void {
        const {
            jobInstance,
            frame,
            onSplitAnnotations,
            onSplitTrack,
        } = this.props;

        onSplitTrack(false);

        const { state } = event.detail;
        onSplitAnnotations(jobInstance, frame, state);
    }

    private fitCanvas = (): void => {
        const { canvasInstance } = this.props;
        canvasInstance.fitCanvas();
    };

    private activateOnCanvas(): void {
        const {
            activatedStateID,
            canvasInstance,
            selectedOpacity,
        } = this.props;

        if (activatedStateID !== null) {
            canvasInstance.activate(activatedStateID);
            const el = window.document.getElementById(`cvat_canvas_shape_${activatedStateID}`);
            if (el) {
                (el as any as SVGElement).setAttribute('fill-opacity', `${selectedOpacity / 100}`);
            }
        }
    }

    private updateShapesView(): void {
        const {
            annotations,
            opacity,
            colorBy,
            blackBorders,
        } = this.props;

        for (const state of annotations) {
            let shapeColor = '';
            if (colorBy === ColorBy.INSTANCE) {
                shapeColor = state.color;
            } else if (colorBy === ColorBy.GROUP) {
                shapeColor = state.group.color;
            } else if (colorBy === ColorBy.LABEL) {
                shapeColor = state.label.color;
            }

            // TODO: In this approach CVAT-UI know details of implementations CVAT-CANVAS (svg.js)
            const shapeView = window.document.getElementById(`cvat_canvas_shape_${state.clientID}`);
            if (shapeView) {
                const handler = (shapeView as any).instance.remember('_selectHandler');
                if (handler && handler.nested) {
                    handler.nested.fill({ color: shapeColor });
                }
                (shapeView as any).instance.fill({ color: shapeColor, opacity: opacity / 100 });
                (shapeView as any).instance.stroke({ color: blackBorders ? 'black' : shapeColor });
            }
        }
    }

    private updateCanvas(): void {
        const {
            annotations,
            frameData,
            canvasInstance,
        } = this.props;

        if (frameData !== null) {
            canvasInstance.setup(frameData, annotations);
        }
    }

    private initialSetup(): void {
        const {
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            canvasInstance,
            jobInstance,
            onSetupCanvas,
            onDragCanvas,
            onZoomCanvas,
            onResetCanvas,
            onActivateObject,
            onUpdateContextMenu,
            onEditShape,
        } = this.props;

        // Size
        window.addEventListener('resize', this.fitCanvas);
        this.fitCanvas();

        // Grid
        const gridElement = window.document.getElementById('cvat_canvas_grid');
        const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
        if (gridElement) {
            gridElement.style.display = grid ? 'block' : 'none';
        }
        if (gridPattern) {
            gridPattern.style.stroke = gridColor.toLowerCase();
            gridPattern.style.opacity = `${gridOpacity / 100}`;
        }
        canvasInstance.grid(gridSize, gridSize);

        // Events
        canvasInstance.html().addEventListener('mousedown', (e: MouseEvent): void => {
            const {
                activatedStateID,
            } = this.props;

            if ((e.target as HTMLElement).tagName === 'svg' && activatedStateID !== null) {
                onActivateObject(null);
            }
        });

        canvasInstance.html().addEventListener('contextmenu', (e: MouseEvent): void => {
            const {
                activatedStateID,
            } = this.props;

            onUpdateContextMenu(activatedStateID !== null, e.clientX, e.clientY);
        });

        canvasInstance.html().addEventListener('canvas.editstart', (): void => {
            onActivateObject(null);
            onEditShape(true);
        });

        canvasInstance.html().addEventListener('canvas.setup', (): void => {
            onSetupCanvas();
            this.updateShapesView();
            this.activateOnCanvas();
        });

        canvasInstance.html().addEventListener('canvas.setup', () => {
            canvasInstance.fit();
        }, { once: true });

        canvasInstance.html().addEventListener('canvas.canceled', () => {
            onResetCanvas();
        });

        canvasInstance.html().addEventListener('canvas.dragstart', () => {
            onDragCanvas(true);
        });

        canvasInstance.html().addEventListener('canvas.dragstop', () => {
            onDragCanvas(false);
        });

        canvasInstance.html().addEventListener('canvas.zoomstart', () => {
            onZoomCanvas(true);
        });

        canvasInstance.html().addEventListener('canvas.zoomstop', () => {
            onZoomCanvas(false);
        });

        canvasInstance.html().addEventListener('canvas.clicked', (e: any) => {
            const { clientID } = e.detail.state;
            const sidebarItem = window.document
                .getElementById(`cvat-objects-sidebar-state-item-${clientID}`);
            if (sidebarItem) {
                sidebarItem.scrollIntoView();
            }
        });

        canvasInstance.html().addEventListener('canvas.deactivated', (e: any): void => {
            const { activatedStateID } = this.props;
            const { state } = e.detail;

            // when we activate element, canvas deactivates the previous
            // and triggers this event
            // in this case we do not need to update our state
            if (state.clientID === activatedStateID) {
                onActivateObject(null);
            }
        });

        canvasInstance.html().addEventListener('canvas.moved', async (event: any): Promise<void> => {
            const { activatedStateID } = this.props;
            const result = await jobInstance.annotations.select(
                event.detail.states,
                event.detail.x,
                event.detail.y,
            );

            if (result && result.state) {
                if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
                    if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                        return;
                    }
                }

                if (activatedStateID !== result.state.clientID) {
                    onActivateObject(result.state.clientID);
                }
            }
        });

        canvasInstance.html().addEventListener('canvas.find', async (e: any) => {
            const result = await jobInstance.annotations
                .select(e.detail.states, e.detail.x, e.detail.y);

            if (result && result.state) {
                if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
                    if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                        return;
                    }
                }

                canvasInstance.select(result.state);
            }
        });

        canvasInstance.html().addEventListener('canvas.edited', this.onShapeEdited.bind(this));
        canvasInstance.html().addEventListener('canvas.drawn', this.onShapeDrawn.bind(this));
        canvasInstance.html().addEventListener('canvas.merged', this.onObjectsMerged.bind(this));
        canvasInstance.html().addEventListener('canvas.groupped', this.onObjectsGroupped.bind(this));
        canvasInstance.html().addEventListener('canvas.splitted', this.onTrackSplitted.bind(this));
    }

    public render(): JSX.Element {
        const {
            maxZLayer,
            curZLayer,
            minZLayer,
            onSwitchZLayer,
            onAddZLayer,
        } = this.props;

        return (
            <Layout.Content style={{ position: 'relative' }}>
                {/*
                    This element doesn't have any props
                    So, React isn't going to rerender it
                    And it's a reason why cvat-canvas appended in mount function works
                */}
                <div
                    className='cvat-canvas-container'
                    style={{
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%',
                    }}
                />
                <div className='cvat-canvas-z-axis-wrapper'>
                    <Slider
                        disabled={minZLayer === maxZLayer}
                        min={minZLayer}
                        max={maxZLayer}
                        value={curZLayer}
                        vertical
                        reverse
                        defaultValue={0}
                        onChange={(value: SliderValue): void => onSwitchZLayer(value as number)}
                    />
                    <Tooltip title={`Add new layer ${maxZLayer + 1} and switch to it`}>
                        <Icon type='plus-circle' onClick={onAddZLayer} />
                    </Tooltip>
                </div>
            </Layout.Content>
        );
    }
}
