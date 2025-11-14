from django.urls import include, path

from auth.views import ProfileView
from tasks.views import CategoryDetailView, CategoryView

# Define URL patterns
urlpatterns = [
    path('api/auth/', include("auth.urls")),
    path('api/tasks/', include("tasks.urls")),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path("api/categories/", CategoryView.as_view(), name="category-read-create"),
    path("api/categories/<int:pk>", CategoryDetailView.as_view(), name="category-update-delete"),
]
