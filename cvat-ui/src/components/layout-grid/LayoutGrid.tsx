// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles.scss';

export default function LayoutGrid(): React.ReactPortal | null {
    const [showGrid, setShowGrid] = useState(false);

    const listener = (e: KeyboardEvent): void => {
        if (e.key === 'g' && e.ctrlKey) {
            setShowGrid(!showGrid);
        }
    };

    useEffect(() => {
        window.addEventListener('keyup', listener);
        return () => {
            window.removeEventListener('keyup', listener);
        };
    }, [showGrid]);

    const portalContent: JSX.Element | null = showGrid ? <div className='grid' /> : null;
    return ReactDOM.createPortal(portalContent, document.getElementById('layout-grid') as HTMLElement);
}
