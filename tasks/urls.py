from django.urls import path

from .views import (
    CategoryDetailView,
    CategoryView,
    DueTasksView,
    FilterView,
    SearchView,
    SummaryView,
    TaskDetailView,
    TasksView,
)

urlpatterns = [
    path("", TasksView.as_view(), name="task-list"),
    path("<int:pk>/", TaskDetailView.as_view(), name="single-task"),
    path("summary/", SummaryView.as_view(), name="tasks-summary"),
    path("due/", DueTasksView.as_view(), name="task-due"),
    path("search/", SearchView.as_view(), name="search-in-tasks"),
    path("filter/", FilterView.as_view(), name="filter-tasks")
]
