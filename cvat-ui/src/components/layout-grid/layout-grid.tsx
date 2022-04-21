// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';

import GlobalHotKeys from 'utils/mousetrap-react';
import { CombinedState } from 'reducers/interfaces';
import './styles.scss';

const LayoutGrid = (): React.ReactPortal => {
    const [showGrid, setShowGrid] = useState(false);
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const subKeyMap = {
        TOGGLE_LAYOUT_GRID: keyMap.TOGGLE_LAYOUT_GRID,
    };

    const toggleLayoutGrid = useCallback((): void => {
        setShowGrid((prevState: boolean) => !prevState);
    }, [showGrid]);

    const handlers = {
        TOGGLE_LAYOUT_GRID: toggleLayoutGrid,
    };

    const portalContent: JSX.Element = (
        <GlobalHotKeys keyMap={subKeyMap} handlers={handlers}>
            <>
                {showGrid && <div className='grid sm' />}
                {showGrid && <div className='grid lg' />}
            </>
        </GlobalHotKeys>
    );

    return ReactDOM.createPortal(portalContent, document.getElementById('layout-grid') as HTMLElement);
};

export default LayoutGrid;
