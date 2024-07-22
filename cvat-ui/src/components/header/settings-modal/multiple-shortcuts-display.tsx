import { Select, Modal } from 'antd/lib';
import React, { useEffect, useRef, useState } from 'react';
import { conflictDetector } from 'reducers/shortcuts-reducer';
import { ShortcutScope } from 'utils/enums';
import { KeyMapItem } from 'utils/mousetrap-react';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
    keyMap: Record<string, KeyMapItem>
    onKeySequenceUpdate: (keyMapId: string, updatedSequence: string[]) => void;
}

const ShortcutMapper = (key: string): string => {
    const mapping: Record<string, string> = {
        control: 'ctrl',
        ' ': 'space',
        escape: 'esc',
    };
    return mapping[key] || key;
};

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

    function conflictNotifier(keyMapId: string, updatedSequence: string[]): void {
        const shortcut = {
            [keyMapId]: { ...keyMap[keyMapId], sequences: updatedSequence },
        };
        const conflictingShortcuts = conflictDetector(shortcut, keyMap);
        if (conflictingShortcuts) {
            Modal.confirm({
                title: 'Shortcut conflict',
                content: (
                    <p>
                        This sequence conflicts with the following shortcuts:
                        <br />
                        {Object.values(conflictingShortcuts).map((s, idx) => (
                            <>
                                <strong key={idx}>{s.name}</strong>
                                <br />
                            </>
                        ))}
                        in the scope:
                        <br />
                        <strong>{ShortcutScope[shortcut[keyMapId].scope]}</strong>
                        <br />
                        Do you want to unset the conflicting shortcuts?
                    </p>
                ),
                onOk: () => {
                    onKeySequenceUpdate(keyMapId, updatedSequence);
                },
                onCancel: () => {},
            });
        } else {
            onKeySequenceUpdate(keyMapId, updatedSequence);
        }
    }

    useEffect(() => () => {
        if (timer) clearTimeout(timer);
    }, [timer]);

    const finalizeCombination = (): void => {
        const keyCombination = pressedKeys.map((keys) => keys.map((key) => ShortcutMapper(key)).join('+')).join(' ');
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
        const key = ShortcutMapper(event.key.toLowerCase());
        if (!focus) return;

        if (timer) {
            clearTimeout(timer);
            setTimer(null);
            const newPressedKeys = [...pressedKeys, [key]];
            setPressedKeys(newPressedKeys);
            setCurrentIdx(currentIdx + 1);
        } else if (!pressedKeys[currentIdx].includes(key)) {
            const newPressedKeys = [...pressedKeys];
            newPressedKeys[currentIdx].push(key);
            setPressedKeys(newPressedKeys);
        }
    };

    const handleKeyUp = (event: React.KeyboardEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        if (focus) {
            const newTimer = setTimeout(finalizeCombination, 1000);
            setTimer(newTimer);
        }
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
            onClear={() => conflictNotifier(id, [])}
            ref={selectRef}
            searchValue={pressedKeys.map((keys) => keys.map((key) => ShortcutMapper(key)).join('+')).join(' ')}
            onChange={(value: string[]) => conflictNotifier(id, value)}
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
