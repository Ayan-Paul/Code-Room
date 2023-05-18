from django.contrib import admin
from .models import UserModel, RoomModel
# Register your models here.

admin.site.register(UserModel)
admin.site.register(RoomModel)