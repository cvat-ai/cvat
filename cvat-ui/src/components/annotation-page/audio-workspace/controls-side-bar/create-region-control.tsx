import React, { useState } from 'react';
import Icon from '@ant-design/icons';
import { AudioCreateRegionIcon } from 'icons';
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
    createRegionShortkey: string;
    labels: Label[];
    activeLabelId: number | null;
    updateActiveControl(activeControl: ActiveControl): void;
    onSetActiveLabel(labelId: number | null): void;
}

const componentShortcuts = {
    CREATE_AUDIO_REGION: {
        name: 'Create audio region',
        description: 'Enable audio region creation mode — drag on waveform to create a region',
        sequences: ['c'],
        scope: ShortcutScope.AUDIO_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

function CreateRegionControl(props: Props): JSX.Element {
    const {
        activeControl, createRegionShortkey, labels, activeLabelId,
        updateActiveControl, onSetActiveLabel,
    } = props;
    const { keyMap } = useSelector((state: CombinedState) => state.shortcuts);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedLabelId, setSelectedLabelId] = useState<number | null>(activeLabelId ?? (labels.length ? labels[0].id ?? null : null));

    const isActive = activeControl === ActiveControl.AUDIO_REGION_CREATE;

    const startCreation = (): void => {
        if (selectedLabelId !== null) {
            onSetActiveLabel(selectedLabelId);
        }
        updateActiveControl(ActiveControl.AUDIO_REGION_CREATE);
        setPopoverOpen(false);
    };

    const handler = (): void => {
        if (isActive) {
            updateActiveControl(ActiveControl.CURSOR);
        } else {
            setPopoverOpen(true);
        }
    };

    const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
        CREATE_AUDIO_REGION: (event?: KeyboardEvent) => {
            if (event) event.preventDefault();
            handler();
        },
    };

    const popoverContent = (
        <div className='cvat-audio-create-region-popover-content'>
            <Row justify='start'>
                <Col>
                    <Text className='cvat-text-color' strong>Create audio region</Text>
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
                    <Button type='primary' onClick={startCreation} disabled={!selectedLabelId}>
                        Create
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
                overlayClassName='cvat-audio-create-region-popover'
                trigger='click'
                placement='right'
                open={popoverOpen}
                onOpenChange={(visible) => {
                    if (!visible) setPopoverOpen(false);
                }}
                content={popoverContent}
            >
                <CVATTooltip title={`Create region ${createRegionShortkey}`} placement='right'>
                    <Icon
                        component={AudioCreateRegionIcon}
                        className={
                            isActive ?
                                'cvat-active-canvas-control cvat-audio-create-region-control' :
                                'cvat-audio-create-region-control'
                        }
                        onClick={handler}
                    />
                </CVATTooltip>
            </Popover>
        </>
    );
}

export default React.memo(CreateRegionControl);
