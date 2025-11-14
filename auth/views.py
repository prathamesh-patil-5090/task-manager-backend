from django.core.serializers import serialize
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from tasks.models import Task
from tasks.serializers import LargeResultsSetPagination, TaskSerializer

from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data = request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User created successfully",
                "user" : UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(TokenBlacklistView):
    def post(self, request, *args, **kwargs):
        response = super().post( request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            return Response({"message": "Refresh token blacklisted!"}, status=status.HTTP_200_OK)

        return response

class ProfileView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = LargeResultsSetPagination
    serializer_class = TaskSerializer
    def get(self, request):
        user = request.user
        user_data = UserSerializer(user).data

        user_tasks_qs = Task.objects.filter(user=user).order_by("-created_at")

        page = self.paginate_queryset(user_tasks_qs)
        if page is not None:
            tasks_serializer = self.get_serializer(page, many=True, context={'request': request})
            paginated_tasks = self.get_paginated_response(tasks_serializer.data).data
            return Response({
                "user": user_data,
                "tasks": paginated_tasks
            }, status=status.HTTP_200_OK)

        tasks_serializer = self.get_serializer(user_tasks_qs, many=True, context={'request': request})
        return Response({
            'user' : user_data,
            "tasks": {
                "count": len(tasks_serializer.data),
                "next": None,
                "previous": None,
                "result": tasks_serializer.data
            }
        }, status=status.HTTP_200_OK)
