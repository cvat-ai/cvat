# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers

from cvat.apps.quality_control import models


class AnnotationIdSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationId
        fields = ('obj_id', 'job_id', 'type')
        read_only_fields = fields


class AnnotationConflictSerializer(serializers.ModelSerializer):
    annotation_ids = AnnotationIdSerializer(many=True)

    class Meta:
        model = models.AnnotationConflict
        fields = ('id', 'frame', 'type', 'annotation_ids', 'report_id', 'importance')
        read_only_fields = fields


class QualityReportSummarySerializer(serializers.Serializer):
    frame_count = serializers.IntegerField()
    frame_share_percent = serializers.FloatField()
    conflict_count = serializers.IntegerField()
    warning_count = serializers.IntegerField()
    error_count = serializers.IntegerField()
    conflicts_by_type = serializers.DictField(child=serializers.IntegerField())

    # This set is enough for basic characteristics, such as
    # DS_unmatched, GT_unmatched, accuracy, precision and recall
    valid_count = serializers.IntegerField(source='annotations.valid_count')
    ds_count = serializers.IntegerField(source='annotations.ds_count')
    gt_count = serializers.IntegerField(source='annotations.gt_count')


class QualityReportParametersSerializer(serializers.Serializer):
    iou_threshold = serializers.FloatField()


class QualityReportSerializer(serializers.ModelSerializer):
    target = serializers.ChoiceField(models.QualityReportTarget.choices())
    summary = QualityReportSummarySerializer()
    parameters = QualityReportParametersSerializer()

    class Meta:
        model = models.QualityReport
        fields = ('id', 'job_id', 'task_id', 'parent_id', 'target', 'summary', 'parameters',
            'created_date', 'target_last_updated', 'gt_last_updated',
        )
        read_only_fields = fields


class QualityReportCreateSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(write_only=True)


class QualitySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.QualitySettings
        fields = (
            'task',

            'iou_threshold',
            'oks_sigma',
            'line_thickness',

            'low_overlap_threshold',

            'oriented_lines',
            'line_orientation_threshold',

            'compare_groups',
            'group_match_threshold',

            'check_covered_annotations',
            'object_visibility_threshold',

            'panoptic_comparison',

            'compare_attributes',
        )
        read_only_fields = ('task', )
        extra_kwargs = {
            k: {'required': False}
            for k in fields
        }

    def validate(self, attrs):
        for k, v in attrs.items():
            if k.endswith('_threshold') or k in ['oks_sigma', 'line_thickness']:
                if not 0 <= v <= 1:
                    raise serializers.ValidationError(f"{k} must be in the range [0; 1]")

        return super().validate(attrs)
