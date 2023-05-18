from django.urls import path
from . import views

urlpatterns = [
    path('get_token/', views.getToken),
    path('', views.lobby, name='lobby'),
    path('run/', views.run_code, name='run_code'),
    path('room_auth/', views.room_auth, name='room_auth'),
    path('user-logout/', views.user_logout, name='user_logout'),
    path('editor/<str:room_name>/', views.room, name='room'),
]