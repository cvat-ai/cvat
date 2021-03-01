// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { GlobalHotKeys } from 'react-hotkeys';
import './styles.scss';

const LayoutGrid = (): React.ReactPortal => {
    const [showGrid, setShowGrid] = useState(false);

    const keyMap = {
        TOGGLE_LAYOUT_GRID: 'ctrl+alt+enter',
    };

    const toggleLayoutGrid = useCallback((): void => {
        setShowGrid((prevState: boolean) => !prevState);
    }, [showGrid]);

    const handlers = {
        TOGGLE_LAYOUT_GRID: toggleLayoutGrid,
    };

    const portalContent: JSX.Element = (
        <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
            {showGrid && <div className='grid sm' />}
            {showGrid && <div className='grid lg' />}
        </GlobalHotKeys>
    );

    return ReactDOM.createPortal(portalContent, document.getElementById('layout-grid') as HTMLElement);
};

export default LayoutGrid;
