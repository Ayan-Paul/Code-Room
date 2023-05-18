from django.db import models
from django.contrib.auth.models import User

class UserModel(User):
    rooms = models.ManyToManyField('RoomModel', related_name="rooms")

    def __str__(self):
        return self.first_name

class RoomModel(models.Model):
    room_name = models.CharField(max_length=30, unique=True, null=False, blank=False)
    room_password = models.CharField(max_length=20)
    users = models.ManyToManyField(UserModel)

    def __str__(self) -> str:
        return self.room_name