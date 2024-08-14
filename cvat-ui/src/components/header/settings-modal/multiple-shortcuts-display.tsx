import React, { useRef, useState, useEffect } from 'react';
import { Select, Modal } from 'antd/lib';
import { conflict, conflictDetector } from 'utils/conflict-detector';
import { ShortcutScope } from 'utils/enums';
import { KeyMapItem } from 'utils/mousetrap-react';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { getKeyfromCode } from 'utils/key-code-mapper';
import { isEqual } from 'lodash';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
    keyMap: Record<string, KeyMapItem>
    onKeySequenceUpdate: (keyMapId: string, updatedSequence: string[]) => void;
}

function MultipleShortcutsDisplay(props: Props): JSX.Element {
    const {
        id,
        item,
        keyMap,
        onKeySequenceUpdate,
    } = props;
    const { sequences } = item;
    const selectRef = useRef<any>(null);
    const [focus, setFocus] = useState(false);
    const [pressedKeys, setPressedKeys] = useState<string[][]>([[]]);
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => () => {
        if (timer) clearTimeout(timer);
    }, [timer]);

    function unsetExistingShortcut(
        conflictingShortcuts: Record<string, KeyMapItem>,
        updatedSequence: string[],
        shortcut: Record<string, KeyMapItem>): void {
        const updatedShortcuts: Record<string, KeyMapItem> = {};
        for (const [key, value] of Object.entries(conflictingShortcuts)) {
            const currentItem: Record<string, KeyMapItem> = {
                [key]: value,
            };
            if (isEqual(Object.keys(currentItem), Object.keys(shortcut))) {
                const currentSequence = currentItem[Object.keys(shortcut)[0]].sequences;
                const newSequence = updatedSequence.filter((s) => !currentSequence.includes(s))[0];
                updatedShortcuts[key] = {
                    ...value,
                    sequences: [...currentSequence.filter((s) => !conflict(s, newSequence)), newSequence],
                };
            } else {
                const commonSequence = updatedSequence.map((s) => {
                    for (const seq of value.sequences) {
                        if (conflict(seq, s)) {
                            return seq;
                        }
                    }
                    return '';
                });
                const newSequences = value.sequences.filter((s) => !commonSequence.includes(s));
                updatedShortcuts[key] = { ...value, sequences: newSequences };
            }
        }
        registerComponentShortcuts(updatedShortcuts);
    }

    function conflictNotifier(keyMapId: string, updatedSequence: string[]): void {
        const shortcut = {
            [keyMapId]: { ...keyMap[keyMapId], sequences: updatedSequence },
        };
        const conflictingShortcuts: Record<string, KeyMapItem> | null = conflictDetector(shortcut, keyMap);
        if (conflictingShortcuts) {
            Modal.confirm({
                title: 'Shortcut conflict',
                content: (
                    <p>
                        This sequence conflicts with the following shortcuts:
                        <br />
                        <strong>{Object.values(conflictingShortcuts)[0].name}</strong>
                        {' '}
                        in the scope
                        {' '}
                        <strong>
                            {ShortcutScope[
                                Object.values(conflictingShortcuts)[0].scope].split('_').join(' ')}
                        </strong>
                        <br />
                        Would you like to unset the conflicting shortcuts?
                    </p>
                ),
                onOk: () => {
                    onKeySequenceUpdate(keyMapId, updatedSequence);
                    unsetExistingShortcut(conflictingShortcuts, updatedSequence, shortcut);
                },
                onCancel: () => {},
            });
        } else {
            onKeySequenceUpdate(keyMapId, updatedSequence);
        }
    }

    const finalizeCombination = (): void => {
        const keyCombination = pressedKeys.map((keys) => keys.join('+')).join(' ');
        if (!sequences.includes(keyCombination)) {
            conflictNotifier(id, [...sequences, keyCombination]);
        }
        setPressedKeys([[]]);
        setCurrentIdx(0);
        setTimer(null);
        selectRef.current.blur();
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
        const newTimer = setTimeout(finalizeCombination, 1000);
        setTimer(newTimer);
    };

    return (
        <Select
            allowClear
            onFocus={() => setFocus(true)}
            onBlur={() => {
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
