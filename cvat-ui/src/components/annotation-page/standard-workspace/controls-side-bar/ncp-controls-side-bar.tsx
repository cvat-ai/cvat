// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';
import notification from 'antd/lib/notification';
import { useSelector } from 'react-redux';

import {
    ActiveControl, Rotation, CombinedState,
} from 'reducers';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { LabelType, ObjectType } from 'cvat-core-wrapper';

import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import ControlVisibilityObserver, {
    ExtraControlsControl, ContainerHeightContext,
} from './control-visibility-observer';
import ToolsControl from './tools-control';
import OpenCVControl from './opencv-control';
import RabbitControl from './rabbit-control';
import NCPSetupTagControl from './ncp-setup-tag-control';


type Label = CombinedState['annotation']['job']['labels'][0];

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    labels: Label[];
    frameData: any;

    updateActiveControl(activeControl: ActiveControl): void;
    rotateFrame(rotation: Rotation): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
    redrawShape(): void;
}

const componentShortcuts = {
};

registerComponentShortcuts(componentShortcuts);

// We use the observer to see if these controls are in the scopeport
// They automatically put to extra if not
const ObservedToolsControl = ControlVisibilityObserver(ToolsControl, 'ToolsControl');
const ObservedOpenCVControl = ControlVisibilityObserver(OpenCVControl, 'OpenCVControl');
const ObservedRabbitControl = ControlVisibilityObserver(RabbitControl, 'RabbitControl');
const NCPObservedSetupTagControl = ControlVisibilityObserver(NCPSetupTagControl, 'NCPSetupTagControl');


export default function NCPControlsSideBarComponent(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        normalizedKeyMap,
        keyMap,
        labels,
        updateActiveControl,
        rotateFrame,
        repeatDrawShape,
        pasteShape,
        resetGroup,
        redrawShape,
        frameData,
    } = props;

    const controlsDisabled = !labels.length || frameData.deleted;


    // ── First-frame tag check ────────────────────────────────────────────────
    const currentFrame = useSelector(
        (state: CombinedState) => state.annotation.player.frame.number,
    );
    const frameNumbers = useSelector(
        (state: CombinedState) => state.annotation.job.frameNumbers,
    );
    const annotationStates = useSelector(
        (state: CombinedState) => state.annotation.annotations.states,
    );
    const annotationsInitialized = useSelector(
        (state: CombinedState) => state.annotation.annotations.initialized,
    );

    const FIRST_FRAME_TAG_KEY = 'ncp-no-tag-first-frame';

    React.useEffect(() => {
        if (!annotationsInitialized || !frameNumbers?.length) return;

        const firstFrame = frameNumbers[0];

        if (currentFrame === firstFrame) {
            const hasTag = annotationStates.some(
                (s: any) => s.objectType === ObjectType.TAG,
            );
            if (!hasTag) {
                notification.warning({
                    message: 'Missing road matter tag on first frame',
                    description:
                        'This is the first frame of the job and no tag has been set. ' +
                        'Please add a tag annotation before continuing.',
                    duration: 0, // stays open until dismissed
                    key: FIRST_FRAME_TAG_KEY,
                });
            } else {
                notification.destroy(FIRST_FRAME_TAG_KEY);
            }
        } else {
            notification.destroy(FIRST_FRAME_TAG_KEY);
        }
    }, [currentFrame, frameNumbers, annotationStates, annotationsInitialized]);

    // Close notification when the sidebar unmounts
    React.useEffect(() => () => notification.destroy(FIRST_FRAME_TAG_KEY), []);

    // ── Container height tracking ────────────────────────────────────────────
    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerHeightRef = React.useRef<number>(Number.MAX_SAFE_INTEGER);
    const [containerHeight, setContainerHeight] = React.useState(Number.MAX_SAFE_INTEGER);

    React.useEffect(() => {
        const update = (): void => {
            if (containerRef.current) {
                if (containerHeightRef.current !== containerRef.current.offsetHeight) {
                    containerHeightRef.current = containerRef.current.offsetHeight;
                    setContainerHeight(containerRef.current.offsetHeight);
                }
            }
        };

        update();
        if (containerRef.current) {
            const observer = new ResizeObserver(update);
            observer.observe(containerRef.current);
            return () => {
                observer.disconnect();
            };
        }

        return () => {};
    }, []);


    let handlers: Partial<Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void>> = {
    };

    const handleDrawMode = (event: KeyboardEvent | undefined, action: 'draw' | 'redraw'): void => {
        event?.preventDefault();
        const drawing = [
            ActiveControl.DRAW_POINTS,
            ActiveControl.DRAW_POLYGON,
            ActiveControl.DRAW_POLYLINE,
            ActiveControl.DRAW_RECTANGLE,
            ActiveControl.DRAW_CUBOID,
            ActiveControl.DRAW_ELLIPSE,
            ActiveControl.DRAW_SKELETON,
            ActiveControl.DRAW_MASK,
            ActiveControl.AI_TOOLS,
            ActiveControl.OPENCV_TOOLS,
        ].includes(activeControl);
        const editing = canvasInstance.mode() === CanvasMode.EDIT;

        if (!drawing) {
            if (editing) {
                // users probably will press N as they are used to do when they want to finish editing
                // in this case, if a mask or polyline is being edited we probably want to finish editing first
                canvasInstance.edit({ enabled: false });
                return;
            }

            canvasInstance.cancel();
            // repeatDrawShape gets all the latest parameters
            // and calls canvasInstance.draw() with them

            if (action === 'draw') {
                repeatDrawShape();
            } else {
                redrawShape();
            }
        } else {
            if ([ActiveControl.AI_TOOLS, ActiveControl.OPENCV_TOOLS].includes(activeControl)) {
                // separated API method
                canvasInstance.interact({ enabled: false });
                return;
            }

            canvasInstance.draw({ enabled: false });
        }
    };

    if (!controlsDisabled) {
        handlers = {
            ...handlers,
            PASTE_SHAPE: (event: KeyboardEvent | undefined) => {
                event?.preventDefault();
                canvasInstance.cancel();
                pasteShape();
            },
            SWITCH_DRAW_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
                handleDrawMode(event, 'draw');
            },
            SWITCH_REDRAW_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
                handleDrawMode(event, 'redraw');
            },
        };
    }

    return (
        <ContainerHeightContext.Provider value={containerHeight}>
            <Layout.Sider ref={containerRef} className='cvat-canvas-controls-sidebar' theme='light' width={44}>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />

                <ObservedToolsControl />
                <ObservedOpenCVControl />
                <ObservedRabbitControl />
                <NCPObservedSetupTagControl disabled={controlsDisabled} />

            </Layout.Sider>
        </ContainerHeightContext.Provider>
    );
}
