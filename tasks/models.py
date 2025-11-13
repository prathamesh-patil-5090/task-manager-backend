
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TaskStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    IN_PROGRESS = "IN_PROGRESS", _("In Progress")
    DONE = "DONE", _("Done")

class TaskPriority(models.TextChoices):
    LOW = "LOW", _("Low")
    MEDIUM = "MEDIUM", _("Medium")
    HIGH = "HIGH", _("High")

class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(_("title"), max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING)
    priority = models.CharField(max_length=20,
            choices=TaskPriority.choices,
            default=TaskPriority.LOW)
    due_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey("Category", on_delete=models.CASCADE, null=True, blank=True, related_name="tasks")
    tags = models.ManyToManyField("Tag", blank=True, related_name="tasks")

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["user","status"]),
        ]
        ordering: ["-updated_at", "-created_at"]

    def __str__(self):
        return self.title

class Category(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ["name"]

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
