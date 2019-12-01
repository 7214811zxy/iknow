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
                console.log('jQuery bind complete');
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
                    //隐藏弹窗
                    $('#uploadimageModal').modal('hide');

                    //在对应的input盒子里 显示裁剪后的图像
                    $('.layer-input .canvas-' + clickNum).html(data['imgPath']);

                    //清除#upload_image内的url值，否则无法重新上传相同的图片
                    $('#upload_image').val("");

                    //往package列表中传入值
                    package_str = data['fileName'];
                    package[clickNum - 1] = package_str;
                    // 计数器clickNum + 1
                    clickNum += 1;
                    if (clickNum == 7) {
                        clickNum = 1;
                    }
                }
            });
        })
    });
});