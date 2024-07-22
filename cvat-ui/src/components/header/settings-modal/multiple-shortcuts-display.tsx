import { Select } from 'antd/lib';
import React, { useRef, useState, useEffect } from 'react';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
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
        const keyCombination = pressedKeys.map((keys) => keys.map((key) => ShortcutMapper(key)).join('+')).join(' ');
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
            onClear={() => onKeySequenceUpdate(id, [])}
            ref={selectRef}
            searchValue={pressedKeys.map((keys) => keys.map((key) => ShortcutMapper(key)).join('+')).join(' ')}
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
