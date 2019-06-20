'use strict';

var webdnn_runner = null;
var webdnn_input_view, webdnn_output_view;

// This function is called when the page is loaded
// この関数は、ページがロードされた時に実行されます
async function initialize() {
  console.log('Beginning of initialize()');
  // Load WebDNN model
  // WebDNNモデルをロードします
  webdnn_runner = await WebDNN.load('./webdnn_graph_descriptor');
  // Get view object for input / output variable of the model
  // There can be multiple variables for input / output, but there is only one for this model
  // モデルの入出力変数に対するビューを取得します
  // 入出力に対して複数の変数を持つことができますが、このモデルでは1つだけです
  webdnn_input_view = webdnn_runner.getInputViews()[0];
  webdnn_output_view = webdnn_runner.getOutputViews()[0];
  console.log('End of initialize()');
}

// This function is called when the input image is updated
// この関数は、入力画像が更新された時に実行されます
async function calculate() {
  console.log('Beginning of calculate()');

  // set input data by scaling and flattening the image in canvas
  // canvas上の画像をscaling, flatteningして入力データとして設定します
  // https://mil-tokyo.github.io/webdnn/docs/api_reference/descriptor-runner/modules/webdnn_image.html
  var canvas_draw = document.getElementById('draw'); // canvas object that contains input image
  webdnn_input_view.set(await WebDNN.Image.getImageArray(canvas_draw, {
    /* convert image on canvas into input array (Float32Array, 28px*28px*1ch=784 dimension, black=0.0 and white=1.0) */
    dstH: 28, dstW: 28,
    order: WebDNN.Image.Order.HWC, // for Keras
    // order: WebDNN.Image.Order.CHW, // for Chainer (but the same as HWC because channel=1 in MNIST)
    color: WebDNN.Image.Color.GREY,
    bias: [0, 0, 0],
    scale: [255, 255, 255]
  }));

  // run the DNN
  // DNNモデルを実行します
  await webdnn_runner.run();

  // get model output as Float32Array
  // モデルの出力をFloat32Array形式で取得します
  var probabilities = webdnn_output_view.toActual();
  // 'probabilities' is array containing each class's probability (0.0 to 1.0)
  // 'probabilities'は各クラスの確率(0.0~1.0)を格納しています
  // display the result
  // 結果を表示します
  var result_html = '';
  for (var i = 0; i < 10; i++) {
    var probability_percent = Math.floor(probabilities[i] * 100);
    result_html += '' + i + ': ' + probability_percent + '%<br>'; // <br> makes new line (<br>は改行を表します)
  }
  // display result in 'result' element
  // 'result'要素に結果を表示します
  document.getElementById('result').innerHTML = result_html;

  console.log('End of calculate()');
}

window.addEventListener('load', function () {
  initialize().then(() => { }).catch((reason) => {
    console.error('Failed to initialize', reason);
  });
});
