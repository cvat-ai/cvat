// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { QuestionCircleOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons/lib/icons';
import Text from 'antd/lib/typography/Text';
import InputNumber from 'antd/lib/input-number';
import Input from 'antd/lib/input';
import { Col, Row } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import Collapse from 'antd/lib/collapse';
import Button from 'antd/lib/button';
import Form, { FormInstance } from 'antd/lib/form';
import Checkbox from 'antd/lib/checkbox/Checkbox';
import Select from 'antd/lib/select';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    QualitySettings, TargetMetric, Task, Project,
} from 'cvat-core-wrapper';
import {
    PointSizeBase,
    TranscriptionGranularity,
    TranscriptionMetric,
    TranscriptionAlignMode,
    TranscriptionGroupingStrategy,
    TranscriptionNormalizerPreset,
    METRICS_SUPPORTING_THRESHOLD,
} from 'cvat-core/src/quality-settings';
import { AttributeType } from 'cvat-core/src/enums';
import { defaultVisibility, ResourceFilterHOC } from 'components/resource-sorting-filtering';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, config,
} from './jobs-filter-configuration';

interface Props {
    form: FormInstance;
    settings: QualitySettings;
    instance: Task | Project;
    disabled: boolean;
    onSave: () => void;
}

interface TextAttributeOption {
    id: number;
    title: string;
    labelId: number;
}

// Human-readable name + a short summary of what each normalizer preset does
// (mirrors cvat/apps/quality_control/audio/normalization.py). Language presets
// layer their rules on top of the basic language-agnostic cleanup.
const NORMALIZER_PRESET_INFO: Record<TranscriptionNormalizerPreset, { label: string; description: string }> = {
    [TranscriptionNormalizerPreset.NONE]: {
        label: 'None',
        description: 'No normalization — transcriptions are compared exactly as entered.',
    },
    [TranscriptionNormalizerPreset.BASIC]: {
        label: 'Basic',
        description: 'Language-agnostic cleanup: unify quotes/apostrophes, Unicode NFKC, casefold, ' +
            'strip brackets & punctuation, collapse whitespace.',
    },
    [TranscriptionNormalizerPreset.EN]: {
        label: 'English',
        description: 'Basic cleanup + casefold + expand English contractions.',
    },
    [TranscriptionNormalizerPreset.ES]: {
        label: 'Spanish',
        description: 'Basic cleanup + Unicode NFC + casefold.',
    },
    [TranscriptionNormalizerPreset.FR]: {
        label: 'French',
        description: 'Basic cleanup + Unicode NFC + casefold.',
    },
    [TranscriptionNormalizerPreset.DE]: {
        label: 'German',
        description: 'Basic cleanup + casefold + ß/ss unification.',
    },
    [TranscriptionNormalizerPreset.IT]: {
        label: 'Italian',
        description: 'Basic cleanup + Unicode NFC + casefold.',
    },
    [TranscriptionNormalizerPreset.PT]: {
        label: 'Portuguese',
        description: 'Basic cleanup + Unicode NFC + casefold.',
    },
    [TranscriptionNormalizerPreset.NL]: {
        label: 'Dutch',
        description: 'Basic cleanup + ij digraph normalization + casefold.',
    },
    [TranscriptionNormalizerPreset.PL]: {
        label: 'Polish',
        description: 'Basic cleanup + Unicode NFC + casefold.',
    },
    [TranscriptionNormalizerPreset.RU]: {
        label: 'Russian',
        description: 'Basic cleanup + casefold + ё → е unification.',
    },
    [TranscriptionNormalizerPreset.TR]: {
        label: 'Turkish',
        description: 'Basic cleanup + dotted/dotless i handling + casefold.',
    },
    [TranscriptionNormalizerPreset.ZH]: {
        label: 'Chinese',
        description: 'Basic cleanup + NFKC + CJK punctuation strip + simplified-variant conversion.',
    },
    [TranscriptionNormalizerPreset.JA]: {
        label: 'Japanese',
        description: 'Basic cleanup + NFKC + CJK punctuation strip.',
    },
    [TranscriptionNormalizerPreset.KO]: {
        label: 'Korean',
        description: 'Basic cleanup + NFC + CJK punctuation strip.',
    },
    [TranscriptionNormalizerPreset.HI]: {
        label: 'Hindi',
        description: 'Basic cleanup + nukta unify + NFC + danda/chandrabindu normalization.',
    },
    [TranscriptionNormalizerPreset.AR]: {
        label: 'Arabic',
        description: 'Basic cleanup + tatweel strip + alef/yaa unify + diacritics strip.',
    },
};

const FilteringComponentBase = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity,
);
const FilteringComponent = FilteringComponentBase as React.ComponentType<
    Omit<React.ComponentProps<typeof FilteringComponentBase>, 'value' | 'onApplyFilter'>
>;

export default function QualitySettingsForm(props: Readonly<Props>): JSX.Element | null {
    const {
        form, settings, instance, disabled,
    } = props;

    const [visibility, setVisibility] = useState(defaultVisibility);

    // transcription_error_rate is lower-is-better and unbounded above, so its
    // threshold (shown as a percentage) is not capped at 100.
    const targetMetric = Form.useWatch('targetMetric', form) ?? settings.targetMetric;
    const isErrorRateMetric = targetMetric === TargetMetric.TRANSCRIPTION_ERROR_RATE;

    // Text attributes are the candidates a transcription requirement can target.
    const textAttributes: TextAttributeOption[] = (instance.labels ?? []).flatMap((label) => (
        label.attributes
            .filter((attr) => attr.inputType === AttributeType.TEXT && attr.id !== undefined)
            .map((attr) => ({
                id: attr.id as number,
                title: `${label.name} / ${attr.name}`,
                labelId: label.id as number,
            }))
    ));

    // Grouping may key on any attribute of the transcription attribute's label,
    // not only text ones.
    const allAttributes: TextAttributeOption[] = (instance.labels ?? []).flatMap((label) => (
        label.attributes
            .filter((attr) => attr.id !== undefined)
            .map((attr) => ({
                id: attr.id as number,
                title: `${label.name} / ${attr.name}`,
                labelId: label.id as number,
            }))
    ));

    // Transcription requirements are scored as attribute comparisons, so they
    // only take effect when attribute comparison is enabled.
    const compareAttributesEnabled = Form.useWatch('compareAttributes', form) ?? settings.compareAttributes;
    const transcriptionRows: any[] = Form.useWatch('transcriptionRequirements', form) ?? [];

    const initialValues = {
        targetMetric: settings.targetMetric,
        targetMetricThreshold: settings.targetMetricThreshold * 100,

        maxValidationsPerJob: settings.maxValidationsPerJob,

        lowOverlapThreshold: settings.lowOverlapThreshold * 100,
        iouThreshold: settings.iouThreshold * 100,
        compareAttributes: settings.compareAttributes,
        emptyIsAnnotated: settings.emptyIsAnnotated,

        oksSigma: settings.oksSigma * 100,
        pointSizeBase: settings.pointSizeBase,

        lineThickness: settings.lineThickness * 100,
        lineOrientationThreshold: settings.lineOrientationThreshold * 100,
        compareLineOrientation: settings.compareLineOrientation,

        compareGroups: settings.compareGroups,
        groupMatchThreshold: settings.groupMatchThreshold * 100,

        checkCoveredAnnotations: settings.checkCoveredAnnotations,
        objectVisibilityThreshold: settings.objectVisibilityThreshold * 100,
        panopticComparison: settings.panopticComparison,

        jobFilter: settings.jobFilter,

        intervalBoundaryTolerance: settings.intervalBoundaryTolerance,
        transcriptionRequirements: settings.transcriptionRequirements.map((requirement) => ({
            attributeId: requirement.attributeId,
            granularity: requirement.granularity,
            metric: requirement.metric,
            alignment: requirement.alignment,
            metricThreshold: requirement.metricThreshold,
            normalizerPreset: requirement.normalizerPreset,
            // Round-tripped untouched until a substitutions editor exists.
            substitutions: requirement.substitutions,
            groupingStrategy: requirement.groupingStrategy,
            groupingSeparator: requirement.groupingSeparator,
            groupingAttributeId: requirement.groupingAttributeId,
            acceptanceThreshold: requirement.acceptanceThreshold * 100,
        })),
    };

    const targetMetricDescription = `${settings.descriptions.targetMetric
        .replaceAll(/\* [a-z` -]+[A-Z]+/g, '')
        .replaceAll(/\n/g, '')
    }`;

    const pointSizeBaseDescription = `${settings.descriptions.pointSizeBase
        .substring(0, settings.descriptions.pointSizeBase.indexOf('\n\n\n'))
        .replaceAll(/\n/g, ' ')
    }`;

    const makeTooltipFragment = (metric: string, description: string): JSX.Element => (
        <div>
            <Text strong>{`${metric}:`}</Text>
            <Text>
                {description}
            </Text>
        </div>
    );

    const makeTooltip = (jsx: JSX.Element): JSX.Element => (
        <div className='cvat-settings-tooltip-inner'>
            {jsx}
        </div>
    );

    const generalTooltip = makeTooltip(
        <>
            {makeTooltipFragment('Target metric', targetMetricDescription)}
            {makeTooltipFragment('Target metric threshold', settings.descriptions.targetMetricThreshold)}
            {makeTooltipFragment('Compare attributes', settings.descriptions.compareAttributes)}
            {makeTooltipFragment('Empty frames are annotated', settings.descriptions.emptyIsAnnotated)}
            {makeTooltipFragment('Job selection filter', settings.descriptions.jobFilter)}
        </>,
    );

    const jobValidationTooltip = makeTooltip(
        makeTooltipFragment('Max validations per job', settings.descriptions.maxValidationsPerJob),
    );

    const shapeComparisonTooltip = makeTooltip(
        <>
            {makeTooltipFragment('Min overlap threshold (IoU)', settings.descriptions.iouThreshold)}
            {makeTooltipFragment('Low overlap threshold', settings.descriptions.lowOverlapThreshold)}
        </>,
    );

    const keypointTooltip = makeTooltip(
        makeTooltipFragment('Object Keypoint Similarity (OKS)', settings.descriptions.oksSigma),
    );

    const pointTooltip = makeTooltip(
        makeTooltipFragment('Point size base', pointSizeBaseDescription),
    );

    const linesTooltip = makeTooltip(
        <>
            {makeTooltipFragment('Line thickness', settings.descriptions.lineThickness)}
            {makeTooltipFragment('Check orientation', settings.descriptions.compareLineOrientation)}
            {makeTooltipFragment('Min similarity gain', settings.descriptions.lineOrientationThreshold)}
        </>,
    );

    const groupTooltip = makeTooltip(
        <>
            {makeTooltipFragment('Compare groups', settings.descriptions.compareGroups)}
            {makeTooltipFragment('Min group match threshold', settings.descriptions.groupMatchThreshold)}
        </>,
    );

    const segmentationTooltip = makeTooltip(
        <>
            {makeTooltipFragment('Check object visibility', settings.descriptions.checkCoveredAnnotations)}
            {makeTooltipFragment('Min visibility threshold', settings.descriptions.objectVisibilityThreshold)}
            {makeTooltipFragment('Match only visible parts', settings.descriptions.panopticComparison)}
        </>,
    );

    const boundaryToleranceTooltip = settings.descriptions.intervalBoundaryTolerance ??
        'Maximum start/stop difference (ms) allowed when matching interval annotations.';

    return (
        <Form
            form={form}
            layout='vertical'
            className={`cvat-quality-settings-form ${disabled ? 'cvat-quality-settings-form-disabled' : ''}`}
            initialValues={initialValues}
            disabled={disabled}
        >
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    General
                </Text>
                <CVATTooltip title={generalTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='targetMetric'
                        label='Target metric'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={TargetMetric.ACCURACY}>
                                Accuracy
                            </Select.Option>
                            <Select.Option value={TargetMetric.PRECISION}>
                                Precision
                            </Select.Option>
                            <Select.Option value={TargetMetric.RECALL}>
                                Recall
                            </Select.Option>
                            <Select.Option value={TargetMetric.TRANSCRIPTION_ERROR_RATE}>
                                Transcription error rate
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='targetMetricThreshold'
                        label='Target metric threshold'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={isErrorRateMetric ? undefined : 100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareAttributes'
                        valuePropName='checked'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Compare attributes</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='emptyIsAnnotated'
                        valuePropName='checked'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Empty frames are annotated</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='jobFilter'
                        label='Job selection filter'
                        trigger='onApplyFilter'
                    >
                        {/* value and onApplyFilter will be automatically provided by Form.Item */}
                        <FilteringComponent
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            )}
                            onBuilderVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visible })
                            )}
                            onRecentVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Interval comparison
                </Text>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='intervalBoundaryTolerance'
                        label='Boundary tolerance (ms)'
                        tooltip={boundaryToleranceTooltip}
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} step={10} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            {textAttributes.length > 0 && (
                <>
                    <Row className='cvat-quality-settings-title'>
                        <Text strong>Transcription requirements</Text>
                    </Row>
                    {!compareAttributesEnabled && (
                        <Row style={{ marginBottom: 8 }}>
                            <Text type='warning'>
                                Transcription requirements are applied only when
                                &quot;Compare attributes&quot; is enabled.
                            </Text>
                        </Row>
                    )}
                    <Form.List name='transcriptionRequirements'>
                        {(fields, { add, remove }) => (
                            <>
                                <Collapse
                                    items={fields.map((field) => {
                                        const row = transcriptionRows[field.name] ?? {};
                                        const selected = textAttributes.find((a) => a.id === row.attributeId);
                                        const attrTitle = selected?.title ?? 'New requirement';
                                        const thresholdSupported = METRICS_SUPPORTING_THRESHOLD
                                            .includes(row.metric);
                                        const isJoin = row.groupingStrategy ===
                                            TranscriptionGroupingStrategy.JOIN;
                                        const groupingOptions = allAttributes.filter((a) => (
                                            row.attributeId === undefined ||
                                            a.labelId === selected?.labelId
                                        ));
                                        return {
                                            key: field.key,
                                            label: `${attrTitle} · ${row.granularity ?? ''} · ${row.groupingStrategy ?? ''}`,
                                            extra: (
                                                <DeleteOutlined
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        remove(field.name);
                                                    }}
                                                />
                                            ),
                                            children: (
                                                <>
                                                    <Divider orientation='left' plain>
                                                        Target
                                                    </Divider>
                                                    <Form.Item
                                                        name={[field.name, 'attributeId']}
                                                        label='Attribute'
                                                        tooltip='The text attribute scored as a transcription.'
                                                        rules={[
                                                            { required: true, message: 'Select an attribute' },
                                                            {
                                                                validator: async (_rule, value) => {
                                                                    const rows = form
                                                                        .getFieldValue('transcriptionRequirements') ?? [];
                                                                    const used = rows
                                                                        .filter((r: any) => r?.attributeId === value);
                                                                    if (value !== undefined && used.length > 1) {
                                                                        throw new Error(
                                                                            'Attribute already used by another requirement',
                                                                        );
                                                                    }
                                                                },
                                                            },
                                                        ]}
                                                    >
                                                        <Select style={{ width: '100%' }} virtual={false}>
                                                            {textAttributes.map((a) => (
                                                                <Select.Option key={a.id} value={a.id}>
                                                                    {a.title}
                                                                </Select.Option>
                                                            ))}
                                                        </Select>
                                                    </Form.Item>
                                                    <Divider orientation='left' plain>
                                                        Scoring
                                                    </Divider>
                                                    <Row gutter={8}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                name={[field.name, 'metric']}
                                                                label='Metric'
                                                                tooltip='How a word pair is scored. Equality → standard WER/CER (any difference is a full error; recommended default). Error rate / Normalized Levenshtein give partial credit for near-misses (non-standard, more lenient). At character granularity all three coincide.'
                                                            >
                                                                <Select virtual={false}>
                                                                    <Select.Option
                                                                        value={TranscriptionMetric.EQUALITY}
                                                                    >
                                                                        Equality
                                                                    </Select.Option>
                                                                    <Select.Option
                                                                        value={TranscriptionMetric.ERROR_RATE}
                                                                    >
                                                                        Error rate
                                                                    </Select.Option>
                                                                    <Select.Option
                                                                        value={TranscriptionMetric.NORMALIZED_LEV}
                                                                    >
                                                                        Normalized Levenshtein
                                                                    </Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        {thresholdSupported && (
                                                            <Col span={12}>
                                                                <Form.Item
                                                                    name={[field.name, 'metricThreshold']}
                                                                    label='Metric threshold'
                                                                    tooltip='Binarizes the soft metric cost (cost above the threshold counts as a full error). Applies only to the error-rate / normalized Levenshtein metrics; leave empty for standard WER/CER.'
                                                                >
                                                                    <InputNumber min={0} style={{ width: '100%' }} />
                                                                </Form.Item>
                                                            </Col>
                                                        )}
                                                    </Row>
                                                    <Row gutter={8}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                name={[field.name, 'granularity']}
                                                                label='Granularity'
                                                                tooltip='Unit the error rate is computed over. Word → WER (space-separated languages, e.g. English). Character → CER (recommended for scripts without spaces: Chinese, Japanese, Korean, Thai).'
                                                            >
                                                                <Select virtual={false}>
                                                                    <Select.Option
                                                                        value={TranscriptionGranularity.WORD}
                                                                    >
                                                                        Word
                                                                    </Select.Option>
                                                                    <Select.Option
                                                                        value={TranscriptionGranularity.CHARACTER}
                                                                    >
                                                                        Character
                                                                    </Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                name={[field.name, 'alignment']}
                                                                label='Alignment'
                                                                tooltip='How tokens are aligned before scoring. Character (recommended) absorbs word-boundary disagreements and suits rich morphology / scripts without spaces; Word is standard when word boundaries are clean (e.g. English).'
                                                            >
                                                                <Select virtual={false}>
                                                                    <Select.Option value={TranscriptionAlignMode.CHAR}>
                                                                        Character
                                                                    </Select.Option>
                                                                    <Select.Option value={TranscriptionAlignMode.WORD}>
                                                                        Word
                                                                    </Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                name={[field.name, 'acceptanceThreshold']}
                                                                label='Acceptance threshold (%)'
                                                                tooltip='Per-match error rate at or above which a transcription is flagged as a conflict. Lower = stricter; 0% requires an exact match. A few percent tolerates minor wording differences.'
                                                            >
                                                                <InputNumber min={0} max={100} precision={0} />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                    <Divider orientation='left' plain>
                                                        Normalization
                                                    </Divider>
                                                    <Row gutter={8}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                name={[field.name, 'normalizerPreset']}
                                                                label='Normalizer'
                                                                tooltip='Text normalization preset applied before comparison.'
                                                            >
                                                                <Select virtual={false}>
                                                                    {Object.values(TranscriptionNormalizerPreset)
                                                                        .map((preset) => (
                                                                            <Select.Option
                                                                                key={preset}
                                                                                value={preset}
                                                                                title={NORMALIZER_PRESET_INFO[preset]
                                                                                    .description}
                                                                            >
                                                                                {NORMALIZER_PRESET_INFO[preset].label}
                                                                            </Select.Option>
                                                                        ))}
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                    <Divider orientation='left' plain>
                                                        Grouping
                                                    </Divider>
                                                    <Row gutter={8}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                name={[field.name, 'groupingStrategy']}
                                                                label='Strategy'
                                                                tooltip='Filter scores matched interval pairs; join concatenates a group’s intervals before scoring.'
                                                            >
                                                                <Select virtual={false}>
                                                                    <Select.Option
                                                                        value={TranscriptionGroupingStrategy.FILTER}
                                                                    >
                                                                        Filter
                                                                    </Select.Option>
                                                                    <Select.Option
                                                                        value={TranscriptionGroupingStrategy.JOIN}
                                                                    >
                                                                        Join
                                                                    </Select.Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                    {isJoin && (
                                                        <Row gutter={8}>
                                                            <Col span={12}>
                                                                <Form.Item
                                                                    name={[field.name, 'groupingSeparator']}
                                                                    label='Separator'
                                                                    tooltip='String inserted between joined transcriptions (join only).'
                                                                    extra={`Value: "${(row.groupingSeparator ?? '').replace(/ /g, '␣')}"`}
                                                                >
                                                                    <Input style={{ fontFamily: 'monospace' }} />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={12}>
                                                                <Form.Item
                                                                    name={[field.name, 'groupingAttributeId']}
                                                                    label='Group by attribute'
                                                                    tooltip='Attribute that defines join groups, together with the label (join only).'
                                                                >
                                                                    <Select virtual={false}>
                                                                        <Select.Option value={null}>
                                                                            &lt;label only&gt;
                                                                        </Select.Option>
                                                                        {groupingOptions.map((a) => (
                                                                            <Select.Option key={a.id} value={a.id}>
                                                                                {a.title}
                                                                            </Select.Option>
                                                                        ))}
                                                                    </Select>
                                                                </Form.Item>
                                                            </Col>
                                                        </Row>
                                                    )}
                                                </>
                                            ),
                                        };
                                    })}
                                />
                                <Button
                                    type='dashed'
                                    icon={<PlusOutlined />}
                                    disabled={disabled || !compareAttributesEnabled}
                                    style={{ marginTop: 8 }}
                                    onClick={() => add({
                                        granularity: TranscriptionGranularity.WORD,
                                        metric: TranscriptionMetric.EQUALITY,
                                        alignment: TranscriptionAlignMode.CHAR,
                                        metricThreshold: null,
                                        normalizerPreset: TranscriptionNormalizerPreset.BASIC,
                                        substitutions: [],
                                        groupingStrategy: TranscriptionGroupingStrategy.JOIN,
                                        groupingSeparator: ' ',
                                        groupingAttributeId: null,
                                        acceptanceThreshold: 50,
                                    })}
                                >
                                    Add transcription requirement
                                </Button>
                            </>
                        )}
                    </Form.List>
                </>
            )}
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Job validation
                </Text>
                <CVATTooltip title={jobValidationTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='maxValidationsPerJob'
                        label='Max validations per job'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber
                            min={0}
                            max={100}
                            precision={0}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Shape comparison
                </Text>
                <CVATTooltip title={shapeComparisonTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='iouThreshold'
                        label='Min overlap threshold (%)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='lowOverlapThreshold'
                        label='Low overlap threshold (%)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Keypoint Comparison
                </Text>
                <CVATTooltip title={keypointTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='oksSigma'
                        label='OKS sigma (bbox side %)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Point Comparison
                </Text>
                <CVATTooltip title={pointTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='pointSizeBase'
                        label='Point size base'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Select
                            style={{ width: '70%' }}
                            virtual={false}
                        >
                            <Select.Option value={PointSizeBase.IMAGE_SIZE}>
                                Image size
                            </Select.Option>
                            <Select.Option value={PointSizeBase.GROUP_BBOX_SIZE}>
                                Group bbox size
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Line Comparison
                </Text>
                <CVATTooltip title={linesTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='lineThickness'
                        label='Relative thickness (frame side %)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={1000} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareLineOrientation'
                        rules={[{ required: true, message: 'This field is required' }]}
                        valuePropName='checked'
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Check orientation</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='lineOrientationThreshold'
                        label='Min similarity gain (%)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Group Comparison
                </Text>
                <CVATTooltip title={groupTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='compareGroups'
                        valuePropName='checked'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Compare groups</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='groupMatchThreshold'
                        label='Min group match threshold (%)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Divider />
            <Row className='cvat-quality-settings-title'>
                <Text strong>
                    Segmentation Comparison
                </Text>
                <CVATTooltip title={segmentationTooltip} className='cvat-settings-tooltip' overlayStyle={{ maxWidth: '500px' }}>
                    <QuestionCircleOutlined
                        style={{ opacity: 0.5 }}
                    />
                </CVATTooltip>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='checkCoveredAnnotations'
                        valuePropName='checked'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Check object visibility</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name='objectVisibilityThreshold'
                        label='Min visibility threshold (area %)'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={12}>
                    <Form.Item
                        name='panopticComparison'
                        valuePropName='checked'
                        rules={[{ required: true, message: 'This field is required' }]}
                    >
                        <Checkbox>
                            <Text className='cvat-text-color'>Match only visible parts</Text>
                        </Checkbox>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}
