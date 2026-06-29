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
import { ShortcutScope } from 'utils/enums';
import ControlVisibilityObserver, {
    ExtraControlsControl, ContainerHeightContext,
} from '../control-visibility-observer';
import OpenCVControl from '../opencv-control';
import RabbitControl from './rabbit-control';
import NCPSetupTagControl from './road-material/ncp-setup-tag-control';


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
    PASTE_SHAPE: {
        name: 'Paste shape',
        description: 'Paste a shape from internal CVAT clipboard',
        sequences: ['ctrl+v'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_DRAW_MODE_STANDARD_CONTROLS: {
        name: 'Draw mode',
        description:
            'Repeat the latest procedure of drawing with the same parameters',
        sequences: ['n'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_REDRAW_MODE_STANDARD_CONTROLS: {
        name: 'Redraw shape',
        description: 'Remove selected shape and redraw it from scratch',
        sequences: ['shift+n'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

// We use the observer to see if these controls are in the scopeport
// They automatically put to extra if not
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

    // ── Selected label (lifted from RabbitControl) ───────────────────────────
    const [selectedLabelID, setSelectedLabelID] = React.useState<number | null>(
        labels.length ? (labels[0].id as number) : null,
    );

    // Keep the selection valid when the label list first loads or changes.
    React.useEffect(() => {
        if (labels.length && selectedLabelID === null) {
            setSelectedLabelID(labels[0].id as number);
        }
    }, [labels, selectedLabelID]);

    // Listen to ncp:select-label events so the selected label is always kept
    // in sync at the sidebar level, regardless of which child dispatches the event.
    React.useEffect(() => {
        const handler = (e: Event): void => {
            const { label: lbl } = (e as CustomEvent).detail;
            if (lbl?.id != null) {
                setSelectedLabelID(lbl.id as number);
            }
        };
        window.addEventListener('ncp:select-label', handler);
        return (): void => window.removeEventListener('ncp:select-label', handler);
    }, []);


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
                <ObservedOpenCVControl />
                <ObservedRabbitControl
                    selectedLabelID={selectedLabelID}
                    setSelectedLabelID={setSelectedLabelID}
                />
                <NCPObservedSetupTagControl disabled={controlsDisabled} />

            </Layout.Sider>
        </ContainerHeightContext.Provider>
    );
}
