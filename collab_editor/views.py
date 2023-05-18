from django.shortcuts import render
from django.http.response import JsonResponse
from agora_token_builder import RtcTokenBuilder
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import random
import requests
import time
import json
import time
import uuid

from .models import UserModel, RoomModel 
from django.contrib.auth import login, logout

# Setting variables for hackerEarth API
CODE_EVALUATION_URL = u'https://api.hackerearth.com/v4/partner/code-evaluation/submissions/'
CLIENT_SECRET = '405f168f10ed6c6c2c75d40b700690599f106f84'
MAX_TIME_LIMIT = 5
MAX_MEMORY_LIMIT = 262144
EVERY_RESULT_REQUEST_TIME = 1

#Generating token for agora client
def getToken(request):
    appId = "035a6d6451c745d6b8ea5ac0119bdb49"
    appCertificate = '3cff891b46b74da9837a364103712bf2'
    channelName = request.GET.get('channel')
    uid = random.randint(1, 230)
    expirationTimeInSeconds = 3600 * 24
    currentTimeStamp = time.time()
    privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds
    role = 1

    token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
    return JsonResponse({'token': token, 'uid': uid}, safe=False)

# Render lobby
def lobby(request):
    return render(request, 'collab_editor/lobby.html')

# Authentification for users to join room
def room_auth(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        room_name = body['room']
        name = body['username']
        password = body['password']

        # Get or create the room
        try:
            room = RoomModel.objects.get(room_name=room_name)
            if room.room_password != password:
                return JsonResponse(data={"msg": "Room " + room_name + " Occupied, put correct password"}, status=400)
            
        except:
            if len(password) < 6:
                return JsonResponse(data={"msg": "Password length must be greater than 5 characters"}, status=400)
            room = RoomModel.objects.create(room_name=room_name, room_password=password)
        
        # Login in user
        try:
            if room.users.filter(first_name=name):
                return JsonResponse(data={"msg": "Username is not available for this room. Please select another username"}, status=400)
            else:
                user = UserModel.objects.create(username=uuid.uuid4(), first_name=name)
                user.save()
                room.users.add(user)
                room.save()
                login(request, user)
        except:
            return JsonResponse(data={"msg": "Some Error Occured"}, status=400)

        return JsonResponse(data={"msg": "Successfull!"})


# User logout and removed from the room
@login_required(login_url='/')
def user_logout(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        room_name = body['room']
        user = request.user
        room = RoomModel.objects.get(room_name=room_name)
        room.users.remove(user)
        logout(request)

        return JsonResponse(data={"msg": "Successfull!"}, status=200)


# Render room
@login_required(login_url='lobby')
def room(request, room_name):
    return render(request, 'collab_editor/room.html', {'room_name': room_name})


# Execute the source code
def run_code(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        source_code = body['sourceCode']
        language = body['language']
        code_input = body['codeInput']
        data = {
            'source': source_code,
            'lang': language,
            "input": code_input,
            'time_limit': MAX_TIME_LIMIT,
            'memory_limit': MAX_MEMORY_LIMIT,
        }
        response = requests.post(CODE_EVALUATION_URL, data=data, headers={
                                 "client-secret": CLIENT_SECRET})
        response_data = response.json()
        compile_results = response_data['result']['compile_status']
        status_update_url = response_data['status_update_url']

        while compile_results == 'Compiling...':
            if language == 'JAVA':
                time.sleep(MAX_TIME_LIMIT)
            else:
                time.sleep(EVERY_RESULT_REQUEST_TIME)
            response = requests.get(status_update_url, headers={
                                    "client-secret": CLIENT_SECRET})
            
            compile_results = response.json()['result']['compile_status']

        results = response.json()['result']['run_status']

        if results['status'] == 'AC':
            s3_url = results['output']
            execution_result = requests.get(s3_url)
            return JsonResponse({"code": 0, "msg": "Successfully ran code", "results": execution_result.text}, status=200)
        elif results['status'] == 'CE':
            return JsonResponse({"code": 2, "msg": "Compilation error"}, status=200)
        elif results['status'] == 'RE':
            return JsonResponse({"code": 1, "msg": "Could not execute the code", "results": results['stderr']}, status=200)
        else:
            return JsonResponse({"code": -1, "msg": compile_results}, status=200)