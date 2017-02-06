# coding:utf-8
from django.http import HttpResponse
from apps.vm.models import network_segment_nantong
import requests
import json
import traceback
from django.db.models import Q
from apis.common.view import *

@login_required
def get_network_segment_apply(request):
    try:
        cols = {0: 'id', 1: 'network_segment', 2: 'description', 3: 'gateway', 4: 'mask', 5: 'ip_adress_range'}
        draw = request.GET["draw"]
        start = int(request.GET["start"])
        length = int(request.GET["length"])
        order = int(request.GET["order[0][column]"])
        dir = request.GET["order[0][dir]"]
        search = request.GET["search[value]"]
        result = []
        order_by = cols.get(order) if dir == 'desc' else '-' + cols.get(order)
        if search:
            keywords_list = search.split(' ')
            query_list = [
                Q(network_segment__icontains=keyword) |
                Q(description__icontains=keyword) |
                Q(gateway__icontains=keyword) |
                Q(mask__icontains=keyword) |
                Q(ip_adress_range__icontains=keyword) for keyword in keywords_list]
            q = Q()
            for query in query_list:
                q.add(query, Q.AND)
            apply_detail_lists = network_segment_nantong.objects.filter(q).order_by(order_by)
            sum = len(apply_detail_lists)
            apply_detail_lists = apply_detail_lists[start:(start + length)]
        else:
            apply_detail_lists = network_segment_nantong.objects.all().order_by(order_by)[start:(start + length)]
            sum = network_segment_nantong.objects.count()
        for i in apply_detail_lists:
            v_i = i.to_dict()
            result.append(v_i)
        response = {
            "draw": draw,
            "recordsFiltered": sum,
            "recordsTotal": sum,
            "data": result
        }
        return HttpResponse(json.dumps(response))
    except:
        response = {
            "draw": 0,
            "recordsFiltered": 10,
            "recordsTotal": 10,
            "data": []
        }
        traceback.print_exc()
        return HttpResponse(json.dumps(response))


# 网段使用情况信息编辑
def network_segment_edit_ajax(request):
    try:
        id = request.GET.get('id')
        network_segment = request.GET.get('network_segment')
        description = request.GET.get('description')
        gateway = request.GET.get('gateway')
        mask = request.GET.get('mask')
        ip_adress_range = request.GET.get('ip_adress_range')

        network_segment_obj = network_segment_nantong.objects.get(id=id)
        network_segment_obj.network_segment = network_segment
        network_segment_obj.description = description
        network_segment_obj.gateway = gateway
        network_segment_obj.mask = mask
        network_segment_obj.ip_adress_range = ip_adress_range
        network_segment_obj.save()
        return HttpResponse('success')
    except:
        traceback.print_exc()
        return HttpResponse('failed')


# 网段使用情况信息删除
def network_segment_delete_ajax(request):
    try:
        id = request.GET.get('id')
        network_segment_nantong.objects.get(id=id).delete()
        return HttpResponse('success')
    except:
        return HttpResponse('failed')


# 根据ID获取网段使用情况信息
def get_network_segmentbyid(request):
    result = []
    network_segment_id = request.GET.get('id')
    my_vms = network_segment_nantong.objects.filter(id=network_segment_id)
    for i in my_vms:
        v_i = i.to_dict()
        result.append(v_i)
    return HttpResponse(json.dumps(result), content_type='application/json')
