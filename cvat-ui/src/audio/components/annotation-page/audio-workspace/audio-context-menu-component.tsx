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
    interval: AudioIntervalState | null;
    visible: boolean;
    top: number;
    left: number;
    colorBy: ColorBy;
    onCloseContextMenu(): void;
    onCreateURL(): void;
    onCopyInterval(): void;
    onDeleteInterval(): void;
    onChangeIntervalColor(color: string): void;
}

export default function AudioContextMenuComponent(props: Props): JSX.Element | null {
    const {
        interval,
        visible,
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
    const colorPickerPopoverRef = useRef<HTMLElement | null>(null);
    // track local position adjustments e.g. when the menu is outside of the viewport
    const [position, setPosition] = useState({ top, left });
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    useEffect(() => {
        if (!visible) {
            setColorPickerVisible(false);
        }
    }, [visible]);

    useEffect(() => {
        setColorPickerVisible(false);
    }, [interval?.clientID]);

    useLayoutEffect(() => {
        if (!visible || !menuRef.current) {
            setPosition({ top, left });
            return;
        }

        const { innerWidth, innerHeight } = window;
        const { width, height } = menuRef.current.getBoundingClientRect();
        setPosition({
            top: Math.max(0, Math.min(top, innerHeight - height)),
            left: Math.max(0, Math.min(left, innerWidth - width)),
        });
    }, [visible, top, left, interval?.clientID]);

    useEffect(() => {
        if (!visible) return undefined;

        const isEventInsideMenu = (target: EventTarget | null): boolean => {
            if (!(target instanceof Node)) return false;

            return !!(
                menuRef.current?.contains(target) ||
                colorPickerPopoverRef.current?.contains(target)
            );
        };

        const onMouseDown = (event: MouseEvent): void => {
            if (!isEventInsideMenu(event.target)) {
                onCloseContextMenu();
            }
        };
        const onContextMenu = (event: MouseEvent): void => {
            event.preventDefault();
            if (!isEventInsideMenu(event.target)) {
                onCloseContextMenu();
            }
        };

        window.document.addEventListener('mousedown', onMouseDown);
        window.document.addEventListener('contextmenu', onContextMenu);

        return () => {
            window.document.removeEventListener('mousedown', onMouseDown);
            window.document.removeEventListener('contextmenu', onContextMenu);
        };
    }, [visible, onCloseContextMenu]);

    const runAndClose = useCallback((callback: () => void): void => {
        callback();
        onCloseContextMenu();
    }, [onCloseContextMenu]);
    const onColorPickerPopupAlign = useCallback((element: HTMLElement): void => {
        colorPickerPopoverRef.current = element;
    }, []);

    if (!visible || !interval) {
        return null;
    }

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
            className='cvat-audio-context-menu'
            style={{ top: position.top, left: position.left }}
        >
            <Menu {...menu} />
            <ColorPicker
                visible={colorPickerVisible}
                value={interval.color ?? ''}
                placement='rightTop'
                onPopupAlign={onColorPickerPopupAlign}
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
