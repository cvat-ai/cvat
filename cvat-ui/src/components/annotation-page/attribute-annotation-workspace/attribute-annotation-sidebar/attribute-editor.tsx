// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useRef, useEffect } from 'react';
import Text from 'antd/lib/typography/Text';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Select, { SelectValue } from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Input from 'antd/lib/input';
import { TextAreaRef } from 'antd/lib/input/TextArea';
import InputNumber from 'antd/lib/input-number';
import GlobalHotKeys from 'utils/mousetrap-react';
import config from 'config';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { CombinedState, ShortcutsState } from 'reducers';
import { useSelector } from 'react-redux';

interface InputElementParameters {
    clientID: number;
    attrID: number;
    inputType: string;
    values: string[];
    currentValue: string;
    onChange(value: string): void;
}

const componentShortcuts = {
    SET_0_VALUE: {
        name: 'Set 1st value to the current attribute',
        description: 'Change current value for the attribute to the 1th value in the list',
        sequences: ['0'],
        scope: ShortcutScope.ALL,
    },
    SET_1_VALUE: {
        name: 'Set 2nd value to the current attribute',
        description: 'Change current value for the attribute to the 2nd value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['1'],
    },
    SET_2_VALUE: {
        name: 'Set 3rd value to the current attribute',
        description: 'Change current value for the attribute to the 3rd value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['2'],
    },
    SET_3_VALUE: {
        name: 'Set 4th value to the current attribute',
        description: 'Change current value for the attribute to the 4th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['3'],
    },
    SET_4_VALUE: {
        name: 'Set 5th value to the current attribute',
        description: 'Change current value for the attribute to the 5th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['4'],
    },
    SET_5_VALUE: {
        name: 'Set 6th value to the current attribute',
        description: 'Change current value for the attribute to the 6th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['5'],
    },
    SET_6_VALUE: {
        name: 'Set 7th value to the current attribute',
        description: 'Change current value for the attribute to the 7th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['6'],
    },
    SET_7_VALUE: {
        name: 'Set 8th value to the current attribute',
        description: 'Change current value for the attribute to the 8th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['7'],
    },
    SET_8_VALUE: {
        name: 'Set 9th value to the current attribute',
        description: 'Change current value for the attribute to the 9th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['8'],
    },
    SET_10_VALUE: {
        name: 'Set 10th value to the current attribute',
        description: 'Change current value for the attribute to the 10th value in the list',
        scope: ShortcutScope.ALL,
        sequences: ['9'],
    },
};

registerComponentShortcuts(componentShortcuts);

function renderInputElement(parameters: InputElementParameters): JSX.Element {
    const {
        inputType, attrID, clientID, values, currentValue, onChange,
    } = parameters;

    const ref = useRef<TextAreaRef>(null);
    const [selectionStart, setSelectionStart] = useState<number>(currentValue.length);
    const [localAttrValue, setAttributeValue] = useState(currentValue);

    useEffect(() => {
        const textArea = ref?.current?.resizableTextArea?.textArea;
        if (textArea instanceof HTMLTextAreaElement) {
            textArea.selectionStart = selectionStart;
            textArea.selectionEnd = selectionStart;
        }
    }, [currentValue]);

    useEffect(() => {
        // attribute value updated from inside the app (for example undo/redo)
        if (currentValue !== localAttrValue) {
            setAttributeValue(currentValue);
        }
    }, [currentValue]);

    useEffect(() => {
        // wrap to internal use effect to avoid issues
        // with chinese keyboard
        if (localAttrValue !== currentValue) {
            onChange(localAttrValue);
        }
    }, [localAttrValue]);

    const renderCheckbox = (): JSX.Element => (
        <>
            <Text strong>Checkbox: </Text>
            <div className='attribute-annotation-sidebar-attr-elem-wrapper'>
                <Checkbox
                    onChange={(event: CheckboxChangeEvent): void => setAttributeValue(event.target.checked ? 'true' : 'false')}
                    checked={localAttrValue === 'true'}
                />
            </div>
        </>
    );

    const renderSelect = (): JSX.Element => (
        <>
            <Text strong>Values: </Text>
            <div className='attribute-annotation-sidebar-attr-elem-wrapper'>
                <Select
                    value={localAttrValue}
                    style={{ width: '80%' }}
                    onChange={(value: SelectValue) => setAttributeValue(value as string)}
                >
                    {values.map(
                        (value: string): JSX.Element => (
                            <Select.Option key={value} value={value}>
                                {value === config.UNDEFINED_ATTRIBUTE_VALUE ? config.NO_BREAK_SPACE : value}
                            </Select.Option>
                        ),
                    )}
                </Select>
            </div>
        </>
    );

    const renderRadio = (): JSX.Element => (
        <>
            <Text strong>Values: </Text>
            <div className='attribute-annotation-sidebar-attr-elem-wrapper'>
                <Radio.Group
                    value={localAttrValue}
                    onChange={(event: RadioChangeEvent) => setAttributeValue(event.target.value)}
                >
                    {values.map(
                        (value: string): JSX.Element => (
                            <Radio style={{ display: 'block' }} key={value} value={value}>
                                {value === config.UNDEFINED_ATTRIBUTE_VALUE ? config.NO_BREAK_SPACE : value}
                            </Radio>
                        ),
                    )}
                </Radio.Group>
            </div>
        </>
    );

    const handleKeydown = (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Tab', 'Shift', 'Control'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            const copyEvent = new KeyboardEvent('keydown', event.nativeEvent);
            window.document.dispatchEvent(copyEvent);
        }
    };

    const renderNumber = (): JSX.Element => {
        const [min, max, step] = values;
        return (
            <>
                <Text strong>Number: </Text>
                <div className='attribute-annotation-sidebar-attr-elem-wrapper'>
                    <InputNumber
                        autoFocus
                        min={+min}
                        max={+max}
                        step={+step}
                        value={+localAttrValue}
                        key={`${clientID}:${attrID}`}
                        onChange={(value: number | null) => {
                            if (typeof value === 'number') {
                                setAttributeValue(`${value}`);
                            }
                        }}
                        onKeyDown={handleKeydown}
                    />
                </div>
            </>
        );
    };

    const renderText = (): JSX.Element => (
        <>
            <Text strong>Text: </Text>
            <div className='attribute-annotation-sidebar-attr-elem-wrapper'>
                <Input.TextArea
                    autoFocus
                    ref={ref}
                    key={`${clientID}:${attrID}`}
                    value={localAttrValue}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const { value } = event.target;
                        if (ref.current?.resizableTextArea?.textArea) {
                            setSelectionStart(ref.current.resizableTextArea.textArea.selectionStart);
                        }
                        setAttributeValue(value);
                    }}
                    onKeyDown={handleKeydown}
                />
            </div>
        </>
    );

    let element = null;
    if (inputType === 'checkbox') {
        element = renderCheckbox();
    } else if (inputType === 'select') {
        element = renderSelect();
    } else if (inputType === 'radio') {
        element = renderRadio();
    } else if (inputType === 'number') {
        element = renderNumber();
    } else {
        element = renderText();
    }

    return <div className='cvat-attribute-annotation-sidebar-attr-editor'>{element}</div>;
}

interface ListParameters {
    inputType: string;
    values: string[];
    onChange(value: string): void;
}

function renderList(parameters: ListParameters, keyMap: ShortcutsState['keyMap']): JSX.Element | null {
    const { inputType, values, onChange } = parameters;
    if (inputType === 'checkbox') {
        const sortedValues = ['true', 'false'];
        if (values[0].toLowerCase() !== 'true') {
            sortedValues.reverse();
        }

        const handlers: {
            [key: string]: (keyEvent?: KeyboardEvent) => void;
        } = {};

        sortedValues.forEach((value: string, index: number): void => {
            const key = `SET_${index}_VALUE`;
            handlers[key] = (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }

                onChange(value);
            };
        });

        return (
            <div className='attribute-annotation-sidebar-attr-list-wrapper'>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                <div>
                    <Text strong>0:</Text>
                    <Text>{` ${sortedValues[0]}`}</Text>
                </div>
                <div>
                    <Text strong>1:</Text>
                    <Text>{` ${sortedValues[1]}`}</Text>
                </div>
            </div>
        );
    }

    if (inputType === 'radio' || inputType === 'select') {
        const handlers: {
            [key: string]: (keyEvent?: KeyboardEvent) => void;
        } = {};

        const filteredValues = values.filter((value: string): boolean => value !== config.UNDEFINED_ATTRIBUTE_VALUE);
        filteredValues.slice(0, 10).forEach((value: string, index: number): void => {
            const key = `SET_${index}_VALUE`;
            handlers[key] = (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }

                onChange(value);
            };
        });

        return (
            <div className='attribute-annotation-sidebar-attr-list-wrapper'>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                {filteredValues.map(
                    (value: string, index: number): JSX.Element => (
                        <div key={value}>
                            <Text strong>{`${index}:`}</Text>
                            <Text>{` ${value}`}</Text>
                        </div>
                    ),
                )}
            </div>
        );
    }

    if (inputType === 'number') {
        return (
            <div className='attribute-annotation-sidebar-attr-list-wrapper'>
                <div>
                    <Text strong>From:</Text>
                    <Text>{` ${values[0]}`}</Text>
                </div>
                <div>
                    <Text strong>To:</Text>
                    <Text>{` ${values[1]}`}</Text>
                </div>
                <div>
                    <Text strong>Step:</Text>
                    <Text>{` ${values[2]}`}</Text>
                </div>
            </div>
        );
    }

    return null;
}

interface Props {
    clientID: number;
    attribute: any;
    currentValue: string;
    onChange(value: string): void;
}

function AttributeEditor(props: Props): JSX.Element {
    const {
        attribute, currentValue, onChange, clientID,
    } = props;

    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    const { inputType, values, id: attrID } = attribute;

    return (
        <div className='attribute-annotations-sidebar-attribute-editor'>
            {renderList({ values, inputType, onChange }, keyMap)}
            <hr />
            {renderInputElement({
                clientID,
                attrID,
                inputType,
                currentValue,
                values,
                onChange,
            })}
        </div>
    );
}

export default React.memo(AttributeEditor);
