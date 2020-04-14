import ReactDOM from 'react-dom';
import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd/lib/grid';
import Modal from 'antd/lib/modal';
import Menu from 'antd/lib/menu';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Tooltip from 'antd/lib/tooltip';

import { clamp } from 'utils/math';
import { run, cancel } from 'utils/reid-utils';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';

interface InputModalProps {
    visible: boolean;
    onCancel(): void;
    onSubmit(threshold: number, distance: number): void;
}

function InputModal(props: InputModalProps): JSX.Element {
    const { visible, onCancel, onSubmit } = props;
    const [threshold, setThreshold] = useState(0.5);
    const [distance, setDistance] = useState(50);

    const [thresholdMin, thresholdMax] = [0.05, 0.95];
    const [distanceMin, distanceMax] = [1, 1000];
    return (
        <Modal
            closable={false}
            width={300}
            visible={visible}
            onCancel={onCancel}
            onOk={() => onSubmit(threshold, distance)}
            okText='Merge'
        >
            <Row type='flex'>
                <Col span={10}>
                    <Tooltip title='Similarity of objects on neighbour frames is calculated using AI model'>
                        <Text>Similarity threshold: </Text>
                    </Tooltip>
                </Col>
                <Col span={12}>
                    <InputNumber
                        style={{ width: '100%' }}
                        min={thresholdMin}
                        max={thresholdMax}
                        step={0.05}
                        value={threshold}
                        onChange={(value: number | undefined) => {
                            if (typeof (value) === 'number') {
                                setThreshold(clamp(value, thresholdMin, thresholdMax));
                            }
                        }}
                    />
                </Col>
            </Row>
            <Row type='flex'>
                <Col span={10}>
                    <Tooltip title='The value defines max distance to merge (between centers of two objects on neighbour frames)'>
                        <Text>Max pixel distance: </Text>
                    </Tooltip>
                </Col>
                <Col span={12}>
                    <InputNumber
                        style={{ width: '100%' }}
                        min={distanceMin}
                        max={distanceMax}
                        step={5}
                        value={distance}
                        onChange={(value: number | undefined) => {
                            if (typeof (value) === 'number') {
                                setDistance(clamp(value, distanceMin, distanceMax));
                            }
                        }}
                    />
                </Col>
            </Row>
        </Modal>
    );
}

interface InProgressDialogProps {
    visible: boolean;
    progress: number;
    onCancel(): void;
}

function InProgressDialog(props: InProgressDialogProps): JSX.Element {
    const { visible, onCancel, progress } = props;
    return (
        <Modal
            closable={false}
            width={300}
            visible={visible}
            okText='Cancel'
            okButtonProps={{
                type: 'danger',
            }}
            onOk={onCancel}
        >
            <Text>{`Merging is in progress ${progress}%`}</Text>
        </Modal>
    );
}

const reidContainer = window.document.createElement('div');
reidContainer.setAttribute('id', 'cvat-reid-wrapper');
window.document.body.appendChild(reidContainer);


interface StateToProps {
    jobInstance: any | null;
}

interface DispatchToProps {

}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                instance: jobInstance,
            },
        },
    } = state;

    return {
        jobInstance,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {

}


function ReIDPlugin(props: StateToProps & DispatchToProps): JSX.Element {
    const { jobInstance, ...rest } = props;
    const [showInputDialog, setShowInputDialog] = useState(false);
    const [showInProgressDialog, setShowInProgressDialog] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        ReactDOM.render((
            <>
                <InProgressDialog
                    visible={showInProgressDialog}
                    progress={progress}
                    onCancel={() => {
                        // get task id
                        cancel();
                    }}
                />
                <InputModal
                    visible={showInputDialog}
                    onCancel={() => setShowInputDialog(false)}
                    onSubmit={(threshold: number, distance: number) => {
                        setProgress(0);
                        setShowInputDialog(false);
                        setShowInProgressDialog(true);

                        // как экспортировать и импортировать аннотацию, без сохранения на сервере
                        // на клиенте мы можем только получить аннотацию для текущего фрейма
                        // скорее всего нужен import row, export raw

                        // get job id
                        // get annotations
                        const onUpdatePercentage = (percent: number): void => {
                            setProgress(percent);
                        };

                        run({
                            threshold,
                            distance,
                            onUpdatePercentage,
                            jobID: 0,
                            annotations: [],
                        }).then(() => {
                            // save annotations (just import it to collection)
                        }).catch((error: Error) => {
                            Modal.error({
                                title: 'Could not merge annotations',
                                content: error.toString(),
                            });
                        }).finally(() => {
                            setShowInProgressDialog(false);
                        });
                    }}
                />
            </>
        ), reidContainer);
    });

    return (
        <Menu.Item
            {...rest}
            key='run_reid'
            title='Run algorithm that merges separated bounding boxes automatically'
            onClick={() => {
                if (jobInstance) {
                    setShowInputDialog(true);
                }
            }}
        >
            Run ReID merge
        </Menu.Item>
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ReIDPlugin);
