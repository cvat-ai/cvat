// eslint-disable

import React, { useEffect, useState } from 'react';
import { Attribute, Label } from 'cvat-core-wrapper';
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import Text from 'antd/lib/typography/Text';
import {
    Col, Row, Select, Tag,
} from 'antd';

import CVATTooltip from 'components/common/cvat-tooltip';

export type Match = [LabelInterface, LabelInterface, Match][];

interface LabelInterface {
    name: Label['name'];
    type: Label['type'];
    attributes?: {
        name: Attribute['name'];
        values: Attribute['values'];
        input_type: Attribute['inputType'];
    }[];
    elements?: Omit<LabelInterface, 'elements'>[];
}

interface Props {
    modelLabels: LabelInterface[];
    taskLabels: LabelInterface[];
    onUpdateMatch(match: Match): void;
}

function computeAutoMatch(
    modelLabels: LabelInterface[],
    taskLabels: LabelInterface[],
): [LabelInterface, LabelInterface][] {
    const autoMatch: [LabelInterface, LabelInterface][] = [];
    for (let i = 0; i < modelLabels.length; i++) {
        for (let j = 0; j < taskLabels.length; j++) {
            const modelLabel = modelLabels[i];
            const taskLabel = taskLabels[j];
            if (
                modelLabel.name === taskLabel.name &&
                (modelLabel.type === taskLabel.type || modelLabel.type === 'any' || taskLabel.type === 'any')
            ) {
                autoMatch.push([modelLabel, taskLabel]);
            }
        }
    }
    return autoMatch;
}

function LabelsMatcher(props: Props): JSX.Element {
    const { modelLabels, taskLabels, onUpdateMatch } = props;
    const [matching, setMatching] = useState<Match>(
        computeAutoMatch(modelLabels, taskLabels).map((el) => [...el, []]),
    );
    const [modelLabelValue, setModelLabelValue] = useState<LabelInterface | null>(null);
    const [taskLabelValue, setTaskLabelValue] = useState<LabelInterface | null>(null);

    const notMappedModelLabels = modelLabels.filter((modelLabel) => !matching.flat().includes(modelLabel));
    const notMappedTaskLabels = taskLabels.filter((taskLabel) => !matching.flat().includes(taskLabel));

    useEffect(() => {
        if (taskLabelValue && modelLabelValue) {
            const copy = matching.slice(0);
            copy.push([modelLabelValue, taskLabelValue, []]);
            setMatching(copy);
            setTaskLabelValue(null);
            setModelLabelValue(null);
        }
    }, [taskLabelValue, modelLabelValue]);

    useEffect(() => {
        onUpdateMatch(matching);
    }, [matching]);

    const rowClassName = 'cvat-runner-label-matcher-row';
    return (
        <div className='cvat-runner-label-matcher'>
            { matching.map((match, idx) => (
                <>
                    <Row className={rowClassName} key={`${match[0].name}:${match[1]}`}>
                        <Col span={10}>
                            <Tag key={match[0].name}>{match[0].name}</Tag>
                        </Col>
                        <Col span={10} offset={1}>
                            <Tag key={match[1].name}>{match[1].name}</Tag>
                        </Col>
                        <Col span={1} offset={2}>
                            <CVATTooltip title='Remove matched label'>
                                <DeleteOutlined
                                    className='cvat-danger-circle-icon'
                                    onClick={() => setMatching(matching.filter((_match) => match !== _match))}
                                />
                            </CVATTooltip>
                        </Col>
                    </Row>
                    {
                        match[0].type === 'skeleton' && match[1].type === 'skeleton' && (
                            <>
                                <hr />
                                <Text strong>Skeleton points mapping: </Text>
                                <LabelsMatcher
                                    taskLabels={match[0].elements || [] as LabelInterface[]}
                                    modelLabels={match[1].elements || [] as LabelInterface[]}
                                    onUpdateMatch={(pointsMatch) => {
                                        const copy = [...matching];
                                        copy[idx][2] = pointsMatch;
                                        setMatching(copy);
                                    }}
                                />
                                <hr />
                            </>
                        )
                    }
                    {
                        !!match[0].attributes?.length && !!match[1].attributes?.length && (
                            <>
                                <hr />
                                <Text strong>Map attributes: </Text>
                                <div>todo</div>
                                <hr />
                            </>
                        )
                    }
                </>
            ))}

            { modelLabelValue !== null && taskLabelValue === null && (
                <Row className={rowClassName} key={`${modelLabelValue.name}:null`}>
                    <Col span={10}>
                        <Tag key={modelLabelValue.name}>{modelLabelValue.name}</Tag>
                    </Col>
                    <Col span={10} offset={1}>
                        <Select
                            onChange={(value) => {
                                setTaskLabelValue(notMappedTaskLabels
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedTaskLabels
                                .filter((label) => (
                                    modelLabelValue.type === 'any' || label.type === 'any' || modelLabelValue.type === label.type
                                )).map((label) => (
                                    <Select.Option value={label.name}>{label.name}</Select.Option>
                                ))}
                        </Select>
                    </Col>
                    <Col span={1} offset={2}>
                        <CVATTooltip title='Remove matched label'>
                            <DeleteOutlined
                                className='cvat-danger-circle-icon'
                                onClick={() => setModelLabelValue(null)}
                            />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}

            { modelLabelValue === null && taskLabelValue !== null && (
                <Row className={rowClassName} key={`null:${taskLabelValue.name}`}>
                    <Col span={10}>
                        <Select
                            onChange={(value) => {
                                setModelLabelValue(notMappedModelLabels
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedModelLabels
                                .filter((label) => (
                                    label.type === 'any' || taskLabelValue.type === 'any' || label.type === taskLabelValue.type
                                )).map((label) => (
                                    <Select.Option value={label.name}>{label.name}</Select.Option>
                                ))}
                        </Select>
                    </Col>
                    <Col span={10} offset={1}>
                        <Tag key={taskLabelValue.name}>{taskLabelValue.name}</Tag>
                    </Col>
                    <Col span={1} offset={2}>
                        <CVATTooltip title='Remove matched label'>
                            <DeleteOutlined
                                className='cvat-danger-circle-icon'
                                onClick={() => setTaskLabelValue(null)}
                            />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}

            { modelLabelValue === null && taskLabelValue === null && !!notMappedModelLabels.length && (
                <Row className={rowClassName}>
                    <Col span={10}>
                        <Select
                            onChange={(value) => {
                                setModelLabelValue(notMappedModelLabels
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedModelLabels.map((label) => (
                                <Select.Option value={label.name}>{label.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={10} offset={1}>
                        <Select
                            onChange={(value) => {
                                setTaskLabelValue(notMappedTaskLabels
                                    .find((label) => label.name === value) || null);
                            }}
                        >
                            {notMappedTaskLabels.map((label) => (
                                <Select.Option value={label.name}>{label.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={1} offset={2}>
                        <CVATTooltip title='Specify a label mapping between model labels and task labels'>
                            <QuestionCircleOutlined className='cvat-info-circle-icon' />
                        </CVATTooltip>
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default React.memo(LabelsMatcher);
