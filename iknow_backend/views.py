from django.shortcuts import render
from django.shortcuts import HttpResponse
from django.http import JsonResponse
from iknow_backend import models
from keras import backend as K
from keras.models import load_model
from keras import models
import time
import numpy as np
import os
import json

# 解决plt.show()在linux下无法使用的问题
import matplotlib
matplotlib.use('Agg')

# 类型映射表
class_index = {1: 'Plane', 2: 'Bird', 3: 'Car', 4: 'Cat', 5: 'Deer',
               6: 'Dog', 7: 'Frog', 8: 'Horse', 9: 'Ship', 10: 'Truck'}

# 根目录地址
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# progress
Progress = {}
print('Progress have been empty', Progress)

# 加载模型
#modelCnn = load_model(BASE_DIR + r"/static/model/cnn80.h5")
#modelCnn.summary()

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

# 生成heatmap
def get_hot_map(model, class_index, img_tensor_raw, img_tensor, millis):
    '''

    :param model: 使用的模型
    :param class_index: 一个list。由类索引号组成，表示对输入图片的预测结果。
    :param img_raw: 一个数组(samplesNum, w, h, channel)。原始图片数据的数组
    :param img_tensor: 一个数组(samplesNum, w, h, channel)。已进行归一化处理的表示图片数据的数组
    :return: CAM: 一个列表。保存了每个样本cam图的url地址
    '''
    import cv2
    import matplotlib.pyplot as plt
    #from keras import backend as K
    CAM = []
    for j, i in enumerate(class_index):
        img_raw = img_tensor_raw[j]
        # 归一化后的图片数据
        img = img_tensor[j]
        img = np.expand_dims(img, axis=0)
        # 获得最后dense层对应元素的分数
        husky = model.get_layer('dense_8').output[:, i]

        # 获得最后一个卷积层的激活图
        last_conv_layer = model.get_layer('conv2d_16')

        # 输出特征图相对于husky得分的梯度
        grads = K.gradients(husky, last_conv_layer.output)[0]

        # 对特征图进行全局池化
        pooled_grads = K.mean(grads, axis=(0, 1, 2))

        # 计算每个特征图的
        iterate = K.function([model.input],
                             [pooled_grads, last_conv_layer.output[0]])
        pooled_grads_value, conv_layer_output_value = iterate([img])

        # 计算heatmap
        for k in range(64):
            conv_layer_output_value[:, :, k] *= pooled_grads_value[k]
        heatmap_raw = np.mean(conv_layer_output_value, axis=-1)

        # heatmap后处理
        # 1. 将heatmap_raw的值归一化至0~1
        heatmap = np.maximum(heatmap_raw, 0)
        heatmap /= np.max(heatmap)

        # 2. 将heatmap尺寸还原为原图尺寸
        img = img_raw
        heatmap = cv2.resize(heatmap, (img.shape[1], img.shape[0]))
        heatmap = np.uint8(255 * heatmap)
        heatmap = 255 - heatmap
        #plt.imshow(heatmap)

        # 3. 叠加原图和heatmap
        heatmap_map = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        alpha = 0.4  # 设置覆盖图片的透明度
        cv2.addWeighted(heatmap_map, alpha, img, 1 - alpha, 0, img)  # 将热度图覆盖到原图

        # 4. 保存heatmap
        # 4.1 设定保存路径和保存的文件名
        fileName = str(millis) + '_' + str(j) + '.jpg'
        filePath = BASE_DIR + r'\static\database\fmap\%s\%s' % (millis, fileName)
        filePath = filePath.replace('\\', '/')
        webPath = '/static/database/fmap/%s/%s' % (millis, fileName)
        # 4.2 保存heatmap
        cv2.imwrite(filePath, cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
        # 5. 更新返回值的列表
        CAM.append(webPath)
    return CAM

# 获得featuremap
def featuremap(model,img_tensor, config, millis, askCode):
    #from keras import models
    import matplotlib.pyplot as plt
    # 返回的列表
    fmap_list = []

    # 样本数
    sample_num = len(img_tensor)
    # 自定义输出模型
    layer_outputs = [layer.output for layer in model.layers[:8]]
    activation_model = models.Model(inputs=model.input, outputs=layer_outputs)

    # 获得激活图
    activations = activation_model.predict(img_tensor)

    # 按照样本数进行循环
    # sample表示第几个样本, layer表示层数，map_num该层总共需要显示多少个map
    for sample in range(sample_num):
        # 清空样本的缓存列表
        Progress[askCode] = 40 + sample * 10
        sample_map = []
        # 对层进行循环
        for layer, map_num in enumerate(config):
            # 清空层的缓存列表
            layer_map = []
            # 获取层layer的输出
            fmap = activations[layer]
            # 对层中所有的map进行循环
            for m in range(map_num):
                plt.imshow(fmap[sample, :, :, m], cmap='viridis')
                # 生成图片（下面这段代码用来消除白边）
                plt.axis('off')
                plt.gcf().set_size_inches(32 / 32, 32 / 32)
                plt.gca().xaxis.set_major_locator(plt.NullLocator())
                plt.gca().yaxis.set_major_locator(plt.NullLocator())
                plt.subplots_adjust(top=1, bottom=0, right=1, left=0, hspace=0, wspace=0)
                plt.margins(0, 0)
                # 保存特征图
                # 文件名f-样本号-层号-map号
                fileName = 'f' + str(sample) + str(layer) + str(m) + '.jpg'
                # 保存路径
                filePath = BASE_DIR + r'\static\database\fmap\%s\%s' % (millis, fileName)
                filePath = filePath.replace('\\', '/')
                # 前端相对路径
                webPath = '/static/database/fmap/%s/%s' % (millis, fileName)
                # 保存图片
                plt.savefig(filePath)
                layer_map.append(webPath)
            sample_map.append(layer_map)
        fmap_list.append(sample_map)
    Progress[askCode] = 100
    return fmap_list

# 使用CNN模型进行预测
def cnn80(image_array, config, millis, askCode):
    #from keras.models import load_model
    start = time.time()
    # 预测分类的索引
    predt_class_index = ['Plane', 'Car', 'Bird', 'Cat', 'Deer', 'Dog', 'Frog', 'Horse', 'Ship', 'Truck']
    # 预测的分类
    pred_class = []
    max_index = []
    # 预测信心
    confidence = []
    # 结果汇总
    result = {}
    # 前三的预测结果
    # top_class前三的分类索引号
    # top_score前三的具体分数
    top_class = []
    top_score = []
    #########################################################################################
    # 加载模型，数据归一化
    # 清除图
    K.clear_session()
    modelCnn = load_model(BASE_DIR + r"/static/model/cnn80.h5")
    img_tensor_raw = np.array(image_array)
    img_tensor = img_tensor_raw / 255

    # 获得预测结果
    preds = modelCnn.predict(img_tensor)
    for i in preds:
        # 获得样本的预测结果
        max_score = np.max(i)
        max_score_index = np.argmax(i)
        max_index.append(max_score_index)
        confidence.append(str(round(max_score*100, 2)) + '%')
        pred_class.append(predt_class_index[max_score_index])

        # 获得前3个预测结果的类编号和分数
        top_index = np.argsort(i)
        top_index = top_index[7:]
        top_score_value = []
        for j in top_index:
            top_score_value.append(round(i[j]*100, 2))
        top_index[0], top_index[2] = top_index[2], top_index[0]
        top_score_value[0], top_score_value[2] = top_score_value[2], top_score_value[0]
        top_class.append(top_index.tolist())
        top_score.append(top_score_value)
    # print('top_class', top_class)
    # print('top_score', top_score)
    # print('pred_class', pred_class)
    # print('confidence', confidence)
    end1 = time.time()
    print("cnn80 获得预测结果", end1 - start)
    Progress[askCode] = 20
    # 获得cam
    cam = get_hot_map(modelCnn, max_index, img_tensor_raw, img_tensor, millis)

    end2 = time.time()
    print("cnn80 获得cam", end2 - end1)
    Progress[askCode] = 30
    # 获得featureMap
    fmap = featuremap(modelCnn, img_tensor, config, millis, askCode)

    end3 = time.time()
    print("cnn80 获得fmap", end3 - end2)
    ###########################################################################################
    # 组合结果result = {样本编号:[预测结果， 预测信心，[[f000,f001],[f010],[f020,f021,f022]],cam]}
    for i, j in enumerate(pred_class):
        result[i] = [j]
    for i in result.keys():
        result[i].append(confidence[i])
        result[i].append(fmap[i])
        result[i].append(cam[i])

    # 清除图
    K.clear_session()
    return pred_class, result, top_class, top_score

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

# 执行运算-TwoFC
def iknow_pred_TwoFC(request, model='two_layer_net', showtime=False):
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

# 执行运算-cnn80
def iknow_pred(request, model='cnn80', showtime=False):
    import iknow_backend
    import matplotlib.image as plm
    from PIL import Image
    # 获取package数据
    start = time.time()
    package = request.POST.get('package')
    package = json.loads(package)
    print(package)
    # 获取config数据
    config = request.POST.get('config')
    config = json.loads(config)
    # print("config", config)
    # 获取askCode
    askCode = request.POST.get('askCode')
    if askCode not in Progress.keys():
        Progress[askCode] = 0
    # 创建一个文件夹，用于存放本次计算时产生的fmap
    millis = int(time.time())
    millis = str(millis)
    # 文件绝对路径
    dircPath = BASE_DIR + r'\static\database\fmap\%s' %millis
    dircPath = dircPath.replace('\\', '/')
    os.mkdir(dircPath)

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

    Progress[askCode] = 10
    # ******************************************************************
    # 应用模型执行预测
    # 此处为后期不同模型的api接口
    # 输入需要预测的图片数组(32,32,3)列表，应用的模型类型

    # config表示模型结果，[1, 2]表示第一层有1个盒子，第二层有2个盒子
    if model == 'two_layer_net':
        result_pred = two_layer_net(image_array, showtime=showtime)
    elif model == 'cnn80':
        result_pred, fmap_result, top_score, top_class = cnn80(image_array, config, millis, askCode)
        pass
    # # ******************************************************************
    # 获得预测结果
    for i in right_class.keys():
        if right_class[i] != result_pred[i]:
            error.append(i)
        else:
            pass
    # 找到预测错误的样本
    # 返回结果
    end = time.time()
    print('total running time', end-start)
    return JsonResponse({'result': result_pred, 'error': error, 'fmap': fmap_result, 'topScore': top_score, 'topClass': top_class})

# 获取进度条
def getProgress(request):
    askCode = request.POST.get("askCode")
    revalue = 0
    if askCode not in Progress.keys():
        Progress[askCode] = 0
    else:
        revalue = Progress[askCode]
        if revalue >= 100:
            Progress.pop(askCode)
    #print(Progress)
    print("For askCode:", askCode, "The return progress is", revalue)
    return JsonResponse({'Progress': revalue})