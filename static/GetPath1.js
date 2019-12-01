function getPath1(startElm, endElm) {
    //输入：两个元素的选择器字符串。例如getPath('.class1', '.class2')
    //返回：返回表示<path>中d属性值的字符串。例如返回path = 'M80,325C240,325 240,125 400,125'
    //M起始点坐标 C x1,y1 x2,y2, 终点坐标

    //获取需要连接的起始元素和终止元素的对象
    var box1 = document.querySelector(startElm);
    var box2 = document.querySelector(endElm);
    //获取绘制三次贝塞尔曲线的4个点数据点

    //起点坐标
    var startPoint_x = 0;
    var startPoint_y = box1.offsetTop + (box1.clientWidth) * 0.5;
    // console.log('1 width', box1.clientWidth);
    // console.log('1 offsetLeft', box1.offsetLeft);
    // console.log('1 offsetTop', box1.offsetTop);

    //终点坐标
    var endPoint_x = 104;//如果要改这个值，要同时改变base中.link-layers的width 和 #network .layer-hidden的margin-left
    var endPoint_y = box2.offsetTop + (box2.clientWidth) * 0.5;
    // console.log('2 width', box2.clientWidth);
    // console.log('2 offsetLeft', box2.getBoundingClientRect().x);
    // console.log('2 offsetTop', box2.getBoundingClientRect().top);

    //两个参考点的横坐标(即起点和终点的中间位置，参考点1的纵坐标=起始点纵坐标，参考点2的纵坐标=终止点纵坐标)
    var refPoint_x = (startPoint_x + endPoint_x) * 0.5;

    //拼接C命令 = x1,y1 x2,y2 x,y
    var C = refPoint_x + ',' + startPoint_y + ' ' + refPoint_x + ',' + endPoint_y + ' ' + endPoint_x + ',' + endPoint_y;

    //拼接d命令 = Mx0,y0 Cx1,y1 x2,y2 x,y
    var linkPath = 'M' + startPoint_x + ',' + startPoint_y + 'C' + C;

    //返回path
    return linkPath;
};

function getPath2(startElm, endElm) {
    //输入：两个元素的选择器字符串。例如getPath('.class1', '.class2')
    //返回：返回表示<path>中d属性值的字符串。例如返回path = 'M80,325C240,325 240,125 400,125'
    //M起始点坐标 C x1,y1 x2,y2, 终点坐标

    //获取需要连接的起始元素和终止元素的对象
    var box1 = document.querySelector(startElm);
    var box2 = document.querySelector(endElm);
    //获取绘制三次贝塞尔曲线的4个点数据点

    //起点坐标
    var startPoint_x = 0;
    var startPoint_y = box1.offsetTop + (box1.clientWidth) * 0.5;

    //终点坐标
    var endPoint_x = 283;//如果要改这个值，要同时改变base中.link-layers的width 和 #network .layer-hidden的margin-left
    var endPoint_y = box2.offsetTop + (box2.clientWidth) * 0.5;

    //两个参考点的横坐标(即起点和终点的中间位置，参考点1的纵坐标=起始点纵坐标，参考点2的纵坐标=终止点纵坐标)
    var refPoint_x = (startPoint_x + endPoint_x) * 0.5;

    //拼接C命令 = x1,y1 x2,y2 x,y
    var C = refPoint_x + ',' + startPoint_y + ' ' + refPoint_x + ',' + endPoint_y + ' ' + endPoint_x + ',' + endPoint_y;

    //拼接d命令 = Mx0,y0 Cx1,y1 x2,y2 x,y
    var linkPath = 'M' + startPoint_x + ',' + startPoint_y + 'C' + C;

    //返回path
    return linkPath;
}