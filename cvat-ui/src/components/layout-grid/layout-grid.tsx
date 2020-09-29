// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles.scss';

export default function LayoutGrid(): React.ReactPortal | null {
    // 2 states to be able to enable or disable each one separately in future
    const [showSmGrid, setShowSmGrid] = useState(false);
    const [showLgGrid, setShowLgGrid] = useState(false);

    const listener = (e: KeyboardEvent): void => {
        if (e.code === 'Enter' && e.ctrlKey && e.altKey) {
            e.preventDefault();
            setShowSmGrid(!showSmGrid);
            setShowLgGrid(!showLgGrid);
        }
    };

    useEffect(() => {
        window.addEventListener('keyup', listener);
        return () => {
            window.removeEventListener('keyup', listener);
        };
    }, [showSmGrid, showLgGrid]);

    const portalContent: JSX.Element = (
        <>
            {showSmGrid && <div className='grid sm' />}
            {showLgGrid && <div className='grid lg' />}
        </>
    );

    return ReactDOM.createPortal(portalContent, document.getElementById('layout-grid') as HTMLElement);
}
