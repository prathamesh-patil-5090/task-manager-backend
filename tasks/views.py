from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from tasks.serializers import TaskSerializer

from .models import Task


class TasksView(generics.ListAPIView):
    serializer_class = TaskSerializer
    permission_classes: [IsAuthenticated]
    def get_queryset(self, request):
        user  = request.user
        queryset = Task.objects.filter(user=user)
        queryset = queryset.selected_related("category").prefetch_related("tags")

        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        priority_param = request.query_params.get("priority")
        if priority_param:
            queryset = queryset.filter(status=status_param)

        return queryset

    def post(self, request):
        user = request.user
        new_task = Task.objects.create_task(
            t
        )
