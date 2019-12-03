from django.shortcuts import render
from django.shortcuts import HttpResponse
from django.http import JsonResponse
from iknow_backend import models
import pymysql as pml
import time
import numpy as np
import os
import json

# 类型映射表
class_index = {1: 'Plane', 2: 'Bird', 3: 'Car', 4: 'Cat', 5: 'Deer',
               6: 'Dog', 7: 'Frog', 8: 'Horse', 9: 'Ship', 10: 'Truck'}

# 根目录地址
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# 数据库连接测试
def sql_test(request):
    data = models.Dog.objects.filter(id=2)
    for i in data:
        if i.path_id == 6 and i.list_id == 101:
            return HttpResponse('Here is the SQL test, the connect is ok')
        else:
            return HttpResponse('SQL connect have a error')


# 主页测试函数
def main(request):
    return render(request, 'predict.html')


# 使用2层普通神经网络进行预测
def two_layer_net(image_array, showtime=False):
    # 导入所需模块
    from static.cs231n.classifiers import fc_net
    from static.cs231n.data_utils import image_for_predict
    from static.cs231n.data_utils import predict

    # 获取权重和偏置参数
    start = time.process_time()
    param = np.load(BASE_DIR + r"/static/model/twoFullyConnected.npy")
    model = fc_net.TwoLayerNet()
    model.params['W1'] = param[0]
    model.params['W2'] = param[1]
    model.params['b1'] = param[2]
    model.params['b2'] = param[3]
    mean = param[4]
    # ******************************************************************
    # 转换图片格式
    image_pred = image_for_predict(mean, image_array)
    # 使用两层网络的predict函数进行
    pred_class = predict(model, image_pred)
    # *******************************************************************
    # 运行时间
    end = time.process_time()
    if showtime:
        print('runtime:', end - start)
    return pred_class


# 图片上传和预测
def image_load(request):
    from django.http import JsonResponse
    from iknow_backend import models
    import base64
    # 切分字符串
    request = request.POST.get('image')
    image_array = request.split(';')
    image_array = image_array[1].split(',')
    image_array = image_array[1]
    # base64解码
    image_array = base64.b64decode(image_array)
    # 时间戳生成文件名
    millis = int(time.time())
    fileName = str(millis) + '.jpg'
    # 文件绝对路径
    filePath = BASE_DIR + r'\static\database\upload\%s' % fileName
    filePath = filePath.replace('\\', '/')
    # 相对路径(chrome不可外部引用，只能使用相对路径)
    webPath = r'\static\database\upload\%s' % fileName
    webPath = webPath.replace('\\', '/')
    # 使用with函数将bytes保存为jpg图片
    with open(filePath, 'wb') as fp:
        fp.write(image_array)
    # 将文件名上传数据库
    models.Upload.objects.create(fileName=millis, path_id=11)
    # 返回图片的相对路径地址
    return JsonResponse({'imgPath': webPath, 'fileName': fileName})


# CNN主站——挑选随机样本
def cnn(request):
    return render(request, 'index.html')


# 随机挑选样本
def random_choose(request):
    import iknow_backend
    import random
    from django.db import models
    val = request.POST.get('r_choose')
    click = request.POST.get('clickNum')
    # ****************
    # 输入val: 类别索引号
    # click: input层的样本编号
    random_id = random.randint(1, 1000)

    # 获取随机样本list_id
    class_str = class_index[int(val)]
    class_name = class_index[int(val)]
    class_name = getattr(iknow_backend.models, class_name)
    list_id = class_name.objects.filter(id=random_id)
    for i in list_id:
        list_id = i.list_id

    # 返回：
    # 1 具有以下格式的字符串“val-click-list_num”
    # 2 图片背景地址
    path = class_str.lower() + '\\' + str(list_id) + '.jpg'
    return_src = r'\static\database\%s' % path
    return_src = return_src.replace('\\', '/')
    return_str = str(val) + '_' + str(click) + '_' + str(list_id)
    return JsonResponse({'str': return_str, 'src': return_src})


# 执行运算
def iknow_pred(request, model='two_layer_net', showtime=False):
    import iknow_backend
    import matplotlib.image as plm
    from PIL import Image
    package = request.POST.get('package')
    package = json.loads(package)

    image_array = []
    read_path = []
    upload_pos = []
    right_class = {}
    error = []
    # 读取预测样本图片路径
    for j, i in enumerate(package):
        # 随机挑选样本的路径
        if len(i) < 10:
            # 获得随机样本的类编号
            class_id = i.split('_')[0]
            # 获得正确结果right_class(package编号: 类名)
            right_class[j] = class_index[int(class_id)]
            # 获得图片编号
            list_id = i.split('_')[2]
            path = getattr(iknow_backend.models, 'FilePath')
            path_id = path.objects.filter(id=class_id)
            for k in path_id:
                path_class = k.path
            img_path = path_class + '/%s.jpg' % str(list_id)
            img_path = img_path.replace('\\', '/')
            read_path.append(img_path)
        # 上传样本的路径
        else:
            path = getattr(iknow_backend.models, 'FilePath')
            path_id = path.objects.filter(id=11)
            for k in path_id:
                path_class = k.path
            img_path = path_class + '/%s' % str(i)
            img_path = img_path.replace('\\', '/')
            read_path.append(img_path)
            upload_pos.append(j)
    # 读取样本数组数据
    for j, i in enumerate(read_path):
        if j not in upload_pos:
            image_array.append(plm.imread(i))
        else:
            upimage = Image.open(i)
            up_resize = upimage.convert("RGB")
            up_resize = up_resize.resize((32, 32))
            up_resize.save(i)
            up_resize = plm.imread(i)
            image_array.append(up_resize)
    # ******************************************************************
    # 应用模型执行预测
    # 此处为后期不同模型的api接口
    # 输入需要预测的图片数组(32,32,3)列表，应用的模型类型
    if model == 'two_layer_net':
        result_pred = two_layer_net(image_array, showtime=showtime)
    elif model == 'cnn':
        result_pred = 'here is a cnn model, it is developing....'
        print('This is the CNN API')
        pass
    # # ******************************************************************
    # 获得预测结果
    result = result_pred
    # 找到预测错误的样本
    for i in right_class.keys():
        if right_class[i] != result[i]:
            error.append(i)
        else:
            pass
    # 返回结果
    return JsonResponse({'result': result, 'error': error})
