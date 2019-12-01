var class_index = {
    1: 'Plane', 2: 'Bird', 3: 'Car', 4: 'Cat', 5: 'Deer',
    6: 'Dog', 7: 'Frog', 8: 'Horse', 9: 'Ship', 10: 'Truck'
};
var clickNum = 1;

// 解决input层6个盒子由于clickNum重置导致link line不更新的bug
var layerNum = 1;

// ajax请求的package数据
var package = [];

// 控制曲线的偏移
var bias_x =25;
var bias_y =25;

// 控制隐藏层的数量
var hidden_num = 0;
var hidden_limit = 5;

// 控制隐藏层内盒子的数量
var canvas_limit = 8;

// 控制line flow;
var flowID = null;
var flowState = true;
var flowSpeed = 0.5;

// sleep函数;
function sleep(ms) {
    var unixtime_ms = new Date().getTime();
    while(new Date().getTime() < unixtime_ms + ms) {}
}

// random函数
function myRandom(min, max){
    // 返回一个1到5之间的随机数
    var ranNum = Math.random()*max + min;
    return ranNum;

}
// 随机选橙色或者蓝色
function BorO() {
    var ranOpa = Math.random();
    var color = null;
    if(ranOpa>0.5){
        color = "#0877BD";
    }
    else {
        color = "#FA8600";
    }
    return color;
};



// 计算path参数#
function cal_path(start, end, bias_x, bias_y) {
        //偏置bias_x, bias_y,控制线体整体的移动
        // bias_x正，线条往右移动
        // bias_y正，线条往下移动
        var origin_x = $(".link-layers").offset().left - bias_x;
        var origin_y = $(".link-layers").offset().top - bias_y;
        var start_x = start.left - origin_x;
        var start_y = start.top - origin_y;
        var end_x = end.left - origin_x;
        var end_y = end.top - origin_y;
        var mid = (start_x + end_x)*0.5;
        var path_M = "M" + start_x + "," + start_y;
        var path_C1 = "C" + mid + "," + start_y;
        var path_C2 = mid + "," + end_y;
        var path_C3 = end_x + "," + end_y;
        var path = path_M + path_C1 + " " + path_C2 + " " + path_C3;
        return path;
    };
// 绘制一点到层的路径
function linkPart(start_part, end_layer) {
        // 传入jquery对象。start_part：start层中的某一个元素；end_layer：end层的所有元素；
        end_layer.each(function () {
            var start = start_part.offset();
            var end = $(this).offset();
            var path = cal_path(start, end, bias_x, bias_y);
            var line = document.createElementNS("http://www.w3.org/2000/svg", 'path');
            $(".link-layers").append($(line).attr({"d": path, "class": "link-base"}).css("z-index", 1));
        })
    };
// 绘制层到层的路径
function linkAll(start_layer, end_layer, index){
        switch (index) {
            case 0:
                // input层和hidden连接
                var start_set = $(".layer-input div:lt(" + (layerNum-1) + ")");
                // var start_set = start_layer.children();
                var end_set = end_layer;
                break;
            case 1:
                // hidden和hidden连接
                var start_set = start_layer;
                var end_set = end_layer;
                break;
            case 2:
                // hidden和output连接
                var start_set = start_layer;
                // var end_set = end_layer.children();
                var end_set = $(".layer-output div:lt("+ (layerNum-1) + ")");
                break;
            case 3:
                var start_set = start_layer.children();
                var end_set = end_layer.children();
        }
        start_set.each(function () {
            var start_set = $(this);
            linkPart(start_set, end_set)
        })
    };
// 更新一次线条
function updateLink() {
        var father = $(".net-layer-father").children();
        var layer_num = father.length - 1;
        $(".link-layers").empty();

        father.each(function (index, element) {
            // console.log(index);
            // console.log(element);
            if(index == 0 && layer_num){
                //input和hidden的连接
                //console.log('run link 1');
                linkAll($(element), $(father[1]).children().first().siblings(), 0);
            }
            else if(index == layer_num - 1){
                // hidden和output的连接
                //console.log('run link 3');
                linkAll($(father[index]).children().first().siblings(), $(father[layer_num]), 2);
            }
            else if(index == layer_num){
                // output层啥也不连
                //console.log('end link 4');
                return;
            }
            else{
                // hidden和hidden连接
                //console.log('run link 2');
                linkAll($(father[index]).children().first().siblings(), $(father[index+1]).children().first().siblings(), 1);
            }
        })
    };

// 激活线条流动
function activeFlow(){
    var dashOff = $('.link-layers .link-base');
    for(i = 0; i<dashOff.length; i+=1){
        dashOff[i].style.strokeDashoffset -= flowSpeed;
    }
}
function runFlow(){
    if(flowState){
        clearInterval(flowID);
        flowID = setInterval(activeFlow, 50);
        flowState = false;
    }
    else {
        clearInterval(flowID);
        flowState = true;
    }
}
// 改变线条颜色
function randomLineStyle(){
    var link = $(".link-layers path");
    link.each(function (index, ele) {
        $(ele).css({"stroke": BorO});
        $(ele).animate({"stroke-width": myRandom(0.5, 4), "opacity": Math.random()}, 1000)
    })
}

// 提交package，进行计算
$("#play-pause-button").click(function () {
    runFlow();
    randomLineStyle();
    console.log('package-inf:', package);
    $.ajax({
        url: '/iknowPredict/',
        method: 'POST',
        data: {'package': JSON.stringify(package)},
        success: function (data) {
            var result = data['result'];
            var error = data['error'];
            $(".layer-output div").each(function (index, ele) {
                $(ele).text(result[index]);
                if($.inArray(index, error) != -1){
                    // 如果index在error内，则改变改变对应盒子的背景和边框为橙色，否则改为绿色
                    //$(ele).css({"background-color": "#DD532D", "border-color": "#DD532D"});
                    $(ele).animate({backgroundColor: '#DD532D', borderColor: '#DD532D'}, 500);
                }
                else if(index < result.length) {
                    //$(ele).css({"background-color": "#8AC007", "border-color": "#8AC007"});
                    $(ele).animate({backgroundColor: '#8AC007', borderColor: '#8AC007'}, 500);

                }
            })
        }


    })
});


// 点击分类图例，随机挑选样本
$(".dataset-list").on('click', function (event) {
    //target指触发事件的对象
    var father = $(".net-layer-father").children();
    var layer_num = father.length;
    var value = event.target.value;
    $.ajax({
        url: '/random_choose/',
        method: 'POST',
        data: {"r_choose": value, "clickNum": clickNum},
        success: function (data) {
            // 用于input层显示的图片地址
            image_src = data['src'];

            // 用于计算的样本描述信息
            package_str = data['str'];

            // 改变input层对应canvas的背景图片
            $('.layer-input .canvas-' + clickNum).css("background-image", "url(" + image_src + ")");

            // 改变input层对应label的标签名字
            $('.input_label .label' + clickNum).text(class_index[value]);

            // 将package_str放入package列表中
            package[clickNum - 1] = package_str;

            // 计数器clickNum + 1
            clickNum += 1;
            layerNum += 1;
            if (clickNum == 7) {
                clickNum = 1;
                layerNum = 7;
            }
            // 解决没有增加hidden layer就直接连接input和output的bug
            if (layer_num != 2){
                updateLink();
            }
        }
    });
});


// 裁剪并上传图片
$(document).ready(function () {
    // 图片截取选框的样式
    $image_crop = $('#image_demo').croppie({
        enableExif: true,
        viewport: {
            width: 200,
            height: 200,
            type: 'square'
        },
        boundary: {
            width: 300,
            height: 300
        }
    });

    // 获取上传图片文件内容
    $('#upload_image').on('change', function () {
        var reader = new FileReader();
        reader.onload = function (event) {
            $image_crop.croppie('bind', {
                url: event.target.result
            }).then(function () {
                // console.log('jQuery bind complete');
            });
        };
        reader.readAsDataURL(this.files[0]);
        $('#uploadimageModal').modal('show');
    });

    $('.crop_image').click(function (event) {
        $image_crop.croppie('result', {
            type: 'canvas',
            size: 'viewport'
        }).then(function (response) {
            $.ajax({
                //此处的response是通过base64编码的图像数据
                url: "/upload/",
                method: "POST",
                data: {"image": response},
                success: function (data) {
                    var father = $(".net-layer-father").children();
                    var layer_num = father.length;
                    var imgPath = data['imgPath'];
                    var package_str = data['fileName'];
                    console.log(imgPath);
                    //隐藏弹窗
                    $('#uploadimageModal').modal('hide');

                    //在对应的input盒子里 显示裁剪后的图像
                    $('.layer-input .canvas-' + clickNum).css("background-image", "url(" + imgPath + ")");

                    //清除#upload_image内的url值，否则无法重新上传相同的图片
                    $('#upload_image').val("");

                    //往package列表中传入值
                    package[clickNum - 1] = package_str;
                    //更新一次link line
                    // 计数器clickNum + 1
                    clickNum += 1;
                    layerNum += 1;
                    if (clickNum == 7) {
                        clickNum = 1;
                        layerNum = 7;
                    }
                    if(layer_num != 2){
                        updateLink();
                        console.log("layer_num has been update");
                    }
                }
            });
        })
    });
});


// 控制hidden layers的增减
$(".hidden-layer-plus").on('click', function () {
    if(hidden_num === hidden_limit){
        hidden_num = hidden_limit;
    }
    else {
        $(".net-layer-father .layer-output").before($("#hidden").clone().attr("id", "hidden" + hidden_num).show());
        hidden_num += 1;
    }
    updateLink();
});
$(".hidden-layer-minus").on('click', function () {
    if(hidden_num === 0){
        hidden_num = 0;
    }
    else {
        hidden_num -= 1;
        $("#hidden" + hidden_num).remove();
    }
    updateLink();
});

// 控制单行内canvas的增减
$(".net-layer-father").on('click', '.hidden-btn-plus', function () {
    var canvas = $(this).parent().siblings("div");
    var canvas_num = canvas.length;
    if(canvas_num === canvas_limit){
        return;
    }
    else{
        $(canvas[canvas_num - 1]).after($(".sample div").clone().show())
    }
    updateLink();
});
$(".net-layer-father").on('click', '.hidden-btn-minus', function () {
    var canvas = $(this).parent().siblings("div");
    var canvas_num = canvas.length;
    if(canvas_num === 2){
        return;
    }
    else{
        $(canvas[canvas_num - 1]).remove();
    }
    updateLink();
});

// 网络流动
$(".netFlow").click(function () {
    runFlow();
    randomLineStyle();
});