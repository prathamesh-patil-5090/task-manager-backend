from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK

from tasks.serializers import (
    CategorySerializer,
    LargeResultsSetPagination,
    TaskSerializer,
)

from .models import Category, Task


class TasksView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    pagination_class= LargeResultsSetPagination
    def get_queryset(self):
        request = self.request
        user  = request.user
        queryset = Task.objects.filter(user=user).select_related("category").prefetch_related("tags")

        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        priority_param = request.query_params.get("priority")
        if priority_param:
            queryset = queryset.filter(priority=priority_param)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return(
            Task.objects.filter(user=self.request.user).select_related("category").prefetch_related("tags")
        )


class CategoryView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class= LargeResultsSetPagination
    def get_queryset(self):
        request = self.request
        user  = request.user
        queryset = Category.objects.filter(user=user)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return(
            Category.objects.filter(user=self.request.user)
        )

class SummaryView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        total_tasks = Task.objects.filter(user=user).count()
        done_tasks = Task.objects.filter(user=user, status="DONE").count()
        pending_tasks = Task.objects.filter(user=user, status="PENDING").count()
        in_progress_tasks = Task.objects.filter(user=user, status="IN_PROGRESS").count()
        return Response({
            "TOTAL TASKS" : total_tasks,
            "TASKS DONE" : done_tasks,
            "TASKS PENDING" : pending_tasks,
            "TASKS IN PROGRESS" : in_progress_tasks
        }, status=HTTP_200_OK)

class DueTasksView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer
    pagination_clas = LargeResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        days_params = self.request.query_params.get("days", "7")
        try:
            days = int(days_params)
            if days < 0:
                days = 0
        except (TypeError, ValueError):
            days = 7

        now  = timezone.now()
        end = now + timedelta(days=days)

        query_set = (
            Task.objects
            .filter(user=user, due_date__isnull=False, due_date__gte=now, due_date__lte=end)
            .select_related("Category")
            .prefetch_related("tags")
        )

        return query_set

class SearchView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer
    pagination_class = LargeResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        q = self.request.query_params.get("q", "")
        q = (q or "").strip()
        if not q:
            return Tasks.objects.none()

        query_set = (
            Task.objects.filter(user=user)
            .filter(Q(title__icontains=q) | Q(description__icontains=q))
            .select_related("category")
            .prefetch_related("tags")
        )

        return query_set

class FilterView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer
    pagination_class = LargeResultsSetPagination

    def get_queryset(self):
        user = self.request.user
        status = self.request.query_params.get("status", "")
        priority = self.request.query_params.get("priority", "")
        status = (status or "").strip()
        priority = (priority or "").strip()
        if (not status) and (not priority):
            return Task.objects.none()

        query_set = (
            Task.objects.filter(user=user)
        )

        if status:
            query_set = query_set.filter(status__iexact=status)

        if priority:
            query_set = query_set.filter(priority__iexact=priority)

        query_set = query_set.select_related("category").prefetch_related("tags")

        return query_set
