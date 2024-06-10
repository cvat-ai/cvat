// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSelector } from 'react-redux';

import GlobalHotKeys from 'utils/mousetrap-react';
import { CombinedState } from 'reducers';
import './styles.scss';
import { ViewType } from 'utils/enums';
import { useRegisterShortcuts } from 'utils/hooks';

const componentShortcuts = {
    TOGGLE_LAYOUT_GRID: {
        name: 'Toggle layout grid',
        description: 'The grid is used to UI development',
        sequences: ['ctrl+alt+enter'],
        view: ViewType.ALL,
    },
};

useRegisterShortcuts(componentShortcuts);

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
