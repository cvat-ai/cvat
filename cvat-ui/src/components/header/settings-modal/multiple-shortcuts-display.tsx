import { Select } from 'antd/lib';
import React, { useRef, useState } from 'react';

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

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        if (focus) {
            setPressedKeys((prevKeys) => {
                const key = event.key.toLowerCase();
                if (!prevKeys.includes(key)) {
                    return [...prevKeys, key];
                }
                return prevKeys;
            });
        }
    };

    const handleKeyUp = (event: React.KeyboardEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        if (focus) {
            const newKeyCombination = pressedKeys.join('+');
            if (!sequences.includes(newKeyCombination)) {
                onKeySequenceUpdate(id, [...sequences, newKeyCombination]);
            }
            setPressedKeys([]);
            selectRef.current.blur();
        }
    };

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
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onInputKeyDown={handleKeyDown}
        />
    );
}

export default MultipleShortcutsDisplay;
