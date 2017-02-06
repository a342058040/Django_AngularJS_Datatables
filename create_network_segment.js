/**
 * Created by zhoupf on 2017/1/11.
 */

goldApp.controller('network_segment_mgController', network_segment_mgController);
goldApp.controller('edit_create_network_segmentController', edit_create_network_segmentController);


function network_segment_mgController($scope, $compile, DTOptionsBuilder, DTColumnBuilder, $state, $modal) {
    //此方法是控制网段使用情况记录页面的js代码
    var network_segment = this;
    network_segment.edit = edit;
    network_segment.js_admin = false;
    $.ajax({
        type: "GET",
        url: "/api/common/getUserInfo/",
        async: false,
        dataType: 'json',
        success: function (data) {
            network_segment.js_admin = data['isSuperuser'];
            network_segment.username = data['name'];
        }
    });
    network_segment.dtInstance = {};
    network_segment.dtOptions = DTOptionsBuilder.newOptions()
        .withOption('ajax', {
            url: "/api/other/get_network_segment_apply/",
            type: 'GET'
        })
        .withDataProp('data')
        .withOption('serverSide', true)
        .withPaginationType('full_numbers')
        .withOption('createdRow', createdRow)
        .withOption('order', [
            [0, 'desc']
        ]);
    network_segment.dtColumns = [
        DTColumnBuilder.newColumn('id').withTitle('ID'),
        DTColumnBuilder.newColumn('network_segment').withTitle('网段'),
        DTColumnBuilder.newColumn('description').withTitle('功能描述'),
        DTColumnBuilder.newColumn('gateway').withTitle('网关'),
        DTColumnBuilder.newColumn('mask').withTitle('掩码'),
        DTColumnBuilder.newColumn('ip_adress_range').withTitle('IP地址范围')
    ];
    //判断是否是admin用户，如果是admin，则在http_https.dtColumns这个数组中增加(push)一个元素
    if (network_segment.js_admin) {
        network_segment.dtColumns.push(DTColumnBuilder.newColumn(null).renderWith(actionsHtml).withTitle('Actions'))
    }

    function createdRow(row, data, dataIndex) {
        $compile(angular.element(row).contents())($scope);
    }
    

    function actionsHtml(data, type, full) {
        var r_html = "";
        if (network_segment.js_admin) {
            r_html = '<button type="button" class="btn btn-warning" ng-click="network_segment.edit(' + data.id + ')"><i class="fa fa-edit"></i></button>&nbsp;'
        }
        return r_html;
    }

    // angularjs 弹出框 $modal
    function edit(network_segment_id) {
        var modalInstance = $modal.open({
            templateUrl: 'static/contents/others/network_segment_edit.html', //templateUrl：弹出窗口的地址
            controller: 'edit_create_network_segmentController',  //controller：为$modal指定的控制器，初始化$scope，该控制器可用$modalInstance注入
            resolve: {
                network_segment_id: function () {
                    return network_segment_id;
                }
            }
        });
    }
}

//弹框(edit_http_httpsController)之后引入的是$modalInstance
function edit_create_network_segmentController($scope, $state, $http, $modalInstance, network_segment_id) {
    $http({
        params: {"id": network_segment_id},
        method: "GET",
        url: "/api/other/get_network_segmentbyid/"
    }).success(function (data, status) {
        $scope.this_network_segment = data[0];
    });


    $scope.close = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.network_segment_edit_submit = function () {
        $.ajax({
            type: "GET",
            url: "/api/other/network_segment_edit_ajax/",
            data: {
                'id': $scope.this_network_segment.id,
                'network_segment': $scope.this_network_segment.network_segment,
                'description': $scope.this_network_segment.description,
                'gateway': $scope.this_network_segment.gateway,
                'mask': $scope.this_network_segment.mask,
                'ip_adress_range': $scope.this_network_segment.ip_adress_range
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
                  $state.go('network_segment_mg', null, {
                    reload: true
                });
            }
        });

    };

    $scope.network_segment_delete_submit = function (id) {
        if (confirm("确定删除吗")) {
            $.ajax({
                type: "GET",
                url: "/api/other/network_segment_delete_ajax/",
                data: {'id': id},
                success: function (response) {
                    if (response == 'success') {
                        sweetAlert('删除成功');
                    }
                    else {
                        sweetAlert('删除失败');
                    }
                    $modalInstance.dismiss('cancel');
                    $state.go('network_segment_mg', null, {
                        reload: true
                    });

                }
            });
        }
    }
}

