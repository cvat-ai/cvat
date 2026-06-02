import React, { useState } from 'react';
import { ColumnWidthOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';

import { ActiveControl, CombinedState } from 'reducers';
import { Label } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import LabelSelector from 'components/label-selector/audio-label-selector';
import GlobalHotKeys from 'utils/mousetrap-react';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import { useSelector } from 'react-redux';

export interface Props {
    extendRegionShortkey: string;
    labels: Label[];
    activeLabelId: number | null;
    recording: boolean;
    onExtendRegion(labelId: number): void;
    onSetActiveLabel(labelId: number | null): void;
    updateActiveControl(activeControl: ActiveControl): void;
}

const componentShortcuts = {
    EXTEND_AUDIO_REGION_FROM_LAST: {
        name: 'Extend interval from last region',
        description: (
            'Create a new audio interval that starts at the end of the most recently ' +
            'added region (or at the audio start if none exists) and ends at the ' +
            'current playback position.'
        ),
        sequences: ['shift+e'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function ExtendRegionControl(props: Props): JSX.Element {
    const {
        extendRegionShortkey, labels, activeLabelId, recording,
        onExtendRegion, onSetActiveLabel, updateActiveControl,
    } = props;
    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedLabelId, setSelectedLabelId] = useState<number | null>(
        activeLabelId ?? (labels.length ? labels[0].id ?? null : null),
    );

    const noLabels = labels.length === 0;

    const performExtend = (): void => {
        if (noLabels || selectedLabelId === null) return;
        onSetActiveLabel(selectedLabelId);
        onExtendRegion(selectedLabelId);
        setPopoverOpen(false);
    };

    const handler = (): void => {
        if (noLabels) return;
        if (recording) {
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

    const hotkeyHandler = (): void => {
        if (noLabels) return;
        if (recording) {
            updateActiveControl(ActiveControl.CURSOR);
            setPopoverOpen(false);
            return;
        }
        const labelId = selectedLabelId ?? activeLabelId ?? labels[0]?.id ?? null;
        if (labelId === null) {
            setPopoverOpen(true);
            return;
        }
        onSetActiveLabel(labelId);
        setSelectedLabelId(labelId);
        onExtendRegion(labelId);
        setPopoverOpen(false);
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        EXTEND_AUDIO_REGION_FROM_LAST: (event?: KeyboardEvent) => {
            if (event) event.preventDefault();
            hotkeyHandler();
        },
    };

    const popoverContent = (
        <div className='cvat-audio-extend-region-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>Extend audio interval</Text>
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
                        withLabelColor
                        onChange={(label: Label) => setSelectedLabelId(label.id ?? null)}
                    />
                </Col>
            </Row>
            <Row justify='start' style={{ marginTop: 8 }}>
                <Col>
                    <Button type='primary' onClick={performExtend} disabled={!selectedLabelId}>
                        Extend
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
                overlayClassName='cvat-audio-extend-region-popover'
                trigger='click'
                placement='right'
                open={popoverOpen && !noLabels && !recording}
                onOpenChange={(visible) => {
                    if (!visible) setPopoverOpen(false);
                }}
                content={popoverContent}
            >
                <CVATTooltip
                    title={
                        noLabels ?
                            'Add a label to the task to extend intervals' :
                            `Extend interval ${extendRegionShortkey}`
                    }
                    placement='right'
                >
                    <ColumnWidthOutlined
                        className={
                            `cvat-audio-extend-region-control${
                                noLabels ? ' cvat-audio-extend-region-control-disabled' : ''
                            }`
                        }
                        onClick={handler}
                    />
                </CVATTooltip>
            </Popover>
        </>
    );
}

export default React.memo(ExtendRegionControl);
