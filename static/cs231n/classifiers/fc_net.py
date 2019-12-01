from builtins import range
from builtins import object
import numpy as np
from static.cs231n.layers import *
from static.cs231n.layer_utils import *

class TwoLayerNet(object):
    """
    
    这个类定义了 —— 带有ReLU非线性单元，使用softmax作为损失函数的模块化两层神经网络。
    假设输入层的尺寸为D，隐藏层具有尺寸H，将输入分为C个类。
    
    该网络的结构如下：
    affine - relu - affine - softmax
    
    这个类中并没有执行梯度下降。相反的，这个类的对象将和Solver对象交互，去执行合理的优化。
    
    模型中的可学习参数被储存在一个字典中。字典中以self.params作为对应参数数组的键名。
    
    
    """

    def __init__(self, input_dim=3*32*32, hidden_dim=100, num_classes=10,
                 weight_scale=1e-3, reg=0.0):
        """
        
        初始化神经网络
        
        输入：
        input_dim: 整数，输入层的尺寸 D
        hidden_dim：整数，隐藏层的尺寸 H
        num_classes：整数，执行分类的数量 C
        weight_scale：标量，给出了权重随机初始化的标准偏差。
        reg: 标量，L2正则化的强度
        
        """
        self.params = {}
        self.reg = reg

        ############################################################################
        # TODO: Initialize the weights and biases of the two-layer net. Weights
        # should be initialized from a Gaussian centered at 0.0 with
        # standard deviation equal to weight_scale, and biases should be
        # initialized to zero. All weights and biases should be stored in the
        # dictionary self.params, with first layer weights
        # and biases using the keys 'W1' and 'b1' and second layer
        # weights and biases using the keys 'W2' and 'b2'.
        
        # 初始化一个两层神经网络的weights和biases
        # 初始weights应满足以0.0为中心的高斯分布，其偏差应该等于weight_scale
        # biases应该初始化为0. 所有weights和biases应该被储存在一个self.params的字典中
        # 第一层的weights和biases的键名应该使用'W1'和'b1'，第二层的weights和biases使用键名'W2'和'b2'
        ############################################################################
        # *****START OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        self.params['W1'] = weight_scale * np.random.randn(input_dim,hidden_dim) #(3072,100)
        self.params['b1'] = np.zeros((hidden_dim,)) #100
        self.params['W2'] = weight_scale * np.random.randn(hidden_dim,num_classes) #(100,10)
        self.params['b2'] = np.zeros((num_classes,)) #10
        # *****END OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        ############################################################################
        #                             END OF YOUR CODE                             #
        ############################################################################


    def loss(self, X, y=None):
        """  
        计算一个minibatch data的损失和梯度
        
        输入：
        X：输入数据。一个具有形状(N, d_1, ..., d_k)的数组
        y：标签数据。一个形状为(N,)的数组，其中y[i]给定了X[i]的标签
        
        返回：
        如果y没有给定。那么将运行一个不知道什么东西
        
        如果给定了y，那么就会进行前向和反向传播并且返回一个元组
        loss：损失值
        grads: 具有键名 self.params，键值为对应参数相对于损失的梯度。
        
        """
        scores = None
        ############################################################################
        #执行神经网络的前向传播，计算样本对于每个类的分数，并将其储存在scores变量中
        ############################################################################
        # *****START OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****

        h1_out,h1_cache = affine_relu_forward(X,self.params['W1'],self.params['b1'])
        scores,out_cache = affine_forward(h1_out,self.params['W2'],self.params['b2'])

        # *****END OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        ############################################################################
        #                             END OF YOUR CODE
        ############################################################################
        # 如果没有给定y,那么就进入test模式，返回scores
        if y is None:
            return scores

        loss, grads = 0, {}
        ############################################################################
        # 进行反向传播
        #将损失值和梯度储存在一个字典中。损失的变量为loss，梯度的变量为grads。
        #使用softmax计算损失，确保grad[k]是self.params[k]的梯度。别忘添加一个L2正则化
        
        #注意：L2正则化系数请给定为0.5，为了一些啥乱七八糟的理由
        # NOTE: To ensure that your implementation matches ours and you pass the   #
        # automated tests, make sure that your L2 regularization includes a factor #
        # of 0.5 to simplify the expression for the gradient.
        ############################################################################
        # *****START OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        
        #第二层affine的反馈传播
        loss,dout = softmax_loss(scores,y)
        dout,dw2,db2 = affine_backward(dout,out_cache)
        
        #loss的正则化
        loss += 0.5 * self.reg * (np.sum(self.params['W1'] ** 2) + np.sum(self.params['W2'] ** 2))
        
        #第一层affine+Relu的反馈传播
        _,dw1,db1 = affine_relu_backward(dout,h1_cache)
        
        #dw1和dw2的正则化？？
        dw1 += self.reg * self.params['W1']
        dw2 += self.reg * self.params['W2']
        
        
        grads['W1'],grads['b1'] = dw1,db1
        grads['W2'],grads['b2'] = dw2,db2

        # *****END OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        ############################################################################
        #                             END OF YOUR CODE 
        ############################################################################

        return loss, grads


class FullyConnectedNet(object):
    """
    A fully-connected neural network with an arbitrary number of hidden layers,
    ReLU nonlinearities, and a softmax loss function. This will also implement
    dropout and batch/layer normalization as options. For a network with L layers,
    the architecture will be

    {affine - [batch/layer norm] - relu - [dropout]} x (L - 1) - affine - softmax

    where batch/layer normalization and dropout are optional, and the {...} block is
    repeated L - 1 times.

    Similar to the TwoLayerNet above, learnable parameters are stored in the
    self.params dictionary and will be learned using the Solver class.
    """

    def __init__(self, hidden_dims, input_dim=3*32*32, num_classes=10,
                 dropout=1, normalization=None, reg=0.0,
                 weight_scale=1e-2, dtype=np.float32, seed=None):
        """
        Initialize a new FullyConnectedNet.

        Inputs:
        - hidden_dims: A list of integers giving the size of each hidden layer.
        - input_dim: An integer giving the size of the input.
        - num_classes: An integer giving the number of classes to classify.
        - dropout: Scalar between 0 and 1 giving dropout strength. If dropout=1 then
          the network should not use dropout at all.
        - normalization: What type of normalization the network should use. Valid values
          are "batchnorm", "layernorm", or None for no normalization (the default).
        - reg: Scalar giving L2 regularization strength.
        - weight_scale: Scalar giving the standard deviation for random
          initialization of the weights.
        - dtype: A numpy datatype object; all computations will be performed using
          this datatype. float32 is faster but less accurate, so you should use
          float64 for numeric gradient checking.
        - seed: If not None, then pass this random seed to the dropout layers. This
          will make the dropout layers deteriminstic so we can gradient check the
          model.
        """
        self.normalization = normalization
        self.use_dropout = dropout != 1
        self.reg = reg
        self.num_layers = 1 + len(hidden_dims)
        self.dtype = dtype
        self.params = {}

        ############################################################################
        # TODO: Initialize the parameters of the network, storing all values in    #
        # the self.params dictionary. Store weights and biases for the first layer #
        # in W1 and b1; for the second layer use W2 and b2, etc. Weights should be #
        # initialized from a normal distribution centered at 0 with standard       #
        # deviation equal to weight_scale. Biases should be initialized to zero.   #
        #                                                                          #
        # When using batch normalization, store scale and shift parameters for the #
        # first layer in gamma1 and beta1; for the second layer use gamma2 and     #
        # beta2, etc. Scale parameters should be initialized to ones and shift     #
        # parameters should be initialized to zeros.                               #
        ############################################################################
        # *****START OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****

        pass

        # *****END OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        ############################################################################
        #                             END OF YOUR CODE                             #
        ############################################################################

        # When using dropout we need to pass a dropout_param dictionary to each
        # dropout layer so that the layer knows the dropout probability and the mode
        # (train / test). You can pass the same dropout_param to each dropout layer.
        self.dropout_param = {}
        if self.use_dropout:
            self.dropout_param = {'mode': 'train', 'p': dropout}
            if seed is not None:
                self.dropout_param['seed'] = seed

        # With batch normalization we need to keep track of running means and
        # variances, so we need to pass a special bn_param object to each batch
        # normalization layer. You should pass self.bn_params[0] to the forward pass
        # of the first batch normalization layer, self.bn_params[1] to the forward
        # pass of the second batch normalization layer, etc.
        self.bn_params = []
        if self.normalization=='batchnorm':
            self.bn_params = [{'mode': 'train'} for i in range(self.num_layers - 1)]
        if self.normalization=='layernorm':
            self.bn_params = [{} for i in range(self.num_layers - 1)]

        # Cast all parameters to the correct datatype
        for k, v in self.params.items():
            self.params[k] = v.astype(dtype)


    def loss(self, X, y=None):
        """
        Compute loss and gradient for the fully-connected net.

        Input / output: Same as TwoLayerNet above.
        """
        X = X.astype(self.dtype)
        mode = 'test' if y is None else 'train'

        # Set train/test mode for batchnorm params and dropout param since they
        # behave differently during training and testing.
        if self.use_dropout:
            self.dropout_param['mode'] = mode
        if self.normalization=='batchnorm':
            for bn_param in self.bn_params:
                bn_param['mode'] = mode
        scores = None
        ############################################################################
        # TODO: Implement the forward pass for the fully-connected net, computing  #
        # the class scores for X and storing them in the scores variable.          #
        #                                                                          #
        # When using dropout, you'll need to pass self.dropout_param to each       #
        # dropout forward pass.                                                    #
        #                                                                          #
        # When using batch normalization, you'll need to pass self.bn_params[0] to #
        # the forward pass for the first batch normalization layer, pass           #
        # self.bn_params[1] to the forward pass for the second batch normalization #
        # layer, etc.                                                              #
        ############################################################################
        # *****START OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****

        pass

        # *****END OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        ############################################################################
        #                             END OF YOUR CODE                             #
        ############################################################################

        # If test mode return early
        if mode == 'test':
            return scores

        loss, grads = 0.0, {}
        ############################################################################
        # TODO: Implement the backward pass for the fully-connected net. Store the #
        # loss in the loss variable and gradients in the grads dictionary. Compute #
        # data loss using softmax, and make sure that grads[k] holds the gradients #
        # for self.params[k]. Don't forget to add L2 regularization!               #
        #                                                                          #
        # When using batch/layer normalization, you don't need to regularize the scale   #
        # and shift parameters.                                                    #
        #                                                                          #
        # NOTE: To ensure that your implementation matches ours and you pass the   #
        # automated tests, make sure that your L2 regularization includes a factor #
        # of 0.5 to simplify the expression for the gradient.                      #
        ############################################################################
        # *****START OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****

        pass

        # *****END OF YOUR CODE (DO NOT DELETE/MODIFY THIS LINE)*****
        ############################################################################
        #                             END OF YOUR CODE                             #
        ############################################################################

        return loss, grads
