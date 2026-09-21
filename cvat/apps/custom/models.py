# Copyright (C) 2025 CVAT Custom Train Metadata Module
# SPDX-License-Identifier: MIT

"""
Custom models to extend CVAT functionality with train event metadata.
"""

from django.db import models
from cvat.apps.engine.models import Task
from django.contrib.auth.models import User

# Re-export TrainGroupSchedule so Django's app registry discovers it
# under app_label='custom'. The model is defined in the scheduler
# sub-package to keep the file under the 400-line cap, but it must
# appear on this module for the existing migrations dir to own it.
from .scheduler.models import TrainGroupSchedule  # noqa: F401


class TaskTrainMetadata(models.Model):
    """
    Extended metadata for tasks to associate them with train events.

    This model extends the Task functionality without modifying the core CVAT models.
    Each task can have associated train metadata including train_id and verdict.
    """

    class VerdictChoices(models.TextChoices):
        ACCEPTED = 'AC', 'Accepted'
        NOT_APPLICABLE = 'NA', 'Not Applicable'
        REJECTED = 'RJ', 'Rejected'

    # One-to-one relationship with Task
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name='train_metadata',
        help_text="Associated CVAT task"
    )

    # Train ID - defaults to task ID if not specified
    train_id = models.CharField(
        max_length=100,
        help_text="Train event identifier (defaults to task ID)"
    )

    # Verdict with enum choices
    verdict = models.CharField(
        max_length=2,
        choices=VerdictChoices.choices,
        default=VerdictChoices.NOT_APPLICABLE,
        help_text="Train verdict: AC (Accepted), NA (Not Applicable), RJ (Rejected)"
    )

    # Metadata timestamps
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    # Optional additional fields for future extensibility
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Optional notes about the train event"
    )

    confidence_score = models.FloatField(
        blank=True,
        null=True,
        help_text="Optional confidence score for the verdict (0.0 to 1.0)"
    )

    # S3/Cloud storage prefix path
    server_files_path = models.CharField(
        max_length=1024,
        blank=True,
        null=True,
        help_text="S3 prefix or server files path used for this task's data source"
    )

    class Meta:
        verbose_name = "Task Train Metadata"
        verbose_name_plural = "Task Train Metadata"
        db_table = "custom_task_train_metadata"

    def __str__(self):
        return f"Train {self.train_id} - Task {self.task.id} ({self.get_verdict_display()})"

    def save(self, *args, **kwargs):
        # Auto-set train_id to task ID if not provided
        if not self.train_id:
            self.train_id = str(self.task.id)
        super().save(*args, **kwargs)

    @property
    def verdict_display(self):
        """Human-readable verdict display."""
        return self.get_verdict_display()

    @classmethod
    def get_or_create_for_task(cls, task):
        """
        Get or create train metadata for a task.
        Creates with default values if it doesn't exist.
        """
        metadata, created = cls.objects.get_or_create(
            task=task,
            defaults={
                'train_id': str(task.id),
                'verdict': cls.VerdictChoices.NOT_APPLICABLE
            }
        )
        return metadata, created


class TaskComment(models.Model):
    """
    Task-level comments for general discussions and notes.

    Unlike CVAT's Issue-based comments (which are frame-specific),
    these comments are directly attached to tasks for general discussions.

    Features:
    - Direct Task → Comment relationship (1:many)
    - Comment threading/replies support
    - Comment type categorization
    - Edit tracking
    """

    # Core fields
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_comments',
        help_text="Task this comment belongs to"
    )

    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_comments',
        help_text="User who created this comment"
    )

    message = models.TextField(
        help_text="Comment content"
    )

    # Timestamps
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(
        default=False,
        help_text="True if comment has been edited after creation"
    )

    # Comment categorization
    class CommentType(models.TextChoices):
        GENERAL = 'GEN', 'General'
        FEEDBACK = 'FB', 'Feedback'
        ISSUE = 'ISS', 'Issue'
        REVIEW = 'REV', 'Review'
        NOTE = 'NOTE', 'Note'
        QUESTION = 'Q', 'Question'

    comment_type = models.CharField(
        max_length=4,
        choices=CommentType.choices,
        default=CommentType.GENERAL,
        help_text="Comment category for organization"
    )

    # Threading support for replies
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        help_text="Parent comment if this is a reply"
    )

    class Meta:
        verbose_name = "Task Comment"
        verbose_name_plural = "Task Comments"
        ordering = ['-created_date']  # Newest first
        db_table = "custom_task_comment"
        indexes = [
            models.Index(fields=['task', '-created_date']),
            models.Index(fields=['author', '-created_date']),
        ]

    def __str__(self):
        preview = self.message[:50] + "..." if len(self.message) > 50 else self.message
        return f"Comment on Task {self.task.id} by {self.author.username}: {preview}"

    def save(self, *args, **kwargs):
        # Track if this is an edit
        if self.pk and self._state.adding is False:
            self.is_edited = True
        super().save(*args, **kwargs)

    @property
    def is_reply(self):
        """Check if this comment is a reply to another comment."""
        return self.parent_comment is not None

    @property
    def reply_count(self):
        """Get number of replies to this comment."""
        return self.replies.count()

    def get_thread_comments(self):
        """Get all comments in this thread (parent + all replies)."""
        if self.parent_comment:
            # This is a reply, get the parent's thread
            return self.parent_comment.get_thread_comments()
        else:
            # This is a parent, return self + all replies
            return TaskComment.objects.filter(
                models.Q(id=self.id) | models.Q(parent_comment=self)
            ).order_by('created_date')


# ==========================================
# Train Group Schedule Models
# ==========================================

class TrainGroupMapping(models.Model):
    """
    Current source of truth: which group each train_id belongs to.
    One row per train. Fully rebuilt atomically on every upload.
    """

    train_id = models.CharField(max_length=100, primary_key=True)
    group = models.CharField(max_length=50, db_index=True)
    updated_by = models.ForeignKey(
        User,
        null=True,
        on_delete=models.SET_NULL,
        related_name="train_group_mappings_updated",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Train Group Mapping"
        verbose_name_plural = "Train Group Mappings"
        db_table = "custom_train_group_mapping"
        indexes = [models.Index(fields=["group", "train_id"])]

    def __str__(self):
        return f"{self.train_id} -> {self.group}"


class TrainGroupMappingVersion(models.Model):
    """
    Immutable snapshot of each upload (or rollback).
    Exactly one row has is_current=True at any time.
    """

    version_no = models.PositiveIntegerField(unique=True)
    uploaded_by = models.ForeignKey(
        User,
        null=True,
        on_delete=models.SET_NULL,
        related_name="train_group_mapping_versions",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    comment = models.CharField(max_length=500, blank=True)
    csv_text = models.TextField(
        help_text="Canonical CSV form (xlsx/paste uploads normalized to CSV)."
    )
    source_format = models.CharField(
        max_length=16,
        default="csv",
        help_text="One of: csv, xlsx, paste, rollback",
    )
    row_count = models.PositiveIntegerField()
    is_current = models.BooleanField(default=False)
    source_version = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rollbacks",
        help_text="Set when this version was produced by rolling back to source_version.",
    )
    diff_summary = models.JSONField(
        default=dict,
        help_text=(
            "Pre-computed diff vs previous current version: "
            "{added: [...], removed: [...], changed: [...], counts: {...}}"
        ),
    )

    class Meta:
        verbose_name = "Train Group Mapping Version"
        verbose_name_plural = "Train Group Mapping Versions"
        db_table = "custom_train_group_mapping_version"
        ordering = ["-version_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_current"],
                condition=models.Q(is_current=True),
                name="only_one_current_train_group_version",
            ),
        ]

    def __str__(self):
        marker = " (current)" if self.is_current else ""
        return f"v{self.version_no}{marker}"


class TaxonomyLabel(models.Model):
    """
    Managed defect taxonomy for annotation classes (Tokyu).

    Deployment-global like TrainGroupMapping: the taxonomy is the single
    source of truth for annotation labels; syncing pushes active entries
    into a CVAT project's labels so the annotation picker reads them.
    Archive-only lifecycle: there is no delete endpoint, so labels that
    are already used in annotations can never be hard-deleted.
    """

    class PriorityChoices(models.IntegerChoices):
        HIGH = 1, 'High'
        MEDIUM = 2, 'Medium'
        LOW = 3, 'Low'

    # 64 mirrors engine.Label.name; SafeCharField silently truncates
    # anything longer on sync, which would corrupt name matching.
    name = models.CharField(max_length=64, unique=True)
    color = models.CharField(
        max_length=7,
        default='#fa3253',
        help_text='Hex color in #rrggbb form, mirrored into the CVAT label on sync.',
    )
    category = models.CharField(max_length=100, blank=True, default='')
    priority = models.IntegerField(
        choices=PriorityChoices.choices,
        default=PriorityChoices.MEDIUM,
    )
    is_archived = models.BooleanField(default=False)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='taxonomy_label_updates',
    )

    class Meta:
        verbose_name = 'Taxonomy Label'
        verbose_name_plural = 'Taxonomy Labels'
        db_table = 'custom_taxonomy_label'
        ordering = ['priority', 'name']

    def __str__(self):
        marker = ' (archived)' if self.is_archived else ''
        return f"{self.name}{marker}"


class UserAdminAuditLog(models.Model):
    """
    Queryable audit trail for the customer-admin console actions.

    CVAT's native events pipeline ships to Clickhouse and has no REST
    query surface, so the customer-admin console records its own rows.
    target_username is snapshotted because target is SET_NULL.
    """

    class ActionChoices(models.TextChoices):
        CREATE = 'create', 'Create'
        UPDATE = 'update', 'Update'
        DEACTIVATE = 'deactivate', 'Deactivate'
        REACTIVATE = 'reactivate', 'Reactivate'
        PASSWORD_RESET = 'password_reset', 'Password reset'

    actor = models.ForeignKey(
        User,
        null=True,
        on_delete=models.SET_NULL,
        related_name='user_admin_actions',
    )
    target = models.ForeignKey(
        User,
        null=True,
        on_delete=models.SET_NULL,
        related_name='user_admin_audit_entries',
    )
    target_username = models.CharField(max_length=150)
    action = models.CharField(max_length=20, choices=ActionChoices.choices)
    changes = models.JSONField(default=dict, blank=True)
    created_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Admin Audit Log'
        verbose_name_plural = 'User Admin Audit Logs'
        db_table = 'custom_user_admin_audit'
        ordering = ['-created_date', '-id']

    def __str__(self):
        return f"{self.action} {self.target_username}"
class TaskVisionAnalysis(models.Model):
    """Orochi Vision's findings for the clip behind a task, pushed by On-Prem after
    it uploads the session (see vision.py for the document).

    `chapters` is the UI-facing document; the scalar columns are copied out of it
    on every write so lists and filters never open the JSON. One row per task,
    replaced wholesale on each push -- Vision's output is a fact about the clip,
    not something annotators edit.
    """

    task = models.OneToOneField(
        Task, on_delete=models.CASCADE, related_name="vision_analysis",
        help_text="Associated CVAT task",
    )
    chapters = models.JSONField(help_text="Chapters document, schema_version 1")
    car_count = models.PositiveIntegerField(null=True, blank=True)
    needs_review = models.BooleanField(default=False, db_index=True)
    truncated_start = models.BooleanField(null=True, blank=True)
    truncated_end = models.BooleanField(null=True, blank=True)
    trimmed = models.BooleanField(default=False)
    trim_ratio = models.FloatField(null=True, blank=True)
    video_duration_s = models.FloatField(null=True, blank=True)
    analysed_camera = models.CharField(max_length=16, blank=True, default="")
    outcome = models.CharField(max_length=40, blank=True, default="")
    pipeline_image = models.CharField(max_length=120, null=True, blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Task Vision Analysis"
        verbose_name_plural = "Task Vision Analyses"
        db_table = "custom_task_vision_analysis"

    def __str__(self):
        return f"Vision for task {self.task_id}: {self.car_count} cars"

    SUMMARY_FIELDS = ("car_count", "needs_review", "truncated_start", "truncated_end",
                      "trimmed", "trim_ratio", "video_duration_s", "analysed_camera",
                      "outcome", "pipeline_image")

    @classmethod
    def upsert_from_chapters(cls, task, doc: dict):
        from .vision import summarize
        return cls.objects.update_or_create(
            task=task, defaults={"chapters": doc, **summarize(doc)})

    def summary(self) -> dict:
        out = {f: getattr(self, f) for f in self.SUMMARY_FIELDS}
        out["updated_date"] = self.updated_date.isoformat() if self.updated_date else None
        return out
