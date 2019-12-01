//按钮变量
var clickNum = 1;
var inputBox = document.querySelector('.layer-input');
var hiddenBox = document.querySelector('.layer-hidden');
var outputBox = document.querySelector('.layer-output');
//隐藏层svg
var svg = document.querySelector('.link-layers1');
//输出层svg
var svg_output = document.querySelector('.link-layers2');
var clickFlag = true; //用来判断样本和link-line是否高亮的布尔值
var sampleChoose = false; //用来判断是否已经选择样本;

//点击运行后发送给服务器的package
var package = Array();
var packageBack = null;
var predResult = null;

//事件1：点击选择按钮 - 从数据库随机生成图片 建立盒子之间的link-line
//事件1：点击样本图片 创建link-line 更换背景图片
document.querySelector('.dataset-list').addEventListener('click', function (e) {
    //获取所点击按钮的类(按钮的value属性值)
    var buttonValue = e.target.value;

    //建立input-hidden的line-link
    //获取input-layer起始点的div对象
    var startBox = inputBox.children[clickNum - 1];
    //在整个hidden-layer上循环。将input-layer的当前startBox和hidden-layer的每个box连接。
    for(i=1; i<= hiddenBox.children.length; i+=1){
        buildLink(svg, startBox, hiddenBox.children[i-1]);
    };

    // //建立第二层line-link
    // //获取hiddenBox的起始点div对象
    // var startBox_output = hiddenBox.children[clickNum - 1];
    // //和所有output layer的box建立连接
    // for(i=1; i<= outputBox.children.length; i+=1){
    //     buildLink2(svg_output, startBox_output, outputBox.children[i-1]);
    // };

    //改变图片背景颜色
    changePicture(buttonValue, clickNum);
    sampleChoose = true;
});

//事件3：点击restart按钮刷新页面
document.querySelector('#reset-button').onclick = function(){
    window.location.reload();
    sampleChose = false;
};

//事件4：点击input的盒子，增大加深对应link-line的尺寸和颜色
document.querySelector('#network .layer-input').addEventListener('click', function (e) {
    var canvas = e.target;
    var canvasNum = canvas.getAttribute('data-index');
    if(sampleChoose == false){
        window.alert('Please Select a Sample First');
    }
    else{
        if (clickFlag){
            canvas.style.borderColor = linkColor[canvasNum-1];
            clickFlag = false;
            for(i=(canvasNum-1)*4;i <= canvasNum*4-1; i+=1){
                svg.children[i].style.strokeWidth = '4px';
                svg.children[i].style.stroke = linkColor[canvasNum-1];
            }
        }
        else{
            canvas.style.borderColor = 'black';
            for(i=(canvasNum-1)*4;i <= canvasNum*4-1; i+=1){
                svg.children[i].style.strokeWidth = '2px';
                svg.children[i].style.stroke = linkColorAlpha[canvasNum-1];
            }
            clickFlag = true;
        }
    }

});

//事件5：点击按钮#play-pause-button，向服务器提交计算
$("#play-pause-button").click(function (event) {
    //console.log('发送之前为数组：', $.isArray(package));
    //console.log('发送的数据',package);
    activeFlow();
    $.ajax({
        url: "train.php",
        type: "POST",
        data: {array: JSON.stringify(package)}
        // success: function (data) {
        //     //注意从train返回的是JSON数据，需要翻译
        //     packageBack = JSON.parse(data);
        //     predResult = packageBack.file;
        //     $(".layer-output div").each(function(i){
        //         $(this).text(predResult[i]);
        //     });
        // }
    });
});



//颜色库
var linkColorAlpha = ["rgba(0,0,0,0.5)", "rgba(0,145,200,0.5)","rgba(170,0,165,0.5)",
                 "rgba(40,175,117,0.5)", "rgba(255,0,0,0.3)","rgba(255,115,0,0.5)"];
var linkColor = ["rgb(0,0,0)", "rgb(0,145,200)","rgb(170,0,165)",
    "rgb(40,175,117)", "rgb(255,0,0)","rgb(255,115,0)"];


//事件函数1 —— 生成随机图片
//输入：value = 类名('cat,dog,plane等') canvasNum = 需要更换背景的输入层盒子编号(等于clickNum)
//返回: 利用AJAX, 从服务器端随机挑选一个value类的图片，作为input层的第canvasNum个盒子的背景。
function changePicture(value, canvasNum) {

    //根据累计点击次数clickNum获取对应的canvas对象；
    var canvas = document.querySelector('.layer-input .canvas-' + canvasNum).style;

    //根据累计点击次数clickNum获取对应的label对象；
    var label = document.querySelector('.input_label .label' + canvasNum);
    package.push(value);
    //console.log(package);

    //生成xhr实例
    var xhr = new XMLHttpRequest();

    //初始化Post请求,注意请求头的写法
    xhr.open('post', 'featuresClass.php');
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    //执行回调函数，更改对应canvas的背景
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            //输出服务器返回的用于背景设置的地址
            //console.log('服务器返回的用于背景设置的地址:', xhr.responseText);

            //更改背景图片
            canvas.backgroundImage = "url('" + xhr.responseText + "')";
            //更改边框颜色
            canvas.borderColor = 'rgba(0,0,0,0.7)';
            //更改说明标签的文本内容
            label.innerHTML = value;
        }
    };
    //发送请求
    xhr.send('name=' + value);
    //判断canvas是否已经全部被填满，如果填满就将clickNum重置，既从第一个盒子开始填充。
    if(clickNum == 6){
        clickNum = 0;
    }
    //完成一次请求后，clickNum+1 (更换图片的对象更改为下一个canvas;)
    clickNum += 1;
};

//事件函数2 —— 建立盒子之间的连接
function buildLink(svg, startBox, endBox) {
    //获取需要建立连接的input盒子对象
    //创建path标签
    var line = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    //设置link line的样式属性
    line.style = "stroke-dashoffset: 0; stroke-width: 2px; stroke: rgba(158,199,225,0.5)";
    //设置类名
    line.setAttribute('class', 'link-base');
    //计算连接路径 并设置path的d属性值
    var path = getPath1('.layer-input .' + startBox.className, '.layer-hidden .' + endBox.className);
    line.setAttribute('d', path);
    //设置线条颜色
    line.style.stroke = linkColorAlpha[clickNum-1];
    //插入path至指定的svg
    svg.appendChild(line);
};

//激活线条流动
function activeFlow() {
    var dashOff = document.querySelectorAll('.link-layers1 .link-base');
    setInterval(function () {
        for(i = 0; i<dashOff.length; i+=1){
            dashOff[i].style.strokeDashoffset -= 1.5;
        }
    },50)};

