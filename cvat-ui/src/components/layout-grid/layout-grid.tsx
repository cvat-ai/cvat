// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';

import GlobalHotKeys from 'utils/mousetrap-react';
import { CombinedState } from 'reducers';
import './styles.scss';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';

const componentShortcuts = {
    TOGGLE_ANNOTATION_PAGE: {
        name: 'Toggle layout grid',
        description: 'The grid is used to UI development',
        sequences: ['ctrl+alt+enter'],
        scope: ShortcutScope.GENERAL,
    },
};

registerComponentShortcuts(componentShortcuts);

const LayoutGrid = (): React.ReactPortal => {
    const [showGrid, setShowGrid] = useState(false);
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const toggleLayoutGrid = useCallback((): void => {
        setShowGrid((prevState: boolean) => !prevState);
    }, [showGrid]);

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        TOGGLE_ANNOTATION_PAGE: toggleLayoutGrid,
    };

    const portalContent: JSX.Element = (
        <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers}>
            <>
                {showGrid && <div className='grid sm' />}
                {showGrid && <div className='grid lg' />}
            </>
        </GlobalHotKeys>
    );

    return ReactDOM.createPortal(portalContent, document.getElementById('layout-grid') as HTMLElement);
};

export default LayoutGrid;
