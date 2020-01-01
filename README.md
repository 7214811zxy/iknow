# Visualization Convolutional Neural Networks

如果你接触过计算机视觉，您一定听说过卷积神经网络
那么，卷积神经网络判断一张图片是猫、狗、飞机还是汽车的标准是什么呢？
当计算机判断错误时，错误的原因又是什么呢？
在这个小网页上，你获取可以找到答案！Why they predict what they predict?

Convolutional Neural Networks (CNNs) and other deep networks have enabled unprecedented breakthroughs in a variety of computer vision tasks, from image classification to object detection. While these deep neural networks enable superior performance, their lack of decomposability into intuitive and understandable components makes them hard to interpret.

For example, for an arbitrary input image, the network can give you a predict. But, why they predict what they predict? why does the network think this image is a cat and another is a dog? when the network fails, how to explain the reason? For another example, compared to cats and dogs, classify airplanes and birds is easier. (You can practice here, select some cat and plane samples from the DATA column on the top-left, and click play to observe the accuracy of classification.

How to Use This Site?
If you've used Google's Tensorflow Playground, right, my poor site just a version of the Convolutional Neural Network (Tensorflow playground is very interesting, he is my role model).

1. Select some samples from the DATA column, or upload some images as samples.
2. Select the number of filters you want to visualize in HIDDEN LAYERS.
3. Click the Play button to submit the calculation (more filters more calculation time, the number of filters does not affect the prediction result).
4. When the calculation complete, the Grad-CAM images will be displayed in OUTPUT. (What is Grad-CAM? A simple analogy, if you chose a cat sample, but your computer brother says, hi, I think it is a dog. Then confidently give you a picture where the most dog-like area on this picture is painted in red. If you want to know more details, you can see Selvaraju's paper.)
5. A loving GIF demo.

![image](https://github.com/7214811zxy/iknow/blob/master/static/webDemo.gif)
