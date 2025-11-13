from django.urls import include, path

from auth.views import ProfileView

# Define URL patterns
urlpatterns = [
    path('auth/', include("auth.urls")),
    path('tasks/', include("tasks.urls")),
    path('profile/', ProfileView.as_view(), name='profile')
]
