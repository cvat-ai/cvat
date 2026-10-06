from rest_framework import serializers

class TaskAnnotationClassStatSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="Label ID")
    name = serializers.CharField(help_text="Label name")
    color = serializers.CharField(help_text="Label color in HEX format")
    shapes = serializers.IntegerField(help_text="Count of shape annotations")
    tracks = serializers.IntegerField(help_text="Count of track annotations")
    tags = serializers.IntegerField(help_text="Count of tag annotations")
    intervals = serializers.IntegerField(help_text="Count of interval annotations")
    total = serializers.IntegerField(help_text="Total annotations for this class")


class TaskAnnotationStatsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(help_text="Task ID")
    total_annotations = serializers.IntegerField(help_text="Total annotations across all classes")
    classes = TaskAnnotationClassStatSerializer(
        many=True, help_text="Per-class annotation statistics"
    )
