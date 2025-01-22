// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
import GlobalHotKeys, { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import config from 'config';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { isEqual } from 'lodash';
import { CombinedState } from 'reducers';
import { useSelector } from 'react-redux';
import { useResetShortcutsOnUnmount } from 'utils/hooks';

interface InputElementParameters {
    clientID: number;
    attrID: number;
    inputType: string;
    values: string[];
    currentValue: string;
    onChange(value: string): void;
}

const componentShortcuts: Record<string, KeyMapItem> = {};

const makeKey = (index: number) => `AAM_SET_ATTR_VALUE_${index}`;

for (const idx of Array.from({ length: 10 }, (_, i) => i)) {
    componentShortcuts[makeKey(idx)] = {
        name: `Set ${idx + 1} value to the current attribute`,
        description: `Change current value for the attribute to the ${idx + 1} value in the list`,
        sequences: [`${idx}`],
        nonActive: true,
        scope: ShortcutScope.ATTRIBUTE_ANNOTATION_WORKSPACE,
    };
}

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

interface ListProps {
    inputType: string;
    values: string[];
    onChange(value: string): void;
}

function AttrValuesList(props: ListProps): JSX.Element | null {
    const { inputType, values, onChange } = props;

    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);
    const { normalizedKeyMap } = useSelector((state: CombinedState) => state.shortcuts);

    const sortedValues = ['true', 'false'];
    const filteredValues = values.filter((value: string): boolean => value !== config.UNDEFINED_ATTRIBUTE_VALUE);
    const prevValuesRef = useRef<string[] | null>(null);

    useResetShortcutsOnUnmount(componentShortcuts);

    useEffect(() => {
        if (!isEqual(values, prevValuesRef.current)) {
            const updatedComponentShortcuts = Object.keys(componentShortcuts).reduce((acc: KeyMap, key: string) => {
                acc[key] = {
                    ...componentShortcuts[key],
                    sequences: keyMap[key].sequences,
                };
                return acc;
            }, {});

            let valuesWithShortcuts = sortedValues;
            if (inputType === 'checkbox' && values[0].toLowerCase() !== 'true') {
                valuesWithShortcuts = [...sortedValues].reverse();
            } else if (inputType === 'radio' || inputType === 'select') {
                valuesWithShortcuts = filteredValues.slice(0, 10);
            }

            valuesWithShortcuts.forEach((value: string, index: number): void => {
                const key = makeKey(index);
                updatedComponentShortcuts[key] = {
                    ...updatedComponentShortcuts[key],
                    nonActive: false,
                    name: `Assign attribute value ${value}`,
                    description: `Change current value for the attribute to ${value}`,
                };
            });

            registerComponentShortcuts({ ...updatedComponentShortcuts });
            prevValuesRef.current = values;
        }
    }, [values]);

    if (inputType === 'checkbox') {
        const handlers: {
            [key: string]: (keyEvent?: KeyboardEvent) => void;
        } = {};

        sortedValues.forEach((value: string, index: number): void => {
            const key = makeKey(index);
            handlers[key] = (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }

                onChange(value);
            };
        });

        const key0 = makeKey(0);
        const key1 = makeKey(1);
        return (
            <div className='attribute-annotation-sidebar-attr-list-wrapper'>
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                {keyMap[key0]?.sequences?.length > 0 && (
                    <div>
                        <Text strong>{`${normalizedKeyMap[key0]}: `}</Text>
                        <Text>{` ${sortedValues[0]}`}</Text>
                    </div>
                )}
                {keyMap[key1]?.sequences?.length > 0 && (
                    <div>
                        <Text strong>{`${normalizedKeyMap[key1]}: `}</Text>
                        <Text>{` ${sortedValues[1]}`}</Text>
                    </div>
                )}
            </div>
        );
    }

    if (inputType === 'radio' || inputType === 'select') {
        const handlers: {
            [key: string]: (keyEvent?: KeyboardEvent) => void;
        } = {};

        filteredValues.slice(0, 10).forEach((value: string, index: number): void => {
            const key = makeKey(index);
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
                    (value: string, index: number): JSX.Element | null => {
                        const key = makeKey(index);
                        if (keyMap[key]?.sequences?.length) {
                            return (
                                <div key={value}>
                                    <Text strong>{`${normalizedKeyMap[key]}: `}</Text>
                                    <Text>{` ${value}`}</Text>
                                </div>
                            );
                        }

                        return null;
                    },
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
    const { inputType, values, id: attrID } = attribute;

    return (
        <div className='attribute-annotations-sidebar-attribute-editor'>
            <AttrValuesList values={values} inputType={inputType} onChange={onChange} />
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
