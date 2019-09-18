'use strict';

var imageDataArray = [];

async function run_entry() {
    try {
        await populateImageDataArray();
        //updateProgressBar(55);
        await run();

    } catch (error) {
        console.log('Error: ' + error);
    }
}

function getRawData(){
    var dfrd1 = $.Deferred();
    setTimeout(function(){
        run_entry();
        dfrd1.resolve();
    }, 0);
    return dfrd1.promise();
}

function log(msg) {
    let msg_node = document.getElementById('messages');
    msg_node.appendChild(document.createElement('br'));
    msg_node.appendChild(document.createTextNode(msg));
}

let runners = {};

async function prepare_run() {
    let backend_name = "webgl";
    let framework_name = "keras";
    let backend_key = backend_name + framework_name;
    if (!(backend_key in runners)) {
        console.log('Initializing and loading model');
        let runner = await WebDNN.load(`./output_${framework_name}`, {backendOrder: backend_name});
        console.log(`Loaded backend: ${runner.backendName}, version: ${runner.descriptor.converted_at}`);
        runners[backend_key] = runner;
    } else {
        console.log('Model is already loaded');
    }
    //updateProgressBar(60);
    return runners[backend_key];
}

async function run() {
    let runner = await prepare_run();

    let x = runner.inputs[0];
    let y = runner.outputs[0];

    let image_options = {
        order: WebDNN.Image.Order.HWC,
        color: WebDNN.Image.Color.BGR,
        bias: [123.68, 116.779, 103.939],
    };

    
    var mulNum =1;
    for (let idx = 0; idx < imageDataArray.length; idx++) {

        const imageData = imageDataArray[idx];
        x.set(await WebDNN.Image.getImageArray(imageData, image_options));
    
        let start = performance.now();
        await runner.run();
        let elapsed_time = performance.now() - start;
    
        let top_labels = WebDNN.Math.argmax(y, 5);
        let predicted_str = 'Predicted:\n';
        for (let j = 0; j < top_labels.length; j++) {
            predicted_str += `${imagenet_labels[top_labels[j]]}`;
            predicted_str += '\n';
        }

        let tmpy = y.toActual();
        if (idx == 0){
            mulNum = Math.ceil(1/Math.min(...tmpy));
        }
        let result = tmpy.map(function(x) { return x * 1; });
        //let result = tmpy;
        labels.push(predicted_str);
        resultArray.push(result);
    }
}


async function populateImageDataArray(){
    Object.keys(requestData).forEach(function(key) {
        requestData[key].forEach(function (arrayItem) {
            var myImage = new Image();
            myImage.src = arrayItem;
            myImage.onload = function() {
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                
                context.drawImage(myImage, 0, 0);
                var imageData = context.getImageData(0, 0, 224,224);
                imageDataArray.push(imageData);
            };
        });
    });
}
