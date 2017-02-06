# coding:utf-8
from django.http import HttpResponse
from apps.vm.models import http_https_log
from django.contrib.auth.decorators import login_required
import requests
import json
import traceback
from django.db.models import Q
import time
import threading

class Change_PortByGroupId(object):
    def __init__(self, groupId_list, env, username,realdomain=None):
        self.groupId_list = groupId_list
        self.env = env
        self.username = username
        self.domain = realdomain
        self.headers = {'content-type': 'application/json'}
        if self.env == 'uat':
            self.query_url = 'http://xxxxxxxxxxxxxxxxxxxxxxx'
            self.bind_url = "http://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        elif self.env == 'fat':
            self.query_url = 'http://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            self.bind_url = "http://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxs"
        else:
            pass

    def get_init_message(self, groupId):  # 获取基本信息
        d = {}
        realenv = ''
        if self.env == 'uat':
            url = 'http://xxxxxxxxxxxxxxxx={}'.format(groupId)
        elif self.env == 'fat':
            url = 'http://xxxxxxxxxxxxxxxxxxxxxxxxxxxx={}'.format(groupId)
        else:
            pass
        a_content = requests.get(url)
        aa = a_content.content
        a_json = json.loads(aa)
        port = a_json['groups'][0]['group-virtual-servers'][0]['virtual-server']['port']  # 从groupId获取到的port
        d['virtual_servers_slb_id'] = a_json['groups'][0]['group-virtual-servers'][0]['virtual-server']['slb-ids'][0]
        domain = a_json['groups'][0]['group-virtual-servers'][0]['virtual-server']['domains'][0]['name']
        virtual_servers_name = a_json['groups'][0]['group-virtual-servers'][0]['virtual-server']['name']
        priority = a_json['groups'][0]['group-virtual-servers'][0]['priority']
        path = a_json['groups'][0]['group-virtual-servers'][0]['path']
        realenv = domain.split('.')[-5].lower()
        if self.env == 'uat':
            url_vses = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx={}'.format(domain)
        elif self.env == 'fat':
            if port == '80' and realenv != 'fws':
                domain = '*.' + realenv + '.xxxxxxxxxx.com'
            else:
                pass
            url_vses = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.format(domain)
        else:
            pass
        a = requests.get(url_vses)
        content = json.loads(a.text)
        total = content['total']  # 从domain获取到的total
        d['port'] = port
        d['priority'] = priority
        d['path'] = path
        d['domains'] = content['virtual-servers'][0]['domains']
        d['virtual_servers_name'] = virtual_servers_name
        d['virtual-servers'] = content['virtual-servers']
        d['total'] = total
        d['realenv'] = realenv
        return d

    def get_new_VS(self, groupId):  # 新建vs并返回vsId
        d = self.get_init_message(groupId)
        dd = {}
        port = d['port']
        realenv = d['realenv']
        if port == '80':
            if realenv == 'uat' or realenv == 'fws':
                virtual_servers_name = d['virtual_servers_name'].split('_')[0] + '_443'
                vs_domains = d['domains']
                if len(d['domains']) == 1:
                    cert_domains = d['domains'][0]['name']
                elif len(d['domains']) >= 2:
                    cert_domains = ''
                    for n in range(len(d['domains'])):
                        cert_domains += d['domains'][n]['name'] + '|'
                    cert_domains = cert_domains[:-1]
            else:
                cert_domains = self.domain
                virtual_servers_name = self.domain + '_443'
                vs_domains = [{"name": self.domain}]
            if self.env == 'uat':
                query1_url = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            elif self.env == 'fat':
                query1_url = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            else:
                pass
            request_body = {
                "cerexp": "xxxxxxxxxxxxxxxx",
                "domain": cert_domains,
                "ticket_name": "xxxxxxxxxxxxxxxxxxxxxxx"
            }
            r = requests.post(query1_url, data=json.dumps(request_body), headers=self.headers).content
            if r == "OK":
                status_certificate = True  # 上传证书状态码
                content_status = 'content_status message normal'
                dd['status_certificate'] = status_certificate
                dd['content_status'] = content_status
            else:
                dd['status_certificate'] = False
                dd['content_status'] = r["message"]
                traceback.print_exc()
            query_url = self.query_url
            payload = {
                "name": virtual_servers_name,
                "version": 1,
                "ssl": True,
                "slb-id": d['virtual_servers_slb_id'],
                "port": "443",
                "domains": vs_domains
            }
            rr = requests.post(query_url, data=json.dumps(payload), headers=self.headers)
            rrb = json.loads(rr.content)
            if rr.status_code == 200:
                if rrb.has_key("id"):
                    vsId = rrb['id']  # 获取vsId
            else:
                return json.dumps(rr.status_code)

        elif port == '443':
            if realenv == 'uat' or realenv == 'fws':
                query_url = self.query_url
                virtual_servers_name = d['virtual_servers_name'].split('_')[0] + '_' + '80'
                payload = {
                    "name": virtual_servers_name,
                    "version": 1,
                    "ssl": False,
                    "slb-id": d['virtual_servers_slb_id'],
                    "port": "80",
                    "domains": d['domains']
                }
                rr = requests.post(query_url, data=json.dumps(payload), headers=self.headers)
                rrb = json.loads(rr.content)
                if rr.status_code == 200:
                    if rrb.has_key("id"):
                        vsId = rrb['id']  # 获取vsId
                else:
                    return json.dumps(rr.status_code)
            else:
                wide_domain = '*.' + realenv + '.xxxxxxxxxxxxxxxxx.com'
                url_vses = 'http://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx={}'.format(wide_domain)
                a = requests.get(url_vses)
                print(url_vses)
                print(a.text)
                content = json.loads(a.text)
                vsId = content['virtual-servers'][0]['id']
        return vsId

    def get_exists_Vsid(self, groupId):  # 已经存在http和https时，获取另一个的vsId
        d = self.get_init_message(groupId)
        port = d['port']
        virtual_servers = d['virtual-servers']
        if port == '80':
            for u in range(len(virtual_servers)):
                if virtual_servers[u]['port'] == '443':
                    vsId = virtual_servers[u]['id']
        elif port == '443':
            for u in range(len(virtual_servers)):
                if virtual_servers[u]['port'] == '80':
                    vsId = virtual_servers[u]['id']
        else:
            return json.dumps('port error')
        return vsId

    def get_active_vs(self, groupId, vsId):  # 激活VS并返回状态码
        da = {}
        if self.env == 'uat':
            active_url = "http://xxxxxxxxxxxxxxxxxxxxxxxxxxxx=" + str(vsId)
        elif self.env == 'fat':
            active_url = "http://xxxxxxxxxxxxxxxxxxxxxxxxxx=" + str(vsId)
        else:
            pass
        rrrd = requests.get(active_url)
        rrr = json.loads(rrrd.content)
        content = rrrd.status_code  # active vs
        if content == 200:
            status_vsId = True
            content_vsId_status = 'content_vsId_status message normal'
            da['status_active_vs'] = status_vsId
            da['content_vsId_status'] = content_vsId_status
        else:
            status_vsId = False
            traceback.print_exc()
            da['status_active_vs'] = status_vsId
            da['content_vsId_status'] = rrr["message"]
        return da

    def bind_Vs_to_Group(self, groupId, vsId):  # 绑定Vs到Group
        d = self.get_init_message(groupId)
        daq = {}
        di22 = {}
        bounds = []
        di22['vs-id'] = vsId
        di22['priority'] = d['priority']
        di22['path'] = d['path']
        di22['rewrite'] = ""
        bounds.append(di22)
        bind_url = self.bind_url
        payload = {"group-id": groupId,
                   "bounds": bounds
        }
        rers = requests.post(bind_url, data=json.dumps(payload), headers=self.headers)
        content_b = rers.status_code
        if content_b == 200:
            status_bind = True
            content_status_bind = 'content_status_bind message normal'
            daq['status_bind'] = status_bind
            daq['content_status_bind'] = content_status_bind
        else:
            status_bind = False
            traceback.print_exc()
            content_status_bind = json.loads(rers.content)['message']
            daq['status_bind'] = status_bind
            daq['content_status_bind'] = content_status_bind
        return daq

    def active_Bind_group(self, groupId):  # 激活绑定的group
        baq = {}
        if self.env == 'uat':
            active_group_url = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx={}".format(groupId)
        elif self.env == 'fat':
            active_group_url = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx={}".format(groupId)
        else:
            pass
        content_qqq = requests.get(active_group_url)
        content_qq = json.loads(content_qqq.content)
        content_ = content_qqq.status_code  # active group
        if content_ == 200:
            status_group = True
            status_group_content = 'status_group_content message normal'
            baq['active_status_group'] = status_group
            baq['status_group_content'] = status_group_content
        else:
            baq['active_status_group'] = False
            baq['status_group_content'] = content_qq["message"]
            traceback.print_exc()
        return baq

    def get_total_to_judge(self, groupId):
        d_end = {}
        d = self.get_init_message(groupId)
        total = d['total']
        if total == 1:
            vsId = self.get_new_VS(groupId)
            status_active_vs = self.get_active_vs(groupId, vsId)
            status_bind = self.bind_Vs_to_Group(groupId, vsId)
            status_active_Bind = self.active_Bind_group(groupId)
            d_end['status_active_vs'] = status_active_vs
            d_end['status_bind'] = status_bind
            d_end['status_active_Bind'] = status_active_Bind
        elif total == 2:
            da = {}
            vsId = self.get_exists_Vsid(groupId)
            da['content_vsId_status'] = 'vsId已存在'
            da['status_active_vs'] = True
            d_end['status_active_vs'] = da
            status_bind = self.bind_Vs_to_Group(groupId, vsId)
            status_active_Bind = self.active_Bind_group(groupId)
            d_end['status_bind'] = status_bind
            d_end['status_active_Bind'] = status_active_Bind
        else:
            status_active_Bind = 'total信息有误'
            d_end['status_active_Bind'] = status_active_Bind
        return json.dumps(d_end)

    def get_end_status(self):
        li_log = []
        for k in self.groupId_list:
            groupId = k
            end1 = self.get_total_to_judge(groupId)
            end = json.loads(end1)
            active_status_group = end['status_active_Bind']['active_status_group']
            status_bind = end['status_bind']['status_bind']
            status_active_vs = end['status_active_vs']['status_active_vs']
            group_st = {}
            if active_status_group is True and status_bind is True and status_active_vs is True:
                status = True
                content = ''
                group_st['status'] = status
                group_st['content'] = content
                group_st['groupId'] = groupId
            else:
                status = False
                content = end
                group_st['status'] = status
                group_st['content'] = content
                group_st['groupId'] = groupId
            http_https_log.objects.create(username=self.username,
                                          status_active_vs=status_active_vs,
                                          env=self.env,
                                          groupid=groupId,
                                          status_bind=status_bind,
                                          status_active_Bind=status_bind,
                                          status=status,
                                          content=json.dumps(content)
            )
            li_log.append(group_st)
            hh_status_end = []
            success_group_num = 0
            all_group_num = len(li_log)
            for h in li_log:
                end_log = {}
                if h['status'] == False:
                    end_log['status'] = False
                    end_log['content'] = h
                    hh_status_end.append(end_log)
                else:
                    success_group_num += 1
                    end_log['status'] = True
                    end_log['content'] = ''
                    hh_status_end.append(end_log)
            final_result = {}
            if all_group_num == success_group_num:
                final_result["status"] = True
            else:
                final_result["status"] = False
            final_result["content"] = hh_status_end
            return json.dumps(final_result)

@login_required
def http_https_add(request):
    try:
        username = request.user.username
        group_ids = json.loads(request.body).get('group_ids')
        env = json.loads(request.body).get('env')
        realdomain = json.loads(request.body).get('realdomain')
        env = env.lower()
        a = Change_PortByGroupId(group_ids, env, username, realdomain)
        a1 = a.get_end_status()
        return HttpResponse(a1)
    except Exception, e:
        traceback.print_exc()
        d = {"status": False, "content": str(e)}
        return HttpResponse(d)


def get_http_https_apply(request):
    try:
        cols = {0: 'id', 1: 'username', 2: 'groupid', 3: 'status_active_vs', 4: 'orders_created_time',
                5: 'status_bind', 6: 'status_active_Bind', 7: 'status', 8: 'env'}
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
            query_list = [Q(status__icontains=get_success_fail_status(keyword)) if get_success_fail_keyword_status(keyword) else
                          Q(username__icontains=keyword) |
                          Q(groupid__icontains=keyword) |
                          Q(status_active_vs__icontains=keyword) |
                          Q(orders_created_time__icontains=keyword) |
                          Q(status_bind__icontains=keyword) |
                          Q(status_active_Bind__icontains=keyword) |
                          Q(env__icontains=keyword) for keyword in keywords_list]
            q = Q()
            for query in query_list:
                q.add(query, Q.AND)
            # print(q, order_by)
            apply_detail_lists = http_https_log.objects.filter(q).order_by(order_by)
            sum = len(apply_detail_lists)
            apply_detail_lists = apply_detail_lists[start:(start + length)]
        else:
            apply_detail_lists = http_https_log.objects.all().order_by(order_by)[start:(start + length)]
            sum = http_https_log.objects.count()
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


# 根据ID获取双入口申请记录信息
def get_http_https_by_id(request):
    result = []
    http_https_id = request.GET.get('id')
    my_vms = http_https_log.objects.filter(id=http_https_id)
    for i in my_vms:
        v_i = i.to_dict()
        result.append(v_i)
    return HttpResponse(json.dumps(result), content_type='application/json')




# 双入口信息编辑
def http_https_edit_ajax(request):
    try:
        id = request.GET.get('id')
        username = request.GET.get('username')
        env = request.GET.get('env')
        groupid = request.GET.get('groupid')
        status_active_vs = request.GET.get('status_active_vs')
        status_bind = request.GET.get('status_bind')
        status_active_Bind = request.GET.get('status_active_Bind')
        status = request.GET.get('status')

        http_https_obj = http_https_log.objects.get(id=id)
        http_https_obj.username = username
        http_https_obj.env = env
        http_https_obj.groupid = groupid
        http_https_obj.status_active_vs = status_active_vs
        http_https_obj.status_bind = status_bind
        http_https_obj.status_active_Bind = status_active_Bind
        http_https_obj.status = status
        http_https_obj.save()
        return HttpResponse('success')
    except:
        traceback.print_exc()
        return HttpResponse('failed')

# 双入口信息删除


def http_https_delete_ajax(request):
    try:
        id = request.GET.get('id')
        http_https_log.objects.get(id=id).delete()
        return HttpResponse('success')
    except:
        return HttpResponse('failed')


def get_success_fail_status(status):
    if status in "成功":
        return True
    elif status in "失败":
        return False
    elif status in "未知":
        return False


def get_success_fail_keyword_status(keyword):
    status_list = ["成功", "失败", "未知"]
    for i in status_list:
        if keyword in i:
            return True
        else:
            flag = "blank"
    return False