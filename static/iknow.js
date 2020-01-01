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
var hidden_limit = 4;

// 控制隐藏层内盒子的数量
var canvas_limit = 8;

// 控制line flow;
var flowID = null;
var flowState = true;
var flowSpeed = 0.5;

// cnn网络结构的config参数;计算每个层内需要计算的fmap数量
var cnnConfig = [];

// 更新output结果所需的参数
var topScore;
var topClass;
var error;

// flag变量，判断是否提交了计算
var clickPlay = false;
// flag变量，判断是否提交并完成了计算
var finPredict = false;
// flag变量，判断是否选择了样本
var caseChoose = false;

// 图片放大区域的对象
var imgShow = $("#lineChart img");
// 图像放大区域目前的图片编号
var ShowIndex = -1;
// 上一次点的图片 原图为true, heatmap为false
var ShowType = null;

// 判断这次点击是否来自roll和del按钮
var reClick = false;
var clickBefore;
var layerBefore;

// 访问计算进度的变量
var askCode = parseInt(myRandom(100000, 999999));
var barwidth = 0;

// 设定link line的透明度下限
var opac_limit = 0.5;

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
        $(ele).animate({"stroke-width": myRandom(0.5, 4), "opacity": myRandom(0.2, 1)}, 1000)
    })
}

// 更新output列的结果
// 实现output结果动画效果的函数
function updateBar(dataup, dataClass) {
        // 设定svgBar的宽度参数
        var svgh = 50;
        var racth = 15;
        var barx = 0;
        var index_for_show = {
            0: 'Plane', 1: 'Car', 2: 'Bird', 3: 'Cat', 4: 'Deer',
            5: 'Dog', 6: 'Frog', 7: 'Horse', 8: 'Ship', 9: 'Truck'
        };

        for(i=0; i<(dataup.length); i+=1){
            var bar = d3.select("#heatMap svg:nth-child(" + (i+1) + ")");
            bar.selectAll("rect")
                .data(dataup[i])
                .attr("x", barx)
                .attr("y", (d,i) => i*racth + i*(svgh - 3*racth)*0.5)
                .attr("rx", 5)
                .attr("width", d => d)
                .attr("height", racth);
            bar.selectAll("text")
                .data(dataup[i])
                .text((d,j) => index_for_show[dataClass[i][j]] + ' ' + d + "%")
                .attr("x", (d,j) => dataup[i][j] + 2)
                .attr("y", (d,j) => 14.5*(j+1)+j*1)
                .attr("font-size", "12px")
                .attr("fill", "black");
        }
    };
// 更新output的结果
function showResult(dataRaw, dataClass) {
    //console.log('dataRaw in fn', dataRaw);
    //console.log('dataClass in fn', dataClass);
        // 设定svgBar的宽度参数
        var barx = 0;
        var maxX = 0;
        var dataUpdate = [];
        var index_for_show = {
            0: 'Plane', 1: 'Car', 2: 'Bird', 3: 'Cat', 4: 'Deer',
            5: 'Dog', 6: 'Frog', 7: 'Horse', 8: 'Ship', 9: 'Truck'};

        // 生成一个形状和dataRaw一样的0数组
        for(i=0; i<dataRaw.length; i+=1){
        dataUpdate.push([0,0,0]);
    };

        // 传入一组初始dataupdate更新一次svgBar
        for(i=0; i<dataRaw.length; i+=1) {
        d3.select("#heatMap svg:nth-child(" + (i + 1) + ")")
            .selectAll("rect")
            .data(dataRaw[i])
            .enter()
            .append("rect")
            .attr("x", barx)
            .attr("y", 0)
            .attr("rx", 0)
            .attr("width", 0)
            .attr("height", 0)
            .attr("fill", d => "rgba(255,134,0," + d / 60 + ")");
        // 创建文本元素，描述对应柱状图的分类
        d3.select("#heatMap svg:nth-child(" + (i + 1) + ")")
            .selectAll("text")
            .data(dataClass[i])
            .enter()
            .append("text")
            .text(d => index_for_show[d])
            .attr("x", 0)
            .attr("y", (d, j) => 14.5 * (j + 1) + j * 1)
            .attr("font-size", "12px")
            .attr("fill", "black");
    };

        // 循环生成控制svgBar的数组
        var creatBar = setInterval(function () {
        // 关闭定时器的条件
        if(maxX > 200){
            clearInterval(creatBar);
            // console.log('clock remove');
        }
        // 更新dataUpdate的数据
        for(i=0; i<dataRaw.length; i+=1){
            for(j=0;j<3;j+=1){
                if(dataUpdate[i][j] < dataRaw[i][j]){
                    dataUpdate[i][j] = dataUpdate[i][j] + 1;
                }
            }
        }
        // 更新一次svgBar
        updateBar(dataUpdate, dataClass);
        maxX += 1;
        }, 25);
    };

// 询问计算进度
function askProgress(){
    $.ajax({
        url: "/askProgress/",
        method: 'POST',
        data: {"askCode": askCode},
        success: function (data) {
            barwidth = parseInt(data["Progress"]);
        }
    })
};

// 只显示和第sample_label相连的link line
// 如果预测完成，则会根据预测结果的对错改变线条的宽度和透明度
function showSampleLink(sample_label) {
    // 判断是否已经选择过样本
    if (caseChoose == false) {
        // console.log("haven't choose sample");
        return null
    }

    // 如果预测完成，则改变线的样式
    if (finPredict) {
        var state = $.inArray(sample_label - 1, error);
        var tcs = topClass[sample_label - 1][0];

        // state == -1表示预测结果正确(即sample_label-1不在error内) 显示蓝色
        if (state == -1) {
            var link = $(".link-layers path");
            link.each(function (index, ele) {
                var opac = tcs/100;
                if(opac <= opac_limit){
                    opac=0.5
                }
                $(ele).css({"stroke": "#0877BD"});
                $(ele).css({"stroke-width": (tcs / 100) * 4, "opacity": opac});
            });
            // 判断预测结果是否正确，预测结果正确则显示蓝色线，错误则显示橙色线
        }
        else {
            var link = $(".link-layers path");
            link.each(function (index, ele) {
                var opac = tcs/100;
                if(opac <= opac_limit){
                    opac=0.5
                }
                $(ele).css({"stroke": "#FA8600"});
                $(ele).css({"stroke-width": (tcs / 100) * 4, "opacity": opac});
            });
        }
    }
    // console.log('test');

    // 隐藏input到第一层hidden之间的线
    // 计算input层到第一个hidden层之间link的数量pathNum
    var sample_index = sample_label - 1;
    var caseNum = package.length;
    var canvasNum = $("#hidden0 .canvas").length;
    var pathSum = caseNum * canvasNum;

    // 计算需要显示的线的编号
    var showPath = [];
    for (i = 1; i <= canvasNum; i += 1) {
        var pathNum = sample_index * canvasNum + i;
        showPath.push(pathNum);
    }
    ;
    // 隐藏其余的线
    for (i = 1; i <= pathSum; i += 1) {
        if ($.inArray(i, showPath) != -1) {
            $(".link-layers path:eq(" + (i - 1) + ")").show();
        } else {
            $(".link-layers path:eq(" + (i - 1) + ")").hide();
        }
    }
    ;


    // 隐藏最后一层hidden到output的线
    // 统计每层的canvas数量
    var lastPath = [];
    var showPath = [];
    var canvasNum = [];
    $(".net-layer-father .layer-hidden").each(function (index, ele) {
        canvasNum.push(($(ele).children().length - 1));
    });
    // 计算总共有多少条线
    pathSum = caseNum * canvasNum[0] + caseNum * canvasNum[canvasNum.length - 1];
    for (i = 0; i < (canvasNum.length - 1); i += 1) {
        pathSum = pathSum + canvasNum[i] * canvasNum[i + 1]
    }
    ;
    // 计算最后一层所有线的编号存入lastPath
    var lastLen = caseNum * ($(".net-layer-father .layer-hidden:last .canvas").length);
    var lastStartNum = pathSum - lastLen + 1;
    for (i = lastStartNum; i <= pathSum; i += 1) {
        lastPath.push(i)
    }
    // 计算最后一层需要显示的线存入数组showPath
    var lastCanvasNum = canvasNum[canvasNum.length - 1]; // 最后一层隐藏层神经元的个数
    for (i = 0; i < lastCanvasNum; i += 1) {
        showPath.push(lastPath[sample_index + caseNum * i])
    }
    ;

    // 隐藏最后一层showPath内包含的编号之外的线
    for (i = 1; i <= lastPath.length; i += 1) {
        if ($.inArray(lastPath[i], showPath) == -1) {
            $(".link-layers path:eq(" + lastPath[i - 1] + ")").hide();
        } else {
            $(".link-layers path:eq(" + lastPath[i - 1] + ")").show();
            // console.log('keepline in lastPath', lastPath[i]);
        }
        if (sample_label != 1) {
            $(".link-layers path:eq(" + (lastPath[0] - 1) + ")").hide();
        } else {
            $(".link-layers path:eq(" + (lastPath[0] - 1) + ")").show();
        }
    };
};

// 提交package，进行计算
$("#play-pause-button").click(function () {
    if(caseChoose==true && clickPlay==false) {
        // 在所有hidden的canvas中加入loading动画
        $(".layer-hidden .canvas").each(function (index, ele) {
           $(ele).append($(".loader").clone().attr("class", "load" + index).show());
        });

        // 改变状态量clickPlay，激活线条流动，显示所有link line
        var links = $(".link-layers path");
        links.each(function (index, ele) {
                //$(ele).css({"stroke": "#0877BD"});
                $(ele).show();
            });

        //改变clickPlay的状态值，激活所有link line的流动
        clickPlay = true;
        runFlow();

        // 计算cnn的网络结构参数
        $(".layer-hidden").each(function (layer_index, layer) {
            var lnum = $("#hidden" + layer_index + " " + ".canvas").length;
            if (lnum != 0) {
                cnnConfig.push(lnum);
            }
        });

        // 计算预计消耗时间 有点麻烦 还没写好
        // var timeUsed = 0;
        // var fmapSum = 0;
        // for(i=0; i<cnnConfig.length; i+=1){
        //     fmapSum = fmapSum + cnnConfig[i];
        // }
        // timeUsed = fmapSum * package.length * 0.03 + (package.length) * 0.5 + 1.5;

        // 打印提交计算的信息
        //console.log('package-inf:', package);
        //console.log('netStructure:', cnnConfig);
        $.ajax({
            url: '/iknowPredict/',
            method: 'POST',
            data: {'package': JSON.stringify(package), 'config': JSON.stringify(cnnConfig), 'askCode': askCode},
            success: function (data) {
                var result = data['result'];
                error = data['error'];
                topScore = data['topScore'];
                topClass = data['topClass'];
                fmap = data['fmap'];
                // console.log("error info", error);
                // console.log('topScore', topScore);
                // console.log('topClass', topClass);

                // 根据预测结果改变输出层样式
                $(".layer-output div").each(function (index, ele) {
                    // 计算样本编号
                    var sample_label = parseInt($(ele).attr("data-index"));
                    var sample_index = sample_label - 1;
                    // 改变盒子的背景图为cam图
                    if ($.inArray(index, error) != -1) {
                        // 如果index在error内，则改变改变对应盒子的背景和边框为橙色，否则改为绿色
                        //$(ele).animate({borderColor: '#DD532D'}, 500).css("background-image", "url(" + fmap[sample_index][3] + ")");
                        $(ele).css("background-image", "url(" + fmap[sample_index][3] + ")");
                    } else if (index < result.length) {
                        //$(ele).css({"background-color": "#8AC007", "border-color": "#8AC007"});
                        //$(ele).animate({borderColor: '#8AC007'}, 500).css("background-image", "url(" + fmap[sample_index][3] + ")");
                        $(ele).css("background-image", "url(" + fmap[sample_index][3] + ")");
                    }
                });

                // 根据输出结果创建svg层并绘制直方图
                showResult(topClass, topScore);
                finPredict = true;

                // 运算结束，移除load动画
                //console.log('empty svg load');
                $(".layer-hidden .canvas").each(function (index, ele) {
                    $(ele).empty($("svg"));
                });

                // 显示第一个样本的结果
                $(".layer-input .canvas-1").click();

            }
        })
    }
});

// 点击样本图片显示特征图
$(".layer-input").on('click', function (ele) {
        // 防错：判断是否点击失误，如果没有点击到canvas则直接退出
        if($(ele.target).attr("data-index")==undefined){
            return false;
        };

        // 计算样本编号
        var sample_label = parseInt($(ele.target).attr("data-index"));
        var sample_index = sample_label - 1;
        // 如果已经完成计算则在神经元内显示特征图
        if (finPredict) {
            // 显示所选样本的所有特征图
            $(".layer-hidden").each(function (layer_index, layer) {
                $("#hidden" + layer_index + " " + ".canvas").each(function (canvas_index, canvas) {
                    //$(canvas).text(layer_index + '_' + canvas_index);
                    $(canvas).css("background-image", "url(" + fmap[sample_index][2][layer_index][canvas_index] + ")");
                })
            });
        };
        // console.log('sample_label', sample_label);
        // 显示和样本sample_label有关的所有link线条
        showSampleLink(sample_label);
        // console.log('12132');

        // 在放大区域显示图片
        var imgPath = $(ele.target).css("background-image");
        if (imgPath.length > 4) {
            imgPath = imgPath.split('/static');
            imgPath = '/static' + imgPath[1];
            imgPath = imgPath.split('\"')[0];
            imgShow.attr("src", imgPath);
            ShowIndex = sample_label;
            ShowType = true;
        }
    });

// 点击output的heatmap放大图片
$(".layer-output").on('click', function (ele) {
        // 在放大区域显示图片
        var sample_label = parseInt($(ele.target).attr("data-index"));
        var imgPath = $(ele.target).css("background-image");
        if (imgPath.length > 4) {
            imgPath = imgPath.split('/static');
            imgPath = '/static' + imgPath[1];
            imgPath = imgPath.split('\"')[0];
            imgShow.attr("src", imgPath);
            ShowIndex = sample_label;
            ShowType = false;
        }
    });

// 点击imgShow切换回原图或者heatMap
$('#lineChart img').on('click', function () {
        if (finPredict && ShowIndex != -1) {
            if (ShowType == true) {
                //上一次点的原图，切换为heatmap
                var imgPath = $(".layer-output .canvas-" + ShowIndex).css("background-image");
                imgPath = imgPath.split('/static');
                imgPath = '/static' + imgPath[1];
                imgPath = imgPath.split('\"')[0];
                imgShow.attr("src", imgPath);
                ShowType = false;
            } else {
                //上一次点的heatmap，切换为原图
                var imgPath = $(".layer-input .canvas-" + ShowIndex).css("background-image");
                imgPath = imgPath.split('/static');
                imgPath = '/static' + imgPath[1];
                imgPath = imgPath.split('\"')[0];
                imgShow.attr("src", imgPath);
                ShowType = true;
            }
        }
    });

// 点击featureMap显示在imageShow里
$(".net-layer-father").on('click', function (ele) {
        var imgPath = $(ele.target).css("background-image");
        if (imgPath.length > 4) {
            imgPath = imgPath.split('/static');
            imgPath = '/static' + imgPath[1];
            imgPath = imgPath.split('\"')[0];
            imgShow.attr("src", imgPath);
        }
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
                caseChoose = true;
                // 用于input层显示的图片地址
                image_src = data['src'];

                // 用于计算的样本描述信息
                package_str = data['str'];

                // 改变input层对应canvas的背景图片
                $('.layer-input .canvas-' + clickNum).css("background-image", "url(" + image_src + ")");

                // 改变input层对应label的标签名字
                // 显示del和roll的icon图标
                $(".label-control button").val(clickNum);
                $('.input_label .label' + clickNum)
                    .text(class_index[value])
                    .append($(".label-control")
                        .clone()
                        .attr("class", "lc")
                        .show());

                // 将package_str放入package列表中
                package[clickNum - 1] = package_str;
                //console.log('clickNum start', clickNum);
                // 计数器clickNum + 1
                clickNum = parseInt(clickNum);
                layerNum = parseInt(layerNum);
                clickNum += 1;
                layerNum += 1;
                //console.log('clickNum end', clickNum);
                if (clickNum == 7) {
                    clickNum = 1;
                    layerNum = 7;
                }
                // 解决没有增加hidden layer就直接连接input和output的bug
                if (layer_num != 2) {
                    updateLink();
                }
                //console.log('clickNum from fn', clickNum);

                // 如果这次点击来自roll和del按钮，则复原clickNum和layerNum的数值
                if (reClick) {
                    clickNum = clickBefore;
                    layerNum = layerBefore;
                    updateLink();
                    reClick = false;
                }
                //console.log("package after choose", package);
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
                        caseChoose = true;
                        var father = $(".net-layer-father").children();
                        var layer_num = father.length;
                        var imgPath = data['imgPath'];
                        var package_str = data['fileName'];
                        //console.log(imgPath);
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
                        if (layer_num != 2) {
                            updateLink();
                            //console.log("layer_num has been update");
                        }
                    }
                });
            })
        });
    });


// 控制hidden layers的增减
$(".hidden-layer-plus").on('click', function () {
        if (clickPlay == false) {
            if (hidden_num === hidden_limit) {
                hidden_num = hidden_limit;
            } else {
                $(".net-layer-father .layer-output").before($("#hidden").clone().attr("id", "hidden" + hidden_num).show());
                hidden_num += 1;
            }
            ;
            updateLink();
        }
    });
$(".hidden-layer-minus").on('click', function () {
        if (clickPlay == false) {
            if (hidden_num === 0) {
                hidden_num = 0;
            } else {
                if (hidden_num == 1) {
                    updateLink();
                } else {
                    hidden_num -= 1;
                    $("#hidden" + hidden_num).remove();
                }
            }
            ;
            updateLink();
        }
    });

// 控制单行内canvas的增减
$(".net-layer-father").on('click', '.hidden-btn-plus', function () {
        if (clickPlay == false) {
            var canvas = $(this).parent().siblings("div");
            var canvas_num = canvas.length;
            if (canvas_num === canvas_limit) {
                return;
            } else {
                $(canvas[canvas_num - 1]).after($(".sample div").clone().show())
            }
            updateLink();
        }
    });
$(".net-layer-father").on('click', '.hidden-btn-minus', function () {
        if (clickPlay == false) {
            var canvas = $(this).parent().siblings("div");
            var canvas_num = canvas.length;
            if (canvas_num === 2) {
                return;
            } else {
                $(canvas[canvas_num - 1]).remove();
            }
            updateLink();
        }
    });

// 拖动imgShow的range条放大图片
$(".slider").on('input', function () {
        var imgSize = this.value + 'px';
        imgShow.css({"width": imgSize, "height": imgSize})
    });

// 直接生成2层结构的网格
$(document).ready(function () {
        $(".hidden-layer-plus").click().click();
    });

// 点击样本旁边的icon进行样本的删除和重选择
$("#network .ulf").on('click', 'button', function (ele) {
        var type = $(ele.target).attr('class');
        var val = this.value; // 盒子的位置编号
        // 类索引号 classType
        // {1: 'Plane', 2: 'Bird', 3: 'Car', 4: 'Cat', 5: 'Deer',
        // 6: 'Dog', 7: 'Frog', 8: 'Horse', 9: 'Ship', 10: 'Truck'}
        // 点击roll时重选
        if (clickPlay == false) {
            if (type == 'roll') {
                var choseIndex = {10: 0, 8: 1, 1: 2, 4: 3, 2: 4, 5: 5, 6: 6, 7: 7, 9: 8, 3: 9};
                var classType = package[val - 1];
                classType = classType.split("_")[0];
                var clickPos = choseIndex[classType];
                var clickObj = $(".dataset-list button");
                clickBefore = clickNum;
                layerBefore = layerNum;
                clickNum = val;
                layerNum = val;
                reClick = true;
                clickObj[clickPos].click();
            }
            ;

            // 点击del时删除
            if (type == 'del') {
                //console.log("clickNum before", clickNum);
                var inputDiv = $(".layer-input div");
                var inputLabel = $(".ulf li");

                // 克隆并删除选中盒子的行内样式
                var delDiv = $(inputDiv[val - 1]).removeAttr("style").clone();
                var delLabel = $(inputLabel[val - 1]).text("Sample").clone();

                // 克隆并删除所选盒子之后的所有盒子
                // afterDiv：input层的div
                // afterLabel: input label层的div
                var afterDiv = inputDiv.slice(val).clone();
                var afterLabel = inputLabel.slice(val).clone();
                $(inputDiv.slice(val - 1)).remove();
                $(inputLabel.slice(val - 1)).remove();

                //console.log('val', val);
                // 将克隆的盒子插入所选盒子之前的盒子后面
                if (val > 1) {
                    //console.log("into if");
                    $(inputDiv[val - 2]).after(afterDiv);
                    $(".layer-input").append(delDiv);

                    $(inputLabel[val - 2]).after(afterLabel);
                    $(".ulf").append(delLabel);
                } else {
                    //console.log('into else');
                    $(".layer-input").append(afterDiv).append(delDiv);
                    $(".ulf").append(afterLabel).append(delLabel);
                }

                var nextDiv = 0;
                // 对layer-input的所有盒子进行重排序
                $(".layer-input div").each(function (index, ele) {
                    $(ele).attr("class", "canvas-" + (index + 1)).attr("data-index", index + 1);
                    if ($(ele).css("background-image").length == 4) {
                        nextDiv += 1;
                    }
                    ;
                });

                // 对input_label的所有盒子进行重新排序
                $(".ulf li").each(function (index, ele) {
                    $(ele).attr("class", "label" + (index + 1))
                });

                // 对input_label中button的value进行重排序
                $(".ulf li button").each(function (index, ele) {
                    var value = 1 + Math.floor(index / 2);
                    ele.value = value;
                });

                // 调整clickNum的数字，使得下次选择样本时会正确的存入对应的div
                clickNum = (6 - nextDiv) + 1;
                layerNum = (6 - nextDiv) + 1;
                updateLink();

                // 删除icon图标
                var delIcon = $(".ulf li").slice(6 - nextDiv);
                delIcon.each(function (index, ele) {
                    $(ele).text("Sample")
                });

                // 删除package内对应的元素
                // console.log(val);
                package.splice(val - 1, 1);
                // console.log('package info after del', package);
                //console.log("clickNum after", clickNum);
            }
        }
    });


// 网页重置
$("#reset-button").on("click", function () {
        // 网格和线的参数
        // console.log('重置网页');

        // 清除控制网络流动的计时器
        clearInterval(flowID);

        // 重置全局变量
        clickNum = 1;
        layerNum = 1;
        package = [];
        // 控制line flow;
        flowID = null;
        flowState = true;
        flowSpeed = 0.5;
        // cnn网络结构的config参数;计算每个层内需要计算的fmap数量
        cnnConfig = [];
        // 更新output结果所需的参数
        topScore = null;
        topClass = null;
        // flag变量，判断是否提交了计算
        clickPlay = false;
        // flag变量，判断是否提交并完成了计算
        finPredict = false;
        // flag变量，判断是否选择了样本
        caseChoose = false;
        // 图像放大区域目前的图片编号
        ShowIndex = -1;
        // 上一次点的图片 原图为true, heatmap为false
        ShowType = null;
        // 判断这次点击是否来自roll和del按钮
        reClick = false;
        clickBefore = null;
        layerBefore = null;
        // 控制隐藏层的数量
        hidden_num = 0;
        hidden_limit = 4;
        // 控制隐藏层内盒子的数量
        canvas_limit = 8;
        // 访问计算进度的变量
        askCode = parseInt(myRandom(100000, 999999));
        barwidth = 0;

        // 重置隐藏层
        $(".net-layer-father .layer-hidden").remove();
        $(".hidden-layer-plus").click().click();
        // 重置input
        $(".layer-input div").each(function (index, ele) {
            $(ele).removeAttr("style");
        });
        // 重置icon和sample
        $(".ulf li").each(function (index, ele) {
            $(ele).text("Sample");
        });
        // 重置output内的图片
        $(".layer-output div").each(function (index, ele) {
            $(ele).removeAttr("style");
        });
        // 重置imageShow的图片
        imgShow.attr("src", "/static/database/fmap/sample/husky1.jpg");
        $("#lineChart .slider").val(66);
        imgShow.css({"width": "66px", "height": "66px"});
        // 清空heatmap内的特征图
        $("#heatMap svg").each(function (index, ele) {
            $(ele).empty();
        });
        // 清除进度条长度
        $("#bar").animate({width: (0 + "%")}, 200);

    });

// 进度条
// 服务器端使用全局变量更新计算进度的方案有点问题，暂时使用var temp来造一个假的进度条动画
$("#play-pause-button").on("click", function () {
        // console.log(caseChoose, clickPlay);
        console.log("process have been change");
        if (caseChoose == true && clickPlay == true) {
            var bar = $("#bar");
            var temp = 0;
            var temp_limit = parseInt(myRandom(45, 70));
            // 设定定时器 每隔固定时间访问一次服务器，凭askCode获取对应的计算进度
            var progress = setInterval(function () {
                // #########################临时解决方案#################################
                // 临时解决方案，temp的值在barwidth没到100前不会超过100
                askProgress();
                if(temp<=temp_limit && barwidth<100){
                    temp += 10;
                };
                if(barwidth == 100){
                    temp = 100;
                }
                bar.animate({width: (temp + "%")}, 200);
                // #########################临时解决方案#################################
                // 当计算进度达到100%清除计时器
                if (barwidth >= 100) {
                    //改变Process的文字为Successful
                    $("#epochBox .label").text("Complete").css("color", "#F59628");
                    clearInterval(progress);
                }
            }, 200);
        }
    });

// 点击to-manual按钮滚动到文档部分
$(".to-manual").on("click", function () {
    console.log('123');
    $("body").animate({"scrollTop": 0}, 2000);
    window.scrollTo({
        top: 800,
        behavior: "smooth"
    });
});
$(".contactMe").on("click", function () {
    console.log('222');
    $("body").animate({"scrollTop": 0}, 2000);
    window.scrollTo({
        top: 1800,
        behavior: "smooth"
    });
});

// 切换中英文
$(".translate").on("click", function (ele) {
    var language = ele.target.innerText;
    if(language != "En"){
        $("#article-text").css("height", "1450px");
        $(".intro-h2").text("这个网站是干嘛的");
        $(".intro-p").html("卷积神经网络和其他的深度网络已经能帮助人们完成各种与计算机视觉相关的任务。例如图像识别，目标检测等等。虽然" +
        "这些深度神经网络在预测结果和准确率上已经非常不错了，但是我们很难对目前的深度网络做出解释。简单来说，我们不知道那些神经元对一张输入" +
            "图片到底做了什么。<br><br>" + "举个栗子，假设你现在给计算机一张猫的图片，计算机一顿计算，然后告诉你，嗯！我觉得这是一张猫的图片。" +
            "那么计算机做出这个判断的依据是什么呢？如果计算机告诉你，它觉得这是一张狗的图片，那么计算机做出错误判断的依据又是什么呢？" +
            "再举个栗子，对于计算机来说，判断一张图片是猫还是狗，比判断它是飞机还是鸟要难的多！原因是什么呢？(您可以在这个小破站上进行一些探索。在左侧的DATA栏选择几张猫和狗的图片，再选择几张飞机和鸟的图片，比较下计算机预测的准确率)" +
            "<br><br>");
        $(".howToUseH").html("怎么使用这个网站");
        $(".howToUseP").html("如果您曾经使用过Google的<a href='http://playground.tensorflow.org/'>Tensorflow Playground</a>，那么，没错！这个网站其实就是它的卷积神经网络翻版（当然我的小破站比Playground要菜的多~）。<br><br><b>1.</b> 从<b>DATA</b>选择一些样本图片，或者自己随便上传一张；<br><b>2.</b> 在<b>Hidden Layers</b></b>选择想要可视化的卷积核数量；" +
            "<br><b>3.</b> 点击<b>Play</b>按钮提交计算(Hidden Layers的神经元越多计算越慢，神经元数量和预测精度暂时没关系！)；<br><b>4.</b> 在<b>OUTPUT</b>中会显示所选样本的Grad-CAM图（什么是Grad-CAM？举个栗子，你选了一张猫的图片，但是计算机计算" +
            "后认为这是一张狗的图片，那么Grad-CAM图中红色的区域，就是计算机认为这张图片里最像狗的区域。更多细节请参考<a href=\"https://arxiv.org/abs/1610.02391\">Selvaraju的论文</a>）" +
            "<br><b>5.</b> 一个贴心的Gif演示。");
        $(".tips").html("<br><b>PS:</b> 随机生成的图片全部来自cifar-10数据集，没有包含训练集的图片。使用的网络是简化的VGG16。")
    }
    else {
        $("#article-text").css("height", "1600px");
        $(".intro-h2").text("Introduction");
        $(".intro-p").html("Convolutional Neural Networks (CNNs) and other deep networks have enabled unprecedented breakthroughs in a variety of computer vision tasks, from image classification to object" +
            " detection. While these deep neural networks enable superior performance, their lack of" +
            " decomposability into intuitive and understandable components makes them hard to interpret." +
            "<br><br>" + "For example, for an arbitrary input image, the network can give you a predict. But, <b>why they" +
            " predict what they predict?</b> why does the network think this image is a cat and another is a dog?" +
            " when the network fails, how to explain the reason?" + " For another example, compared to cats and dogs, classify airplanes and birds is easier. (You can practice here, select some cat and plane samples from the DATA column on the top-left, and click play to observe the accuracy of classification.");

        $(".howToUseH").html("<br>How to Use This Site?");
        $(".howToUseP").html("If you've used Google's <a href='http://playground.tensorflow.org/'>Tensorflow Playground</a>, right, my poor site just a version of the Convolutional Neural Network (Tensorflow playground is very interesting, he is my role model)." +
        "<br><br><b>1.</b> Select some samples from the <b>DATA</b> column, or upload some images as samples. <br>" +
        "<b>2.</b> Select the number of filters you want to visualize in <b>HIDDEN LAYERS</b>.<br>" +
        "<b>3.</b> Click the <b>Play</b> button to submit the calculation (more filters more calculation time, the number of filters does not affect the prediction result).<br>" +
        "<b>4.</b> When the calculation complete, the Grad-CAM images will be displayed in <b>OUTPUT</b>." +
        "(What is Grad-CAM? A simple analogy, if you chose a cat sample, but your computer brother says, hi, I think it is a dog. Then confidently give you a picture where the most dog-like area on this picture is painted in red. If you want to know more details, you can see <a href=\"https://arxiv.org/abs/1610.02391\">Selvaraju's paper.</a>)<br>" +
        "<b>5.</b> A loving GIF demo.</p>");
        $(".tips").html("<br><b>Tips:</b> Those sample images generated randomly from the cifar-10 dataset not included training images. The neural network used in this site is based on a simplified VGG16.")
    }
});

