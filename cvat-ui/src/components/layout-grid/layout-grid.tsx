// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles.scss';

export default function LayoutGrid(): React.ReactPortal | null {
    const [showSmGrid, setShowSmGrid] = useState(false);
    const [showLgGrid, setShowLgGrid] = useState(false);

    const listener = (e: KeyboardEvent): void => {
        if (e.key === 'ArrowLeft' && e.altKey) {
            e.preventDefault();
            setShowSmGrid(!showSmGrid);
        }

        if (e.key === 'ArrowRight' && e.altKey) {
            e.preventDefault();
            setShowLgGrid(!showLgGrid);
        }

        if (e.key === 'ArrowUp' && e.altKey) {
            e.preventDefault();
            setShowSmGrid(!(showSmGrid && showLgGrid));
            setShowLgGrid(!(showSmGrid && showLgGrid));
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
