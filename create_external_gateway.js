goldApp.controller('create_external_gatewayController', create_external_gatewayController);
goldApp.controller('external_gateway_mgController', external_gateway_mgController);
goldApp.controller('create_http_httpsController', create_http_httpsController);
goldApp.controller('http_https_mgController', http_https_mgController);
goldApp.controller('edit_http_httpsController', edit_http_httpsController);
goldApp.controller('http_https_modalController', http_https_modalController);


function create_external_gatewayController($scope, $http, $state) {

    var domain_vs = {"xxxxxxxxxxxxxxxxx.com": xxxx, "xxxxxxxxxxxxxxxxxxx": xxxx};
    $scope.external_route_env = "UAT";
    $scope.external_route_appid = "";
    $scope.external_route_group = [];
    $scope.external_route_domain = "xxxxxxxxxxxxxxxxx.com";
    $scope.external_route_consumer = "";
    $scope.external_route_consumer_ip = "";
    $scope.external_route_reason = "";
    $scope.group_servers = [];
    $scope.group_info_path = "";
    $scope.group_info_show = false;
    $scope.change_gateway_group = change_gateway_group;
    $scope.search_group = search_group;

    $scope.gateway_env_change = function () {
        $scope.route_group_list = [];
        $scope.external_route_group = {"id": 0, "name": "--输入Appid搜索--"};
        $scope.group_info_path = "";
        $scope.group_servers = [];
        $scope.group_info_show = false;
        search_group();
        if ($scope.external_route_env == "UAT") {
            $scope.external_route_domain = "xxxxxxxxxxxxxxxxxxxxx.com";
        }
        else {
            $scope.external_route_domain = "xxxxxxxxxxxxxxxxxxxxxxxxx.com";
        }
    };

    function search_group() {
        /*根据app和环境获取group的列表*/
        if ($scope.external_route_appid != "") {
            $http.post('/api/other/external_gateway_get_group/', {
                app_id: $scope.external_route_appid,
                "env": $scope.external_route_env
            }).success(function (data) {
                    $scope.route_group_list = data["groups"];
                    if (data["groups"] === undefined || data["groups"].length === 0) {
                        sweetAlert("查无group！")
                    }
                    else {
                        $scope.external_route_group = data["groups"][0];
                        $scope.group_info_show = true;
                        change_gateway_group(data["groups"][0]);
                    }
                }
            );
        }
    }

    function change_gateway_group(data) {
        $scope.external_route_group = data;
        $scope.group_info_path = data["group-virtual-servers"][0]["path"];
        var group_servers = data["group-servers"];
        for (var i in group_servers) {
            if (group_servers.hasOwnProperty(i)) {
                group_servers[i]["host_name"] = group_servers[i]["host-name"]
            }
        }
        $scope.group_servers = group_servers;
    }

    $scope.external_route_apply = function () {
        if ($scope.external_route_consumer == "" || $scope.external_route_reason == "" || $scope.external_route_appid == "" || $scope.external_route_group == []) {
            alert("请填写完整信息");
            return false;
        }
        var consumer_ip_input = $scope.external_route_consumer_ip;
        if (consumer_ip_input.indexOf("，") > -1) {
            alert("供应商ip不能含有中文逗号！");
            return false;
        }
        var consumer_ip = consumer_ip_input.split(",");
        /*通过vs查vs下的group的path列表*/
        var group_path = [];
        var vs_group_path = [];
        $http.post('/api/other/external_gateway_get_vs_group_path/', {
            route_domain: $scope.external_route_domain,
            "env": $scope.external_route_env
        }).success(function (data) {
                for (var g in group_path) {
                    if (group_path.hasOwnProperty(g)) {
                        if (data.indexOf(group_path[g]) > -1) {
                            vs_group_path.append(g);
                        }
                    }
                }
                if (vs_group_path.length > 0) {
                    var vs_group_path_error = "";
                    for (var v in vs_group_path) {
                        if (vs_group_path.hasOwnProperty(v)) {
                            vs_group_path_error += vs_group_path[v];
                            vs_group_path_error += "\n";
                        }
                    }
                    sweetAlert("错误", "group中的path和访问入口中冲突！\n冲突的为：\n" + vs_group_path_error, "error")
                    return false;
                }
                else {
                    var apply_data = {
                        "group_id": $scope.external_route_group.id,
                        "vs_id": domain_vs[$scope.external_route_domain],
                        "path": $scope.group_info_path,
                        "reason": $scope.external_route_reason,
                        "consumer": $scope.external_route_consumer,
                        "consumer_ip": consumer_ip,
                        "rewrite": ""
                    };
                    var check_soa_data = {
                        "app_id": $scope.external_route_appid
                    };
                    $scope.http_https_button = true;
                    $http.post('/api/other/external_gateway_check_soa/', check_soa_data).success(function (data) {
                        $scope.http_https_button = false;
                        if (data["status"] == false) {
                            $http.post('/api/other/external_gateway_apply/', apply_data).success(function (data) {
                                if (data["status"] == true) {
                                    sweetAlert("提交成功");
                                    $state.go("external_gateway_mg")
                                }
                                else {
                                    sweetAlert("提交失败");
                                    $state.go("external_gateway_mg");
                                }
                            })
                        }
                        else {
                            sweetAlert("当前应用是接入到soa的应用，请使用1,2两种接入方式");
                        }
                    })

                }
            }
        );
    }
}


function external_gateway_mgController($scope, $compile, DTOptionsBuilder, DTColumnBuilder, $state) {
    var gateway = this;
    gateway.accept_create = accept_create;
    gateway.accept_retry = accept_retry;
    gateway.refuse = refuse;
    gateway.cancel_create = cancel_create;
    gateway.remove_gateway = remove_gateway;
    gateway.js_admin = false;
    $.ajax({
        type: "GET",
        url: "/api/common/getUserInfo/",
        async: false,
        dataType: 'json',
        success: function (data) {
            gateway.js_admin = data['isSuperuser'];
            gateway.username = data['name'];
        }
    });
    gateway.dtInstance = {};
    gateway.dtOptions = DTOptionsBuilder.fromSource("/api/other/get_external_gateway_apply/").withPaginationType('full_numbers').withOption('createdRow', createdRow).withOption('order', [
        [0, 'desc']
    ]);
    gateway.dtColumns = [
        DTColumnBuilder.newColumn('id').withTitle('ID'),
        DTColumnBuilder.newColumn('applicant').withTitle('申请人'),
        DTColumnBuilder.newColumn('group_id').withTitle('group_id'),
        DTColumnBuilder.newColumn('vs_id').withTitle('vs_id'),
        DTColumnBuilder.newColumn('path').withTitle('path'),
        DTColumnBuilder.newColumn('consumer').withTitle('供应商'),
        DTColumnBuilder.newColumn('consumer_ip').withTitle('供应商IP'),
        DTColumnBuilder.newColumn('rewrite').withTitle('rewrite'),
        DTColumnBuilder.newColumn('reason').withTitle('原因'),
        DTColumnBuilder.newColumn("status").withTitle('状态').renderWith(apply_status),
        DTColumnBuilder.newColumn('create_time').withTitle('创建时间'),
        DTColumnBuilder.newColumn(null).withTitle('操作').renderWith(actionsHtml)
    ];

    function createdRow(row, data, dataIndex) {
        $compile(angular.element(row).contents())($scope);
    }

    function actionsHtml(data, type, full) {
        var base_html = '<div class="dropdown"> <button class="btn btn-success dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"> 操作 <span class="caret"></span> </button>';
        if (gateway.js_admin) {
            if (data.status == 1) {
                base_html += '<ul class="dropdown-menu dropdown-menu-right apply" aria-labelledby="dropdownMenu1"> <li ng-click="gateway.accept_create(' + data.id + ')"><a>受理</a></li> <li  ng-click="gateway.refuse(' + data.id + ')"><a>拒绝</a></li> </ul> </div>';
            }
            else if (data.status == 4) {
                base_html += '<ul class="dropdown-menu dropdown-menu-right apply" aria-labelledby="dropdownMenu1"> <li ng-click="gateway.accept_retry(' + data.id + ')"><a>重试</a></li> </ul> </div>';
            }
            else if (data.status == 3) {
                base_html += '<ul class="dropdown-menu dropdown-menu-right apply" aria-labelledby="dropdownMenu1"> <li ng-click="gateway.remove_gateway(' + data.id + ')"><a>解绑</a></li> </ul> </div>';
            }
            else {
                base_html += '<ul class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenu1"> <li><a>无可用操作</a></li> </ul></div>';
            }
        }
        else {
            if (data.status == 1) {
                if (data.applicant == gateway.username) {
                    base_html += '<ul class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenu1"> <li ng-click="gateway.cancel_create(' + data.id + ')"><a>取消申请</a></li> </ul></div>';
                }
                else {
                    base_html += '<ul class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenu1"> <li><a>无可用操作</a></li> </ul></div>';
                }
            }
            else {
                base_html += '<ul class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenu1"> <li><a>无可用操作</a></li> </ul></div>';
            }
        }
        return base_html;
    }

    function apply_status(data, type, full) {
        var status_dic = {"1": "待审批", "2": "实施中", "3": "已完成", "4": "已失败", "5": "已取消", "-1": "已拒绝", "6": "已解绑"};
        var html = "";
        var info = status_dic[data.toString()];
        if (data == "3") {
            html = '<span class="label label-success">' + info + '</span>';
        }
        else if (data == "2" || data == "5" || data == "-1") {
            html = '<span class="label label-info">' + info + '</span>';
        }
        else if (data == "1") {
            html = '<span class="label label-warning">' + info + '</span>';
        }
        else {
            html = '<span class="label label-danger">' + info + '</span>';
        }
        return html;
    }

    function accept_create(id) {
        $.ajax({
            type: "GET",
            url: "api/other/external_gateway_accept/",
            data: {'apply_id': id},
            dataType: 'json',
            success: function (data) {
                if (data["status"] == true) {
                    sweetAlert("已处理", "", 'success');
                }
                else {
                    sweetAlert("失败", data["content"], 'error');
                }
                $state.go('external_gateway_mg', null, {
                    reload: true
                });
            }
        });
    }

    function accept_retry(id) {
        $.ajax({
            type: "GET",
            url: "api/other/external_gateway_retry/",
            data: {'apply_id': id},
            dataType: 'json',
            success: function (data) {
                if (data["status"] == true) {
                    $.ajax({
                        type: "GET",
                        url: "api/other/external_gateway_accept/",
                        data: {'apply_id': id},
                        dataType: 'json',
                        success: function (data) {
                            if (data["status"] == true) {
                                sweetAlert("已处理", "", 'success');
                            }
                            else {
                                sweetAlert("失败", data["content"], 'error');
                            }
                            $state.go('external_gateway_mg', null, {
                                reload: true
                            });
                        }
                    });
                }

            }
        });
    }

    function refuse(id) {
        $.ajax({
            type: "GET",
            url: "api/other/refuse_external_gateway/",
            data: {'apply_id': id},
            success: function (response) {
                sweetAlert("已拒绝", '', 'success');
                $state.go('external_gateway_mg', null, {
                    reload: true
                });
            }
        });
    }

    function cancel_create(id) {
        $.ajax({
            type: "GET",
            url: "api/other/cancel_external_gateway/",
            data: {'apply_id': id},
            success: function (response) {
                sweetAlert("已取消", '该条申请已被取消', 'success');
                $state.go('external_gateway_mg', null, {
                    reload: true
                });
            }
        });
    }

    function remove_gateway(id) {
        $.ajax({
            type: "GET",
            url: "api/other/remove_external_gateway/",
            data: {'apply_id': id},
            success: function (data) {
                if (data["status"] == true) {
                    sweetAlert("成功", 'success');
                }
                else {
                    sweetAlert(data["content"], 'error');
                }

                $state.go('external_gateway_mg', null, {
                    reload: true
                });
            }
        });
    }
}


function create_http_httpsController($scope, $http, $state, SubEnvService) {
    $scope.external_route_env = "UAT";
    $scope.external_route_appid_domain = "";
    $scope.route_group_list_single_route = [];
    $scope.external_route_group = [];
    $scope.groups_http_https = [];
    $scope.group_info_show = false;
    $scope.env_appid_domain_lable = "Appid/Domain";
    $scope.fat_https_domain_div_show = false;
    $scope.search_group = search_group;
    $scope.fat_https_domain = "";
    $scope.external_route_reason = "";
    $scope.http_https_button = false;
    $scope.route_group_https_change = route_group_https_change;
    var domain_group_id = [];
    var apply_data = {};

    $scope.gateway_env_change = function () {
        $scope.route_group_list = [];
        $scope.external_route_group = {"id": 0, "name": "--输入Appid搜索--"};
        $scope.groups_http_https = [];
        $scope.env_appid_domain_lable = "Appid/Domain";
        $scope.group_info_show = false;
        if ($scope.external_route_env == "FAT") {
            $scope.env_appid_domain_lable = "Appid";
        }
        search_group();
    };

    function route_group_https_change(data) {
        $scope.external_route_group = data;
        if (data["group-virtual-servers"][0]["virtual-server"]["port"] === "80") {
            $scope.fat_https_domain_div_show = true;
        }
        else {
            $scope.fat_https_domain_div_show = false;
        }
    }

    function search_group() {
        /*根据app和环境获取group的列表*/
        if ($scope.external_route_appid_domain != "") {
            $http.post('/api/other/external_gateway_get_group/', {
                app_id: $scope.external_route_appid_domain,
                "env": $scope.external_route_env
            }).success(function (data) {
                    $scope.route_group_list = data["groups"];
                    var need_to_add_http_https = [];
                    for (var i = data["groups"].length; i--;) {
                        var virtual_servers = data["groups"][i]["group-virtual-servers"];
                        if (virtual_servers.length != 2) {
                            need_to_add_http_https.push(data["groups"][i])
                        }
                    }
                    if (need_to_add_http_https.length === 0) {
                        need_to_add_http_https = [{"id": "xxx", "name": "---------没有需要操作的group---------"}];
                        $scope.http_https_button = true;
                    }
                    else {
                        $scope.http_https_button = false;
                    }
                    $scope.route_group_list_single_route = need_to_add_http_https;
                    var check_http_https = need_to_add_http_https[0];
                    $scope.external_route_group = check_http_https;
                    $scope.fat_https_domain_div_show = false;
                    if ($scope.external_route_env === "FAT") {
                        if (check_http_https["group-virtual-servers"][0]["virtual-server"]["port"] === "80") {
                            $scope.fat_https_domain_div_show = true;
                        }
                    }

                    if ($scope.external_route_appid_domain.indexOf(".") > -1) {
                        var domain_select = [
                            {"id": 10000, "name": "操作该Domain下的所有单入口的group"}
                        ];
                        $scope.external_route_group = domain_select[0];
                        $scope.route_group_list_single_route = domain_select;
                        for (var n in need_to_add_http_https) {
                            if (need_to_add_http_https.hasOwnProperty(n)) {
                                domain_group_id.push(need_to_add_http_https[n]["id"])
                            }
                        }
                    }
                    $scope.group_info_show = true;
                    var all_data = data["groups"];
                    /*标注当前状态是否为双入口*/
                    for (var j = all_data.length; j--;) {
                        if (all_data[j]["group-virtual-servers"].length === 2) {
                            all_data[j]["htt_status"] = "双入口:HTTP/HTTPS"
                        }
                        else {
                            if (all_data[j]["group-virtual-servers"][0]["virtual-server"]["port"] === "80") {
                                all_data[j]["htt_status"] = "单入口:HTTP"
                            }
                            else {
                                all_data[j]["htt_status"] = "单入口:HTTPS"
                            }
                        }
                    }
                    $scope.groups_http_https = all_data;
                }
            );
        }
    }

    $scope.external_route_apply = function () {
        if ($scope.external_route_env == "" || $scope.external_route_appid_domain == "" || $scope.external_route_group == {}) {
            alert("请填写完整信息");
            return false;
        }
        if ($scope.external_route_appid_domain.indexOf(".") > -1) {
            apply_data = {
                "env": $scope.external_route_env,
                "group_ids": domain_group_id,
                "reason": $scope.external_route_reason,
                "realdomain": $scope.fat_https_domain + ".zzzzzzzzzzzzzzzzz.com"
            };
        }
        else {
            var apply_external_route_group = $scope.external_route_group;
            var apply_port = apply_external_route_group["group-virtual-servers"][0]["virtual-server"]["port"];
            if ($scope.external_route_env == "FAT" && apply_port === "80") {
                if ($scope.fat_https_domain == "") {
                    alert("请填写域名信息！！");
                    return false;
                }
            }
            apply_data = {
                "env": $scope.external_route_env,
                "group_ids": [$scope.external_route_group.id],
                "reason": $scope.external_route_reason,
                "realdomain": $scope.fat_https_domain + ".xxxxxxxxxxxxxxx.com"
            };
        }
        swal(
            {
                title: "确定绑定吗?",
                text: "当前group：" + $scope.external_route_group.name,
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "确认",
                closeOnConfirm: false,
                showLoaderOnConfirm: true
            },
            function () {
                $http.post('/api/other/http_https_add/', apply_data).success(function (data) {
                    if (data["status"] == true) {
                        sweetAlert("执行成功");
                        $state.go("http_https_mg")
                    }
                    else {
                        sweetAlert("执行失败，请联系QATE");
                        $state.go("http_https_mg");
                    }
                })
            });
    }
}


//弹框(edit_http_httpsController)之前引入的是$modal
function http_https_mgController($scope, $compile, DTOptionsBuilder, DTColumnBuilder, $state, $modal) {
    //此方法是控制Http和Https双入口申请记录页面的js代码
    var http_https = this;
    http_https.dblClickHandler = dblClickHandler;
    http_https.edit = edit;
    http_https.js_admin = false;
    $.ajax({
        type: "GET",
        url: "/api/common/getUserInfo/",
        async: false,
        dataType: 'json',
        success: function (data) {
            http_https.js_admin = data['isSuperuser'];
            http_https.username = data['name'];
        }
    });
    http_https.dtInstance = {};
    http_https.dtOptions = DTOptionsBuilder.newOptions()
        .withOption('ajax', {
            url: "/api/other/get_http_https_apply/",
            type: 'GET'
        })
        .withDataProp('data')
        .withOption('serverSide', true)
        .withPaginationType('full_numbers')
        .withOption('createdRow', createdRow)
        .withOption('rowCallback', rowCallback)
        .withOption('order', [
            [0, 'desc']
        ]);

    // 双击弹出详情的回调
    function rowCallback(nRow, aData) {
        $('td', nRow).unbind('dblclick');
        $('td', nRow).bind('dblclick', function () {
            $scope.$apply(function () {
                http_https.dblClickHandler(aData);
            });
        });
        return nRow;
    }

    function dblClickHandler(aData) {
        var modalInstance = $modal.open({
            templateUrl: 'static/contents/http_https/http_https_modal.html',
            controller: 'http_https_modalController',
            resolve: {
                aData: function () {
                    return aData;
                }
            }
        });
    }

    http_https.dtColumns = [
        DTColumnBuilder.newColumn('id').withTitle('ID'),
        DTColumnBuilder.newColumn('username').withTitle('申请人'),
        DTColumnBuilder.newColumn('env').withTitle('环境'),
        DTColumnBuilder.newColumn('groupid').withTitle('group_id'),
        DTColumnBuilder.newColumn('status_active_vs').withTitle('激活vs').renderWith(apply_status),
        DTColumnBuilder.newColumn('status_bind').withTitle('绑定').renderWith(apply_status),
        DTColumnBuilder.newColumn('status_active_Bind').withTitle('激活绑定').renderWith(apply_status),
        DTColumnBuilder.newColumn('status').withTitle('最终结果').renderWith(apply_status),
        DTColumnBuilder.newColumn('orders_created_time').withTitle('时间')
    ];
    //判断是否是admin用户，如果是admin，则在http_https.dtColumns这个数组中增加(push)一个元素
    if (http_https.js_admin) {
        http_https.dtColumns.push(DTColumnBuilder.newColumn(null).renderWith(actionsHtml).withTitle('Actions'))
    }

    function createdRow(row, data, dataIndex) {
        $compile(angular.element(row).contents())($scope);
    }

    function apply_status(data, type, full) {
        //拼接html  之前后台把状态转换成True和False，这里在html页面把True和False转换成成功和失败来显示出来
        var html = "";
        if (data == "True") {
            html = '<span class="label label-success">' + "成功" + '</span>';
        }
        else if (data == "False") {
            html = '<span class="label label-danger">' + "失败" + '</span>';
        }
        else {
            html = '<span class="label label-warning">' + "未知" + '</span>';
        }
        return html;
    }

    function actionsHtml(data, type, full) {
        var r_html = "";
        if (http_https.js_admin) {
            r_html = '<button type="button" class="btn btn-warning" ng-click="http_https.edit(' + data.id + ')"><i class="fa fa-edit"></i></button>&nbsp;'
        }
        return r_html;
    }

    // angularjs 弹出框 $modal
    function edit(http_https_id) {
        $modal.open({
            templateUrl: 'static/contents/http_https/http_https_edit.html', //templateUrl：弹出窗口的地址
            controller: 'edit_http_httpsController',  //controller：为$modal指定的控制器，初始化$scope，该控制器可用$modalInstance注入
            resolve: {
                http_https_id: function () {
                    return http_https_id;
                }
            }
        });
    }
}

//弹框(edit_http_httpsController)之后引入的是$modalInstance
function edit_http_httpsController($scope, $state, $http, $modalInstance, http_https_id) {
    $http({
        params: {"id": http_https_id},
        method: "GET",
        url: "/api/other/get_http_https_by_id/"
    }).success(function (data, status) {
        $scope.this_http_https = data[0];
    });


    $scope.close = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.http_https_edit_submit = function () {
        $.ajax({
            type: "GET",
            url: "/api/other/http_https_edit_ajax/",
            data: {
                'id': $scope.this_http_https.id,
                'username': $scope.this_http_https.username,
                'env': $scope.this_http_https.env,
                'groupid': $scope.this_http_https.groupid,
                'status_active_vs': $scope.this_http_https.status_active_vs,
                'status_bind': $scope.this_http_https.status_bind,
                'status_active_Bind': $scope.this_http_https.status_active_Bind,
                'status': $scope.this_http_https.status
            },
            success: function (response) {
                if (response == 'success') {
                    console.log(response);
                    sweetAlert('修改成功', '请刷新页面查看', 'success');
                }
                else {
                    sweetAlert('修改失败', '请联系管理员修改', 'error');
                }
                $modalInstance.dismiss('cancel');
                $state.go('http_https_mg', null, {
                    reload: true
                });
            }
        });

    };

    $scope.http_https_delete_submit = function (id) {
        if (confirm("确定删除吗")) {
            $.ajax({
                type: "GET",
                url: "/api/other/http_https_delete_ajax/",
                data: {'id': id},
                success: function (response) {
                    if (response == 'success') {
                        sweetAlert('删除成功');
                    }
                    else {
                        sweetAlert('删除失败');
                    }
                    $modalInstance.dismiss('cancel');
                    $state.go('http_https_mg', null, {
                        reload: true
                    });
                }
            });
        }
    }
}

//控制双击弹窗的Controller
function http_https_modalController($scope, $modalInstance, aData) {
    $scope.close = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.groupid = aData['groupid'];
    $scope.username = aData['username'];
    $scope.content_ = aData["content"];
    // $scope.obj = JSON.parse($scope.content_);   //JSON.parse可能有问题
    if ($scope.content_ == "None"  ){
        $scope.obj_1 = null;
    }
    else{
        $scope.obj_1 = eval("(" + $scope.content_ + ")");
    }
}
