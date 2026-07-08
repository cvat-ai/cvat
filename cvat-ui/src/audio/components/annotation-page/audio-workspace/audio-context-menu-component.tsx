// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import ReactDOM from 'react-dom';
import Menu from 'antd/lib/menu';

import { AudioIntervalState } from 'cvat-core-wrapper';
import { ColorBy } from 'reducers';
import ColorPicker from 'components/annotation-page/standard-workspace/objects-side-bar/color-picker';
import AudioRegionItemMenu from './audio-region-item-menu';

interface Props {
    interval: AudioIntervalState;
    top: number;
    left: number;
    colorBy: ColorBy;
    onCloseContextMenu(): void;
    onCreateURL(): void;
    onCopyInterval(): void;
    onDeleteInterval(): void;
    onChangeIntervalColor(color: string): void;
}

export default function AudioContextMenuComponent(props: Props): JSX.Element {
    const {
        interval,
        top,
        left,
        colorBy,
        onCloseContextMenu,
        onCreateURL,
        onCopyInterval,
        onDeleteInterval,
        onChangeIntervalColor,
    } = props;

    const menuRef = useRef<HTMLDivElement>(null);
    // track local position adjustments e.g. when the menu is outside of the viewport
    const [position, setPosition] = useState({ top, left });
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    // closes the color picker if the menu is opened for a different interval
    // although, normally it's fully remounted and initialized anyway
    useEffect(() => {
        setColorPickerVisible(false);
    }, [interval.clientID]);

    // adjusts the position of the context menu to ensure it is fully visible in the viewport
    // effectively does this only once per
    // * interval change
    // * menu position change (if user right clicks on the same interval again)
    // Not handling viewport changes
    // using layout effect so the ref is already available and size can be measured
    // but before the menu is painted to the screen, so it doesn't flicker
    useLayoutEffect(() => {
        if (!menuRef.current) {
            return;
        }

        const { innerWidth, innerHeight } = window;
        const { width, height } = menuRef.current.getBoundingClientRect();
        setPosition({
            top: Math.max(0, Math.min(top, innerHeight - height)),
            left: Math.max(0, Math.min(left, innerWidth - width)),
        });
    }, [top, left, interval.clientID]);

    // closes the context menu on outside click or outside right click
    useEffect(() => {
        const isEventInsideMenu = (target: EventTarget | null): boolean => {
            if (!(target instanceof Node)) return false;

            return !!menuRef.current?.contains(target);
        };

        const onMouseDown = (event: MouseEvent): void => {
            if (!isEventInsideMenu(event.target)) {
                onCloseContextMenu();
            }
        };

        const onContextMenuOpen = (event: MouseEvent): void => {
            event.preventDefault();
            if (!isEventInsideMenu(event.target)) {
                onCloseContextMenu();
            }
        };

        window.document.addEventListener('mousedown', onMouseDown);
        window.document.addEventListener('contextmenu', onContextMenuOpen);

        return () => {
            window.document.removeEventListener('mousedown', onMouseDown);
            window.document.removeEventListener('contextmenu', onContextMenuOpen);
        };
    }, [onCloseContextMenu]);

    const runAndClose = useCallback((callback: () => void): void => {
        callback();
        onCloseContextMenu();
    }, [onCloseContextMenu]);
    const getColorPickerPopupContainer = useCallback((triggerNode: HTMLElement): HTMLElement => (
        menuRef.current ?? triggerNode.parentElement ?? window.document.body
    ), []);

    const serverID = interval.serverID ?? undefined;
    const locked = !!interval.lock;
    const menu = AudioRegionItemMenu({
        serverID,
        locked,
        colorBy,
        onCreateURL: () => runAndClose(onCreateURL),
        onCopy: () => runAndClose(onCopyInterval),
        onRemove: () => runAndClose(onDeleteInterval),
        onChangeColorClick: () => setColorPickerVisible(true),
    });

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className='cvat-audio-context-menu-wrapper'
            style={{ top: position.top, left: position.left }}
        >
            <div className='cvat-audio-context-menu'>
                <Menu {...menu} />
            </div>
            <ColorPicker
                visible={colorPickerVisible}
                value={interval.color ?? ''}
                placement='rightTop'
                getPopupContainer={getColorPickerPopupContainer}
                onVisibleChange={setColorPickerVisible}
                onChange={(color: string) => {
                    onChangeIntervalColor(color);
                    onCloseContextMenu();
                }}
            >
                <span className='cvat-audio-context-menu-color-picker-anchor' />
            </ColorPicker>
        </div>,
        window.document.body,
    );
}
