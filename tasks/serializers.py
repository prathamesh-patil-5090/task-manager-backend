from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination

from .models import Category, Tag, Task


class LargeResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000

class TaskSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.none(),
        allow_null=True,
        required=False
    )
    category_name = serializers.CharField(source="category.name", read_only=True)
    tags = serializers.SlugRelatedField(many=True,
        slug_field="name",
        queryset=Tag.objects.none(),
        required=False
    )

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
            "category_name",
            "tags"
        ]

        read_only_fields = ["id", "created_at", "updated_at", "category_name"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            self.fields['category'].queryset = Category.objects.filter(user=request.user)
            self.fields['tags'].queryset = Tag.objects.all()

    def validate_category(self, value):
        request = self.context.get('request')
        if request and value and value.user != request.user:
            raise serializers.ValidationError("You can only select one of your categories.")
        return value

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        task = Task.objects.create(**validated_data)
        if tags:
            task.tags.set(tags)
        return task

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", [])
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "user", "name", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def create(self, validated_data):
        category = Category.objects.create(**validated_data)
        return category

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
