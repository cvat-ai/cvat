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
                    conflictNotifier(id, [...sequences, newKeyCombination]);
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
            onChange={(value: string[]) => conflictNotifier(id, value)}
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
