from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", allow_null=True)
    tags = serializers.SlugRelatedField(many=True, slug_field="name", read_only=True)

    class Meta:
        model = Task
        fields=[
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_at",
            "updated_at",
            "category",
            "tags"
        ]

        read_only_fields = ["id", "created_at", "updated_at"]
