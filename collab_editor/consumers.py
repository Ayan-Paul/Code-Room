import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import RoomModel

class EditorConsumer(AsyncWebsocketConsumer):
    # Called when the socket open
    async def connect(self):
        self.user = self.scope['user']
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name
        
        self.room = await self.get_room()
        self.room_users = await self.get_room_users()

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'connect_message',
                'message': f'{self.user.first_name} has joined the room.',
                'username': f'{self.user.first_name}',
            }
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'current_users',
                'users': await self.get_room_users()
            }
        )

        await self.accept()


    # Get the room object
    @database_sync_to_async
    def get_room(self):
        return RoomModel.objects.get(room_name=self.room_name)
    
    # Get the users in the room
    @database_sync_to_async
    def get_room_users(self):
        room = RoomModel.objects.get(room_name=self.room_name)
        users = room.users.values_list('first_name', flat=True)
        return (list(users))

    # Remove the user from the room and delete the user & room
    @database_sync_to_async
    def remove_room_user(self):
        self.room.users.remove(self.user)
        self.room.save()
        self.user.delete()
        if self.room.users.all().count() == 0:
            self.room.delete()

    # Called when the socket closes
    async def disconnect(self, code):
        await self.remove_room_user()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'disconnect_message',
                'message': f'{self.user.first_name} has left the room.',
            }
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'current_users',
                'users': await self.get_room_users()
            }
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive the data from frontend
    async def receive(self, text_data):
        received_data = json.loads(text_data)
        if received_data['type'] == 'chat':
            text = received_data['message']
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': text,
                    'username': f'{self.user.first_name}',
                }
            )
        elif received_data['type'] == 'canvas':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'canvas_info',
                    'data': received_data['data'],
                    'username': f'{self.user.first_name}',
                }
            )
        elif received_data['type'] == 'output':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'code_output',
                    'data': received_data['data'],
                    'username': f'{self.user.first_name}',
                }
            )
        else:
            text = received_data['text']
            sync = True if 'sync' in received_data else False
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'editor_text_change',
                    'text': text,
                    'sync': sync,
                    'username': f'{self.user.first_name}',
                }
            )

    async def code_output(self, event):
        data = event['data']
        await self.send(text_data=json.dumps({
            'type': 'output',
            'data': data,
        }))

    async def canvas_info(self, event):
        data = event['data']
        username = event['username']

        await self.send(text_data=json.dumps({
            'type': 'canvas',
            'data': data,
            'username': username,
        }))

    async def chat_message(self, event):
        message = event['message']
        username = event['username']

        await self.send(text_data=json.dumps({
            'type': 'chat',
            'message': message,
            'username': username,
        }))

    async def editor_text_change(self, event):
        text = event['text']
        username = event['username']
        sync = event['sync']

        await self.send(text_data=json.dumps({
            'type': 'editor',
            'text': text,
            'username': username,
            'sync': sync
        }))

    async def disconnect_message(self, event):
        message = event['message']

        await self.send(text_data=json.dumps({
            'type': 'chat',
            'message': message
        }))

    async def connect_message(self, event):
        message = event['message']

        await self.send(text_data=json.dumps({
            'type': 'chat',
            'message': message
        }))

    async def current_users(self, event):
        users = event['users']   
        await self.send(text_data=json.dumps({
            'type': 'user-join-leave',
            'users': users
        }))    

    pass
