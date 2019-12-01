$(".dataset-list").on('click', function (event) {
    //target指触发事件的对象
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
            if (clickNum == 7) {
                clickNum = 1;
            }
        }
    })
});