# DNNモデルの学習 (Chainer)
これ以降、`exercise`ディレクトリで作業します。`answer`ディレクトリに同じファイル構成で答えと計算済み出力ファイルが入っていますので、うまくいかない場合は参照してください。

```
cd exercise
```

`exercise`ディレクトリには以下のファイルが最初から入っています。
- `train_mnist_keras.py`
- `train_mnist_chainer.py`
- `convert_model_chainer.py`
- `index.html`
- `script.js`
- `paint.js`

`train_mnist_keras.py`は、Kerasを用いてDNNモデルを学習するコードです。`train_mnist_chainer.py`は、Chainerを用いてDNNモデルを学習するコードです。`convert_model_chainer.py`は、WebDNNを用いてChainerモデルを変換するコードです。`index.html`、`script.js`、`paint.js`は、変換されたモデルを読み込んで動作するWebアプリケーションを構成するコードです。`index.html`、`script.js`については、編集すべき箇所があります。

まず、Webブラウザ上で動かしたいモデルを学習します。この演習では、MNISTデータセットを用いた文字認識Convolutional Neural NetworkをKerasまたはChainerを用いて学習します。MNISTデータセットは0から9の手書き数字を識別するためのデータセットです。

次のコマンドでモデルを学習します。この時点では、WebDNNに依存する処理はまだ含まれていません。

```
python train_mnist_chainer.py
```

モデルが学習され、`chainer_output/chainer_model.npz`ファイルが生成されます。

学習されるモデルの入力は、28px * 28px、1チャンネルの画像です。値域は0から1(0から255ではない)で、前景が1で背景が0です。出力は、各クラス（数字）に対応するモデルの反応(softmaxを適用する前の値)を表す10次元のベクトルです。

softmax cross entropy lossを用いて学習するにあたり、モデルの定義に注意が必要です。この演習ではChainerの標準的な利用方法に従い、多クラス識別モデルを次のように実装します。
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

すなわち、`CNN()`はsoftmaxを適用する前のモデルを表し、`chainer.links.Classifier`がsoftmaxおよび損失計算を担っています。このことはモデルの変換時に注意事項として出てきます。


# DNNモデルの変換 (Chainer)
WebDNNを用いて、Chainerモデルを、Webブラウザで読み込める形式(WebDNNではgraph descriptorと呼ぶ)に変換します。

次のコマンドで変換を行います。

```
python convert_model_chainer.py
```

コードは短いですが、重要な部分について説明を加えておきます。

ChainerはDefine-by-Run方式をとっているため、モデルを実際に動作させて計算グラフを取得し、それをWebDNNに与えてgraph descriptorを生成させるという手順になっています。

モデルオブジェクトの生成および学習したパラメータの読み込みを行います。
```python
model = chainer.links.Classifier(CNN())
chainer.serializers.load_npz('chainer_output/chainer_model.npz', model)
```

ダミーの入力変数`input_variable`を作成し、モデルを動作させます。配列の形状`(1, 1, 28, 28)`は、入力画像の「バッチサイズ、チャンネル数、高さ、幅」を表しています。`model.predictor==CNN()`です。
```python
input_variable = chainer.Variable(np.zeros((1, 1, 28, 28), dtype=np.float32))
prediction_raw_variable = model.predictor(input_variable)
```

softmax関数によって確率に変換します。`chainer.links.Classifier`の中では、softmaxとcross entropyが同時に計算されてしまい損失しか得ることができません。
```python
prediction_with_softmax_variable = chainer.functions.softmax(prediction_raw_variable)
```

入出力変数(計算履歴情報を保持している)を用いて、DNNの計算グラフをWebDNNの中間表現に変換します。
```python
graph = ChainerConverter().convert([input_variable], [
    prediction_with_softmax_variable])
```

Webブラウザ上で数値計算を高速に行うために利用出来る規格がいくつかあります。WebDNNではこれをバックエンドと呼び、WebGPU・WebGL・WebAssemblyに対応しています。ここでは環境構築が容易なWebGLを利用することとし、オプションに`webgl`を指定して`generate_descriptor`を呼び出し、生成されたgraph descriptorを保存します。環境が整っていれば、`webgpu`, `webassembly`等を指定して同様にgraph descriptorを生成・保存することができます。この場合、Webブラウザ側ではそのブラウザが対応しているバックエンドを自動的に選択して読み込むようになっています。
```python
backend = 'webgl'
exec_info = generate_descriptor(backend, graph)
exec_info.save('webdnn_graph_descriptor')
```

`webdnn_graph_descriptor`ディレクトリが作成され、中に`graph_webgl_16384.json`などのファイルが出来ます。これがgraph descriptorで、あとでWebブラウザから読み込むことになります。

次は、[「HTML/JavaScriptの実装」](./index_ja.html#html_javascript)です。ここからはKeras版と同様となります。
