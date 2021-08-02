// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Mousetrap from 'mousetrap';

export interface KeyMapItem {
    name: string;
    description: string;
    sequences: string[];
    displayedSequences?: string[];
    action: 'keydown' | 'keyup' | 'keypress';
    applicable: any[];
}

export interface KeyMap {
    [index: string]: KeyMapItem;
}

export interface Handlers {
    [index: string]: (event: KeyboardEvent, shortcut: string) => void;
}

interface Props {
    children?: JSX.Element;
    keyMap: KeyMap;
    handlers: Handlers;
}

const applicationKeyMap: KeyMap = {};

export default function GlobalHotKeys(props: Props): JSX.Element {
    const { children, keyMap, handlers } = props;
    useEffect(() => {
        for (const key of Object.keys(keyMap)) {
            const { sequences, action } = keyMap[key];
            const handler = handlers[key];
            Mousetrap.bind(sequences, handler, action);
            applicationKeyMap[key] = keyMap[key];
        }

        return () => {
            for (const key of Object.keys(keyMap)) {
                const { sequences, action } = keyMap[key];
                Mousetrap.unbind(sequences, action);
                delete applicationKeyMap[key];
            }
        };
    });

    return children || <></>;
}

export function getApplicationKeyMap(): KeyMap {
    return {
        ...applicationKeyMap,
    };
}
