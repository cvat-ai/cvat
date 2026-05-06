import React, { useState } from 'react';
import Icon from '@ant-design/icons';
import { AudioRecordRegionIcon } from 'icons';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { ActiveControl, CombinedState } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import LabelSelector from 'components/label-selector/label-selector';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    activeControl: ActiveControl;
    recordRegionShortkey: string;
    labels: Label[];
    activeLabelId: number | null;
    updateActiveControl(activeControl: ActiveControl): void;
    onSetActiveLabel(labelId: number | null): void;
}

const componentShortcuts = {
    RECORD_AUDIO_REGION: {
        name: 'Record audio interval',
        description: (
            'Toggle live audio interval recording. ' +
            'First press marks the interval start at the current playback position; ' +
            'pressing again or pausing finalizes the end.'
        ),
        sequences: ['shift+n'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function RecordRegionControl(props: Props): JSX.Element {
    const {
        activeControl, recordRegionShortkey, labels, activeLabelId,
        updateActiveControl, onSetActiveLabel,
    } = props;
    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedLabelId, setSelectedLabelId] = useState<number | null>(
        activeLabelId ?? (labels.length ? labels[0].id ?? null : null),
    );

    const isActive = activeControl === ActiveControl.AUDIO_REGION_RECORD;
    const noLabels = labels.length === 0;

    const startRecording = (): void => {
        if (noLabels) return;
        if (selectedLabelId !== null) {
            onSetActiveLabel(selectedLabelId);
        }
        updateActiveControl(ActiveControl.AUDIO_REGION_RECORD);
        setPopoverOpen(false);
    };

    const handler = (): void => {
        if (noLabels) return;
        if (isActive) {
            updateActiveControl(ActiveControl.CURSOR);
            setPopoverOpen(false);
            return;
        }
        if (popoverOpen) {
            setPopoverOpen(false);
        } else {
            setPopoverOpen(true);
        }
    };

    // Hotkey skips the popover and uses the last-selected label, mirroring
    // the create-interval shortcut. Falls back to the popup only when there
    // is no label to pre-select.
    const hotkeyHandler = (): void => {
        if (noLabels) return;
        if (isActive) {
            updateActiveControl(ActiveControl.CURSOR);
            return;
        }
        const labelId = selectedLabelId ?? activeLabelId ?? labels[0]?.id ?? null;
        if (labelId === null) {
            setPopoverOpen(true);
            return;
        }
        onSetActiveLabel(labelId);
        setSelectedLabelId(labelId);
        updateActiveControl(ActiveControl.AUDIO_REGION_RECORD);
        setPopoverOpen(false);
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        RECORD_AUDIO_REGION: (event?: KeyboardEvent) => {
            if (event) event.preventDefault();
            hotkeyHandler();
        },
    };

    const popoverContent = (
        <div className='cvat-audio-record-region-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>Record audio interval</Text>
                </Col>
            </Row>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color'>Label</Text>
                </Col>
            </Row>
            <Row justify='center'>
                <Col span={24}>
                    <LabelSelector
                        style={{ width: '100%' }}
                        labels={labels}
                        value={selectedLabelId}
                        onChange={(label: Label) => setSelectedLabelId(label.id ?? null)}
                    />
                </Col>
            </Row>
            <Row justify='start' style={{ marginTop: 8 }}>
                <Col>
                    <Button type='primary' onClick={startRecording} disabled={!selectedLabelId}>
                        Record
                    </Button>
                </Col>
            </Row>
        </div>
    );

    return (
        <>
            <GlobalHotKeys
                keyMap={subKeyMap(componentShortcuts, keyMap)}
                handlers={handlers}
            />
            <Popover
                overlayClassName='cvat-audio-record-region-popover'
                trigger='click'
                placement='right'
                open={popoverOpen && !noLabels && !isActive}
                onOpenChange={(visible) => {
                    if (!visible) setPopoverOpen(false);
                }}
                content={popoverContent}
            >
                <CVATTooltip
                    title={
                        noLabels ?
                            'Add a label to the task to record intervals' :
                            `Record interval ${recordRegionShortkey}`
                    }
                    placement='right'
                >
                    <Icon
                        component={AudioRecordRegionIcon}
                        className={
                            (isActive ?
                                'cvat-active-canvas-control cvat-audio-record-region-control' :
                                'cvat-audio-record-region-control') +
                            (noLabels ? ' cvat-audio-record-region-control--disabled' : '')
                        }
                        onClick={handler}
                    />
                </CVATTooltip>
            </Popover>
        </>
    );
}

export default React.memo(RecordRegionControl);
