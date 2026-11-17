// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import {
    ColorPicker, Form, Input, Modal,
} from 'antd/lib';
import Alert from 'antd/lib/alert';
import Text from 'antd/lib/typography/Text';

import { getShortcutCombination } from './phase-shortcuts';

interface Props {
    trackName?: string;
    initialColor: string;
    slot: number | null;
    defaultKey: string | undefined;
    initialKeys: string[];
    onCancel(): void;
    onSave(name: string, color: string, shortcut: string[] | undefined): Promise<void>;
}

export default function ActionTrackDialog(props: Props): JSX.Element {
    const {
        trackName, initialColor, slot, defaultKey, initialKeys, onCancel, onSave,
    } = props;
    const [form] = Form.useForm<{ name: string }>();
    const [color, setColor] = useState(initialColor);
    const [keyOverride, setKeyOverride] = useState<string[]>();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function submit(): Promise<void> {
        setSaving(true);
        setError('');
        try {
            const name = trackName ?? (await form.validateFields()).name.trim();
            await onSave(name, color, keyOverride);
            onCancel();
        } catch (reason) {
            if (reason instanceof Error) setError(reason.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open
            title={trackName ? `Shortcut for ${trackName}` : 'Add action track'}
            okText={trackName ? 'Save' : 'Add track'}
            confirmLoading={saving}
            onCancel={saving ? undefined : onCancel}
            onOk={submit}
        >
            <Form form={form} layout='vertical' onFinish={submit}>
                {!trackName && (
                    <>
                        <Form.Item
                            label='Name'
                            name='name'
                            rules={[{ required: true, whitespace: true, message: 'Enter an action name' }]}
                        >
                            <Input autoFocus maxLength={64} />
                        </Form.Item>
                        <Form.Item label='Color'>
                            <ColorPicker
                                aria-label='Action color'
                                disabledAlpha
                                value={color}
                                onChange={(value) => setColor(value.toHexString())}
                            />
                        </Form.Item>
                    </>
                )}
                {slot !== null && (
                    <Form.Item
                        label='Recording shortcut'
                        extra={(
                            <Text type='secondary'>
                                {`Default for track ${slot + 1}: ${defaultKey} on the keyboard or numpad. ` +
                                    'Press a key to change it for this track number across jobs.'}
                            </Text>
                        )}
                    >
                        <Input
                            aria-label='Recording shortcut'
                            value={(keyOverride ?? initialKeys).join(', ')}
                            placeholder='Press a key or combination'
                            readOnly
                            onKeyDown={(event) => {
                                const combination = getShortcutCombination(event.nativeEvent);
                                if (!combination || event.key === 'Tab' || event.key === 'Escape') return;
                                event.preventDefault();
                                setKeyOverride([combination]);
                                setError('');
                            }}
                        />
                    </Form.Item>
                )}
                {error && <Alert type='error' message={error} showIcon />}
            </Form>
        </Modal>
    );
}
