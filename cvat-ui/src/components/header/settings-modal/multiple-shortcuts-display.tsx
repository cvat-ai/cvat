import { Select } from 'antd/lib';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
    id: string;
    item: { sequences: string[]; name: string; description: string; scope: string };
    onKeySequenceUpdate: (keyMapId: string, updatedSequence: string[]) => void;
}

function MultipleShortcutsDisplay(props: Props): JSX.Element {
    const { id, item, onKeySequenceUpdate } = props;
    const { sequences } = item;
    const selectRef = useRef<any>(null);
    const [focus, setFocus] = useState(false);
    const [pressedKeys, setPressedKeys] = useState<string[]>([]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (focus) {
                event.preventDefault();
                setPressedKeys((prevKeys) => {
                    if (!prevKeys.includes(event.key)) {
                        return [...prevKeys, (event.key).toLowerCase()];
                    }
                    return prevKeys;
                });
            }
        };

        const handleKeyUp = (event: KeyboardEvent): void => {
            if (focus) {
                event.preventDefault();
                const newKeyCombination = pressedKeys.join('+');
                if (!sequences.includes(newKeyCombination)) {
                    onKeySequenceUpdate(id, [...sequences, newKeyCombination]);
                }
                setPressedKeys([]);
                selectRef.current.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [focus, pressedKeys]);

    return (
        <Select
            allowClear
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onClear={() => onKeySequenceUpdate(id, [])}
            ref={selectRef}
            searchValue=''
            onChange={(value: string[]) => onKeySequenceUpdate(id, value)}
            suffixIcon={null}
            dropdownStyle={{ display: 'none' }}
            mode='multiple'
            placeholder='Register shortcut...'
            value={sequences}
            className='cvat-shortcuts-settings-select'
        />
    );
}

export default MultipleShortcutsDisplay;
