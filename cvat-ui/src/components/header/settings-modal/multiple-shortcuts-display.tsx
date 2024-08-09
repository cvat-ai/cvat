import React, { useRef, useState, useEffect } from 'react';
import { Select, Modal } from 'antd/lib';
import { conflictDetector } from 'reducers/shortcuts-reducer';
import { ShortcutScope } from 'utils/enums';
import { KeyMapItem } from 'utils/mousetrap-react';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
    keyMap: Record<string, KeyMapItem>
    onKeySequenceUpdate: (keyMapId: string, updatedSequence: string[]) => void;
}

function getKeyfromCode(code: string): string | null {
    const mapping: Record<string, string> = {
        ControlLeft: 'ctrl',
        ControlRight: 'ctrl',
        AltLeft: 'alt',
        AltRight: 'alt',
        ShiftLeft: 'shift',
        ShiftRight: 'shift',
        Space: 'space',
        Escape: 'esc',
        Digit1: '1',
        Digit2: '2',
        Digit3: '3',
        Digit4: '4',
        Digit5: '5',
        Digit6: '6',
        Digit7: '7',
        Digit8: '8',
        Digit9: '9',
        Digit0: '0',
        KeyA: 'a',
        KeyB: 'b',
        KeyC: 'c',
        KeyD: 'd',
        KeyE: 'e',
        KeyF: 'f',
        KeyG: 'g',
        KeyH: 'h',
        KeyI: 'i',
        KeyJ: 'j',
        KeyK: 'k',
        KeyL: 'l',
        KeyM: 'm',
        KeyN: 'n',
        KeyO: 'o',
        KeyP: 'p',
        KeyQ: 'q',
        KeyR: 'r',
        KeyS: 's',
        KeyT: 't',
        KeyU: 'u',
        KeyV: 'v',
        KeyW: 'w',
        KeyX: 'x',
        KeyY: 'y',
        KeyZ: 'z',
        Minus: '-',
        Equal: '=',
        BracketLeft: '[',
        BracketRight: ']',
        Semicolon: ';',
        Quote: "'",
        Backquote: '`',
        Backslash: '\\',
        Comma: ',',
        Period: '.',
        Slash: '/',
        Enter: 'enter',
        Tab: 'tab',
        Backspace: 'backspace',
        Delete: 'delete',
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        PageUp: 'pageup',
        PageDown: 'pagedown',
        Home: 'home',
        End: 'end',
        Insert: 'insert',
        NumpadDivide: '/',
        NumpadMultiply: '*',
        NumpadSubtract: '-',
        NumpadAdd: '+',
        NumpadEnter: 'enter',
        NumpadDecimal: '.',
        Numpad0: '0',
        Numpad1: '1',
        Numpad2: '2',
        Numpad3: '3',
        Numpad4: '4',
        Numpad5: '5',
        Numpad6: '6',
        Numpad7: '7',
        Numpad8: '8',
        Numpad9: '9',
        F1: 'f1',
        F2: 'f2',
        F3: 'f3',
        F4: 'f4',
        F5: 'f5',
        F6: 'f6',
        F7: 'f7',
        F8: 'f8',
        F9: 'f9',
        F10: 'f10',
        F11: 'f11',
        F12: 'f12',
        PrintScreen: 'printscreen',
        ScrollLock: 'scrolllock',
        Pause: 'pause',
        CapsLock: 'capslock',
        NumLock: 'numlock',
    };
    const key = mapping[code];
    if (key === 'numlock' || key === 'scrolllock' || key === 'capslock') {
        return null;
    }
    return key;
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

    function unsetExistingShortcut(conflictingShortcuts: Record<string, KeyMapItem>, updatedSequence: string[]): void {
        const commonSequence = updatedSequence.filter(
            (s) => Object.values(conflictingShortcuts).some((cs) => cs.sequences.includes(s)));
        const updatedShortcuts: Record<string, KeyMapItem> = {};
        for (const [key, value] of Object.entries(conflictingShortcuts)) {
            const newSequences = value.sequences.filter((s) => !commonSequence.includes(s));
            updatedShortcuts[key] = { ...value, sequences: newSequences };
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
                        {Object.values(conflictingShortcuts).map((s, idx) => (
                            <span key={idx}>
                                <strong>{s.name}</strong>
                                <br />
                            </span>
                        ))}
                        in the scope:
                        <br />
                        <strong>
                            {ShortcutScope[
                                Object.values(conflictingShortcuts)[0].scope].split('_').join(' ')}
                        </strong>
                        <br />
                        Do you want to unset the conflicting shortcuts?
                    </p>
                ),
                onOk: () => {
                    onKeySequenceUpdate(keyMapId, updatedSequence);
                    unsetExistingShortcut(conflictingShortcuts, updatedSequence);
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
