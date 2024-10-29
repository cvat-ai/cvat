// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import Mousetrap from 'mousetrap';
import { ShortcutScope } from './enums';

export interface KeyMapItem {
    name: string;
    description: string;
    sequences: string[];
    displayedSequences?: string[];
    scope: ShortcutScope;
    nonActive?: boolean;
    applicable?: string[];
    displayWeight?: number;
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
            const { sequences } = keyMap[key];
            const handler = handlers[key];
            Mousetrap.bind(sequences, (event, combo) => {
                event.preventDefault();
                event.stopPropagation();
                if (handler) {
                    handler(event, combo);
                }
            }, 'keydown');
            applicationKeyMap[key] = keyMap[key];
        }

        return () => {
            for (const key of Object.keys(keyMap)) {
                const { sequences } = keyMap[key];
                Mousetrap.unbind(sequences, 'keydown');
                delete applicationKeyMap[key];
            }
        };
    });
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return children || <></>;
}

Mousetrap.prototype.stopCallback = function (e: KeyboardEvent, element: Element, combo: string): boolean {
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
        // stop for input, select, and textarea
        return true;
    }

    const activeSequences = Object.values(applicationKeyMap).map((keyMap) => [...keyMap.sequences]).flat();
    if (activeSequences.some((sequence) => sequence.startsWith(combo))) {
        e?.preventDefault();
    }

    // stop when modals are opened
    const someModalsOpened = Array.from(
        window.document.getElementsByClassName('ant-modal'),
    ).some((el) => (el as HTMLElement).style.display !== 'none');

    if (someModalsOpened) {
        const modalClosingSequences = ['SWITCH_SHORTCUTS', 'SWITCH_SETTINGS']
            .map((key) => [...(applicationKeyMap[key]?.sequences ?? [])]).flat();
        return !modalClosingSequences.includes(combo) && !modalClosingSequences.some((seq) => seq.startsWith(combo));
    }

    return false;
};

export function getApplicationKeyMap(): KeyMap {
    return {
        ...applicationKeyMap,
    };
}
