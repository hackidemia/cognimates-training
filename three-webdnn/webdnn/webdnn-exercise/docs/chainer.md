# Training of DNN model (Chainer)
Please move to `exercise` directory. There are the answers and pre-computed output files in `answer` directory, so refer to them if you have some trouble.

```
cd exercise
```

These files are contained in `exercise` directory from the beginning.
- `train_mnist_keras.py`
- `train_mnist_chainer.py`
- `convert_model_chainer.py`
- `index.html`
- `script.js`
- `paint.js`

`train_mnist_keras.py` is the code to train DNN model using Keras. `train_mnist_chainer.py` is the code to train DNN model using Chainer. `convert_model_chainer.py` is the code to convert Chainer model using WebDNN. `index.html`, `script.js`, `paint.js` are the codes which consist the web application that loads and works on the converted model. `index.html`, `script.js` have some sections you have to edit.

First, train the model which we would like to run on web browsers. In this exercise, we train a digit recognition convolutional neural network using MNIST dataset by Keras or Chainer. MNIST dataset is a dataset for classifying handwritten digits from 0 to 9.

Train the model by the following command. At this point, the code does not depend on WebDNN.

```
python train_mnist_chainer.py
```

The model is trained and saved as `chainer_output/chainer_model.npz` file.

The input of the trained model is an image of 28px * 28px, 1 channel. Value range is 0 to 1 (not 0 to 255), and foreground is 1 and background is 0. The output is a vector of length 10. Each element corresponds to model activation (value before softmax) representing each class (digit).

There is a point to be noted when training with softmax cross entropy loss. In this exercise, following to standard usage of Chainer, multi-class classification model is defined as follows.
```python
class CNN(chainer.Chain):
    def __init__(self):
        super(CNN, self).__init__()
        with self.init_scope():
            # the size of the inputs to each layer will be inferred
            self.conv1 = L.Convolution2D(None, 8, ksize=3)
            self.conv2 = L.Convolution2D(None, 16, ksize=3)
            self.l3 = L.Linear(None, 32)
            self.l4 = L.Linear(None, 10)

    def __call__(self, x):
        h1 = F.relu(self.conv1(x))
        h2 = F.relu(self.conv2(h1))
        h3 = F.relu(self.l3(h2))
        return self.l4(h3)

model = chainer.links.Classifier(CNN())
```


`CNN()` is the model before softmax is applied, and `chainer.links.Classifier` does softmax and loss computation. This division have to be considered in the model conversion.

# Conversion of DNN model (Chainer)
Let's convert the Keras model to a format which can be loaded to web browsers, using WebDNN. The format is called as "graph descriptor" in WebDNN.

The following command does the conversion.

```
python convert_model_chainer.py
```

This is short code, but some important points should be noted.

Chainer employs define-by-run scheme, so the model is actually run to obtain computational graph. Then it is feeded to WebDNN in order to obtain graph descriptor.

Create model object and set trained parameters.
```python
model = chainer.links.Classifier(CNN())
chainer.serializers.load_npz('chainer_output/chainer_model.npz', model)
```

Create dummy input variable `input_variable` and run the model. The shape of array `(1, 1, 28, 28)` represents "batch size, height, width, channel" of the input image. `model.predictor==CNN()`.
```python
input_variable = chainer.Variable(np.zeros((1, 1, 28, 28), dtype=np.float32))
prediction_raw_variable = model.predictor(input_variable)
```

Convert the output to probability by softmax function. `chainer.links.Classifier` simultanously compute softmax and cross entropy, so the user can only obtain loss.
```python
prediction_with_softmax_variable = chainer.functions.softmax(prediction_raw_variable)
```

Use input / output variables (which contain computation history) to convert DNN computation graph into WebDNN intermediate representation.
```python
graph = ChainerConverter().convert([input_variable], [
    prediction_with_softmax_variable])
```

There are several specification which enables fast numerical calculation on web browsers. In WebDNN, they are called as backend. WebDNN supports WebGPU, WebGL and WebAssembly backends. In this exercise we use WebGL since it is easier to setup. Specify `webgl` to the option of `generate_descriptor` method to obtain the graph descriptor, and save it. If the environment is set up completely, you can also generate and save graph descriptor using option `webgpu` or `webassembly`. In this case, the web browser automatically selects a backend which is supported on it.
```python
backend = 'webgl'
exec_info = generate_descriptor(backend, graph)
exec_info.save('webdnn_graph_descriptor')
```

A directory named `webdnn_graph_descriptor` is created, and files such as `graph_webgl_16384.json` are created in it. These are the graph descriptor, and will be loaded from web browsers.

The next step is ["Implementation of HTML/JavaScript"](./index.html#html_javascript). From here, it is same as Keras version.

