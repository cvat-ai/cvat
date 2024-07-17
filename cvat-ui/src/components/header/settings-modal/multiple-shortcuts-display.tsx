import React, { useRef, useState } from 'react';
import { Select, Modal } from 'antd/lib';
import { conflictDetector } from 'reducers/shortcuts-reducer';
import { ShortcutScope } from 'utils/enums';
import { KeyMapItem } from 'utils/mousetrap-react';

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
