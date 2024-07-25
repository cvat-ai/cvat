import { Select } from 'antd/lib';
import React, { useRef, useState, useEffect } from 'react';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
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
    const { id, item, onKeySequenceUpdate } = props;
    const { sequences } = item;
    const selectRef = useRef<any>(null);
    const [focus, setFocus] = useState(false);
    const [pressedKeys, setPressedKeys] = useState<string[][]>([[]]);
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => () => {
        if (timer) clearTimeout(timer);
    }, [timer]);

    const finalizeCombination = (): void => {
        const keyCombination = pressedKeys.map((keys) => keys.join('+')).join(' ');
        if (!sequences.includes(keyCombination)) {
            onKeySequenceUpdate(id, [...sequences, keyCombination]);
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
                    finalizeCombination();
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
