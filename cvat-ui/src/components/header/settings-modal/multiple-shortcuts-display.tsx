// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useRef, useState, useEffect } from 'react';
import { Select, Modal } from 'antd/lib';
import { conflictDetector, unsetExistingShortcuts } from 'utils/conflict-detector';
import { ShortcutScope } from 'utils/enums';
import { KeyMapItem } from 'utils/mousetrap-react';
import { getKeyfromCode, isModifier } from 'utils/key-code-mapper';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
    keyMap: Record<string, KeyMapItem>
    onKeySequenceUpdate: (shortcutID: string, updatedSequence: string[]) => void;
}

function MultipleShortcutsDisplay(props: Props): JSX.Element {
    const {
        id,
        item,
        keyMap,
        onKeySequenceUpdate,
    } = props;
    const { sequences } = item;
    const selectRef = useRef<React.ElementRef<typeof Select>>(null);
    const [focus, setFocus] = useState(false);
    const [pressedKeys, setPressedKeys] = useState<string[][]>([[]]);
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    const finalizedRef = useRef(false);

    useEffect(() => () => {
        if (timer) clearTimeout(timer);
    }, [timer]);

    function conflictNotifier(shortcutID: string, updatedSequence: string[]): void {
        const shortcut = {
            [shortcutID]: { ...keyMap[shortcutID], sequences: updatedSequence },
        };
        const conflictingShortcuts: Record<string, KeyMapItem> | null = conflictDetector(shortcut, keyMap);
        if (conflictingShortcuts) {
            Modal.confirm({
                title: 'Conflicting shortcuts detected',
                content: (
                    <p>
                        Added sequence conflicts with the following shortcuts:
                        <br />
                        {Object.values(conflictingShortcuts).map((conflictingShortcut: KeyMapItem, idx) => (
                            <span key={`${idx} ${conflictingShortcut.name}`}>
                                <strong>{conflictingShortcut.name}</strong>
                                {' '}
                                in the scope
                                {' '}
                                <strong>
                                    {ShortcutScope[conflictingShortcut.scope].split('_').join(' ')}
                                </strong>
                                <br />
                            </span>
                        ))}
                        Would you like to unset the conflicting shortcuts?
                    </p>
                ),
                onOk: () => {
                    onKeySequenceUpdate(shortcutID, updatedSequence);
                    unsetExistingShortcuts(conflictingShortcuts, updatedSequence, shortcut);
                },
            });
        } else {
            onKeySequenceUpdate(shortcutID, updatedSequence);
        }
    }

    const finalizeCombination = (): void => {
        const containsMoreThanOneNonModifierKey = pressedKeys.flat().filter((key) => !isModifier(key)).length > 1;
        if (containsMoreThanOneNonModifierKey) {
            Modal.error({
                title: 'Invalid key combination',
                content: 'Only one non-modifier key can be used in a combination',
            });
            setPressedKeys([[]]);
            setCurrentIdx(0);
            setTimer(null);
            finalizedRef.current = true;
            selectRef.current?.blur();
            return;
        }
        const keyCombination = pressedKeys.map((keys) => keys.join('+')).join(' ');
        if (!sequences.includes(keyCombination)) {
            conflictNotifier(id, [...sequences, keyCombination]);
        }
        setPressedKeys([[]]);
        setCurrentIdx(0);
        setTimer(null);
        finalizedRef.current = true;
        selectRef.current?.blur();
    };

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        const mappedKey = getKeyfromCode(event.code);
        if (!focus) return;
        if (!mappedKey) return;
        if (timer) {
            clearTimeout(timer);
            setTimer(null);
            const newPressedKeys = [...pressedKeys, [mappedKey]];
            setPressedKeys(newPressedKeys);
            setCurrentIdx(currentIdx + 1);
        } else if (!pressedKeys[currentIdx].includes(mappedKey)) {
            const newPressedKeys = [...pressedKeys];
            newPressedKeys[currentIdx].push(mappedKey);
            setPressedKeys(newPressedKeys);
        }
    };

    const handleKeyUp = (event: React.KeyboardEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        const mappedKey = getKeyfromCode(event.code);
        if (!focus) return;
        if (!mappedKey) return;
        // to allow shortcuts to be added with a gap, comment this line

        finalizeCombination();

        // and uncomment the following lines

        // const newTimer = setTimeout(finalizeCombination, 1000);
        // setTimer(newTimer);
    };

    return (
        <Select
            allowClear
            onFocus={() => setFocus(true)}
            onBlur={() => {
                if (pressedKeys[0].length && !finalizedRef.current) {
                    finalizeCombination();
                }
                finalizedRef.current = false;
                setFocus(false);
                if (timer) {
                    clearTimeout(timer);
                }
            }}
            onClear={() => onKeySequenceUpdate(id, [])}
            ref={selectRef}
            searchValue={pressedKeys.map((keys) => keys.join('+')).join(' ')}
            onChange={(value: string[]) => onKeySequenceUpdate(id, value)}
            suffixIcon={null}
            dropdownStyle={{ display: 'none' }}
            mode='multiple'
            placeholder='Register shortcut...'
            value={sequences}
            className='cvat-shortcuts-settings-select'
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onInputKeyDown={handleKeyDown}
        />
    );
}

export default MultipleShortcutsDisplay;
