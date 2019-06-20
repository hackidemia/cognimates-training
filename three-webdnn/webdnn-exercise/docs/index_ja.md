# WebDNNの基本的な使い方の演習
この記事は、Webブラウザ上でDeep Neural Networkを実行できるフレームワークWebDNNの基本的な使い方を演習を通して解説するものです。

演習を最後まで進めると、次のような画面が得られます。画面上の黒い領域にマウスで数字を描くと、それがどの数字なのかを認識して表示します。

![Screenshot of complete application]({{ site.baseurl }}/images/complete_screenshot.png)

動作するデモが[ここ](https://milhidaka.github.io/webdnn-exercise/example/)から見られます。

WebDNNのリポジトリ: [https://github.com/mil-tokyo/webdnn](https://github.com/mil-tokyo/webdnn)

## 対象読者
この演習では、深層学習(Deep Learning)自体の説明は行いません。Pythonの基本的な文法およびKerasまたはChainerで簡単な画像識別モデルを学習させる方法についての知識があることを仮定しています。JavaScriptについても知識があると望ましいですが、なくてもかまいません。

## 演習の流れ
以下の流れで演習が進みます。
1. 環境構築
2. WebDNNのインストール
3. DNNモデルの学習
4. DNNモデルの変換
5. HTML/JavaScriptの実装
6. 動作確認

いくつかのコードでは、WebDNNに関する処理が穴埋め問題になっており、テキストエディタで編集しながら進めます。

Python 3.6がインストール可能なGUI環境であれば、ほとんどの環境で演習を行えます。深層学習フレームワークは、Keras・Chainerに対応します。NVIDIA GPUは不要です。

# 環境構築
`webdnn-exercise`リポジトリをまだダウンロードしていない場合は、次のコマンドで行います。

```
git clone https://github.com/milhidaka/webdnn-exercise
```

以下、カレントディレクトリが`webdnn-exercise`になっているものとします。

Python環境は、Python 3.6, numpy, Keras 2.0 or Chainer 2.0が使えればOKです。Python 3.5以下では文法エラーとなり動作しませんので注意してください。

anacondaで仮想環境を構築する場合は、以下のコマンドで行えます。

```
conda env create -f environment.yml
```

この場合、名前`webdnn`で仮想環境が作られるので、

```
source activate webdnn
```

で仮想環境に入れます。

JavaScriptについては、モダンなWebブラウザのみ必要です。Firefox, Chrome, Edgeで動作確認しています。Safariについては注意事項があるので、「Safariについて」の章を読んでください。
node.jsは不要です。

# WebDNNのインストール
WebDNNをインストールします。この中には、モデルの変換に利用するPython製のプログラムと、Webブラウザ上でモデルを実行する際のJavaScript製のライブラリが入っています。

```
git clone https://github.com/mil-tokyo/webdnn
cd webdnn
python setup.py install
cd ..
```

(執筆時点commit 519bf7c)

# DNNモデルの学習 (Keras)
[「DNNモデルの学習」、「DNNモデルの変換」のChainer版はここをクリックしてください。](./chainer_ja.html)

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
python train_mnist_keras.py
```

モデルが学習され、`keras_model.h5`ファイルが生成されます。

学習されるモデルの入力は、28px * 28px、1チャンネルの画像です。値域は0から1(0から255ではない)で、前景が1で背景が0です。出力は、各クラス（数字）に対応するsoftmax確率を表す10次元のベクトルです。

# DNNモデルの変換 (Keras)
WebDNNを用いて、Kerasモデルを、Webブラウザで読み込める形式(WebDNNではgraph descriptorと呼ぶ)に変換します。

次のコマンドで変換を行います。

```
python ../webdnn/bin/convert_keras.py --backend webgl --input_shape '(1,28,28,1)' keras_model.h5
```

Webブラウザ上で数値計算を高速に行うために利用出来る規格がいくつかあります。WebDNNではこれをバックエンドと呼び、WebGPU・WebGL・WebAssemblyに対応しています。ここでは環境構築が容易なWebGLを利用することとし、オプションに`--backend webgl`を指定します。環境が整っていれば、`--backend webgpu,webgl,webassembly`のように複数のバックエンドを指定することが可能です。この場合、Webブラウザ側ではそのブラウザが対応しているバックエンドを自動的に選択して読み込むようになっています。

また、モデルへの入力配列の形状を指定する必要があります。画像を扱う場合、バッチサイズ、高さ、幅、チャンネル数の4次元の情報を指定することになります。この4つの情報の順序はデータオーダーと呼ばれ、メモリ上の1次元的な並び方と関わっています。Kerasのデフォルトでは「バッチサイズ、高さ、幅、チャンネル数」の順です[^keras_order]。MNISTの画像は28px * 28px、チャンネル数1（モノクロ）のため、`--input_shape '(1,28,28,1)'`を指定します。先頭の1(バッチサイズ)を他の数値に変更すれば、複数枚の画像を同時に識別させることも可能です。

[^keras_order]: `keras.backend.image_data_format() == "channels_last"`なら「バッチサイズ、高さ、幅、チャンネル数」の順、`"channels_first"`なら「バッチサイズ、チャンネル数、高さ、幅」となります。WebDNNは後者に対応していません。

`webdnn_graph_descriptor`ディレクトリが作成され、中に`graph_webgl_16384.json`などのファイルが出来ます。これがgraph descriptorで、あとでWebブラウザから読み込むことになります。

<a name="html_javascript"></a>
# HTML/JavaScriptの実装

## WebDNN JavaScriptのコピー
先ほど生成したgraph descriptorをWebブラウザ上で読み込んで動作させるためのJavaScriptライブラリを、以前cloneしたWebDNNリポジトリからコピーします。

```
cp ../webdnn/dist/webdnn.js webdnn.js
```

## HTML/JavaScriptの実装
Webアプリケーション本体の実装を行います。HTMLでページの視覚的構造を記述し、JavaScriptで動作のロジックを記述します。

アプリケーションの大部分はすでに記述されており、WebDNNに関する部分を編集することで完成するようになっています。わからない部分は`answer`ディレクトリの中を見てコピペしてください。

ページの構造は次のようになっています。必要な処理は、`"draw"`に描かれた画像をモデルに与えて、識別結果を`"result"`に表示することです。マウスで画像を描く部分については、`paint.js`に実装済みです。

![Page structure]({{ site.baseurl }}/images/page_structure.png)

編集すべきファイルは`index.html`、`script.js`の2つです。編集すべき箇所には`FIXME`というキーワードが書かれています。

### `index.html`の編集

`script`タグで、先ほどコピーした`webdnn.js`を読み込みます。
```html
<meta charset="utf-8">
<!-- FIXME: load webdnn.js -->
<script src="paint.js"></script>
```

### `script.js`の編集
#### `initialize`関数

```javascript
// WebDNNモデルをロードします
webdnn_runner = /* FIXME */;
// モデルの入出力変数に対するビューを取得します
// 入出力に対して複数の変数を持つことができますが、このモデルでは1つだけです
webdnn_input_view = /* FIXME */;
webdnn_output_view = /* FIXME */;
```

1: 先ほど生成したgraph descriptorの読み込み

`WebDNN.load(directory)`([マニュアル](https://mil-tokyo.github.io/webdnn/docs/api_reference/descriptor-runner/modules/webdnn.html#load))により、graph descriptorを読み込みます。これにより、runnerと呼ばれるオブジェクトが生成されます。runnerは、モデルの実行を制御する中心的なオブジェクトです。`directory`引数は、graph descriptorが存在するディレクトリ名です。なお、`WebDNN.load()`は非同期関数のため、`await`キーワードで結果を取り出します([参考](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/await))。結果として、FIXMEに挿入すべきコードは`await WebDNN.load('./webdnn_graph_descriptor');`となります。

2: 入出力ビューの取得

runnerから、モデルの入出力データを操作するためのviewと呼ばれるオブジェクトを取得します。これには、`getInputViews()`および`getOutputViews()`メソッドを用います([マニュアル](https://mil-tokyo.github.io/webdnn/docs/api_reference/descriptor-runner/classes/webdnn.descriptorrunner.html#getinputviews))。WebDNNではモデルが複数の入出力変数を持てるようになっており、1変数あたり1つのviewが割り当てられています。今回のモデルでは入出力それぞれ先頭の1つのviewだけが有効なため、`getInputViews()[0]`のように先頭のviewを取り出して変数に格納しておきます。結果として、FIXMEに挿入すべきコードはそれぞれ`webdnn_runner.getInputViews()[0];`、`webdnn_runner.getOutputViews()[0];`となります。

#### `calculate`関数

```javascript
// canvas上の画像をscaling, flatteningして入力データとして設定します
// https://mil-tokyo.github.io/webdnn/docs/api_reference/descriptor-runner/modules/webdnn_image.html
var canvas_draw = document.getElementById('draw'); // canvas object that contains input image
webdnn_input_view.set(await WebDNN.Image.getImageArray(canvas_draw, {
  /* convert image on canvas into input array (Float32Array, 28px*28px*1ch=784 dimension, black=0.0 and white=1.0) */
  dstH: /* FIXME */, dstW: /* FIXME */,
  order: WebDNN.Image.Order.HWC, // for Keras
  // order: WebDNN.Image.Order.CHW, // for Chainer (but the same as HWC because channel=1 in MNIST)
  color: WebDNN.Image.Color.GREY,
  bias: /* FIXME */,
  scale: /* FIXME */
}));

// DNNモデルを実行します
/* FIXME */;

// モデルの出力をFloat32Array形式で取得します
var probabilities = /* FIXME */;
```

1: canvas上の画像を変換し、入力変数に書き込み

canvasオブジェクト`canvas_draw`に、ユーザが描いた画像を表すデータが入っています。これをモデルに入力するためには所定の形式に変換する必要があります。`canvas_draw.getContext('2d').getImageData`メソッドにより生のピクセル値を取り出すことはできますが、モデルの入力として用いるためにはいくつかの変換が必要です。

|項目|canvasデータ|モデルが受け付ける形式|
|---|---|---|
|ピクセル数|256px * 256px|28px * 28px|
|色|RGBA(カラー+透明度)|モノクロ|
|値域|0~255|0~1|
|データオーダー|HWC|HWC(Kerasモデルの場合)、CHW(Chainerモデルの場合)|

データオーダーとは画像を1次元の配列で表現した時のピクセルの並び順のことです。ピクセルの明るさを関数`I(y, x, channel)`で表現した場合、HWC(height, width, channel)なら`[I(0, 0, 0), I(0, 0, 1), I(0, 0, 2), I(0, 1, 0)...]`となり、CHW(chanel, height, width)なら`[I(0, 0, 0), I(0, 1, 0), I(0, 2, 0), ..., I(0, W-1, 0), I(1, 0, 0), ...]`というように順序が定まります。

これらの変換を簡単に行うためのメソッドが`WebDNN.Image.getImageArray`です。[マニュアル](https://mil-tokyo.github.io/webdnn/docs/api_reference/descriptor-runner/modules/webdnn_image.html)を見ながらFIXMEとなっているところを埋めましょう。

2: モデルを実行

`await webdnn_runner.run()`でモデルを実行できます。`await`は、非同期実行の完了を待つ演算子です。

3: 出力変数から計算結果を取り出し

`webdnn_output_view.toActual()`で、モデルの計算結果(各クラスの確率)を取り出すことができます。後続の処理は、これを加工して画面に表示しています。

# 動作確認
## テスト用HTTPサーバの実行
作成したページをWebブラウザで開けるようにするため、HTTPサーバを実行します。
```
python -m http.server
```

アクセス待機状態になるので、次に進みます。HTTPサーバを終了するときは、Ctrl-Cを押します。

## Webブラウザでアクセス
作成したページにWebブラウザでアクセスします。

[http://localhost:8000/](http://localhost:8000/)

黒いボックス上でマウスをクリック・ドラッグすることで数字(0~9)を描きます。正しい識別結果がボックスの横に表示されれば成功です。

データセットの性質上、ボックス中央に小さめに数字を描いた方が認識されやすいようです。

うまくいかない場合、開発用コンソールでエラーメッセージを見るなどしながらデバッグします。

なお、次のようなエラーは出ていても構いません。このエラーは、WebAssemblyバックエンドに対応したgraph descriptorが存在しないために出ています。
```
GET http://localhost:8000/webdnn_graph_descriptor/graph_webassembly.json 404 (File not found)
```

# Safariについて
WebDNNはMac OS標準のWebブラウザSafariにも対応していますが、本演習の手順では他のブラウザと同様に動作させることができません。本演習ではWebDNNの計算バックエンドとしてWebGLを使用していますが、このバックエンドはSafariと互換性がないためです。SafariではWebGPUまたはWebAssemblyバックエンドが使用できます。WebGPUバックエンドはブラウザの設定が必要(→ [https://mil-tokyo.github.io/webdnn/docs/tips/enable_webgpu_macos.html](https://mil-tokyo.github.io/webdnn/docs/tips/enable_webgpu_macos.html) )です。WebAssemblyバックエンドはブラウザの設定は不要ですが、環境構築に若干時間がかかります。

Safariで演習を行う場合、`convert_keras.py`で作成されたディレクトリ`webdnn_graph_descriptor`に、リポジトリ直下にある`webdnn_graph_descriptor_for_all_backend`の中身を上書きしてください。全てのバックエンドに対応したgraph descriptorが同梱されているため、WebGPU(有効な場合)およびWebAssemblyを利用してSafariでのWebDNN実行が可能となります。
