'use strict';

var imageDataArray = [];

async function run_entry() {
    try {
        await populateImageDataArray();
        await run();
        console.log('Run finished');
        //log('Run finished');

    } catch (error) {
        console.log('Error: ' + error);
        //log('Error: ' + error);
    }
}

function getRawData(){
    var dfrd1 = $.Deferred();
    setTimeout(function(){
        // doing async stuff
        run_entry();
        console.log('task 1 in getRawData is done!');
        dfrd1.resolve();
    }, 2000);
    return dfrd1.promise();
}

function log(msg) {
    let msg_node = document.getElementById('messages');
    msg_node.appendChild(document.createElement('br'));
    msg_node.appendChild(document.createTextNode(msg));
}

/* No need to show image on webpage
async function loadImage() {
     let imageData = await WebDNN.Image.getImageArray(document.getElementById("image_url").value, {dstW: 224, dstH: 224});
    //let imageData = await WebDNN.Image.getImageArray(requestData["cat"][0], {dstW: 224, dstH: 224});
    WebDNN.Image.setImageArrayToCanvas(imageData, 224, 224, document.getElementById('input_image'));

    document.getElementById('run_button').disabled = false;
    console.log('Image loaded to canvas');
    //log('Image loaded to canvas');
}
*/

let runners = {};

/* No need to select framework
function getFrameworkName() {
    return document.querySelector('input[name=framework]:checked').value;
}
*/

async function prepare_run() {
    let backend_name = "webgl";
    let framework_name = "keras";
    let backend_key = backend_name + framework_name;
    if (!(backend_key in runners)) {
        console.log('Initializing and loading model');
        //log('Initializing and loading model');
        let runner = await WebDNN.load(`./output_${framework_name}`, {backendOrder: backend_name});
        console.log(`Loaded backend: ${runner.backendName}, version: ${runner.descriptor.converted_at}`);
        //log(`Loaded backend: ${runner.backendName}, version: ${runner.descriptor.converted_at}`);

        runners[backend_key] = runner;
    } else {
        console.log('Model is already loaded');
        //log('Model is already loaded');
    }
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

    /* No need to use chainer/pytorch
    if (getFrameworkName() === 'chainer' || getFrameworkName() === 'pytorch') {
        image_options.order = WebDNN.Image.Order.CHW;
    }

    if (getFrameworkName() === 'pytorch') {
        image_options.color = WebDNN.Image.Color.RGB;
        image_options.scale = [58.40, 57.12, 57.38];
    }
    */

    //var imageData = canvas.getContext('2d').createImageData(224, 224);
    //imageData.data.set(requestData["cat"][1]);
    
    var mulNum =1;
    for (let idx = 0; idx < imageDataArray.length; idx++) {
        const imageData = imageDataArray[idx];
        x.set(await WebDNN.Image.getImageArray(imageData, image_options));
        // x.set(await WebDNN.Image.getImageArray(document.getElementById('input_image'), image_options));
    
        let start = performance.now();
        await runner.run();
        let elapsed_time = performance.now() - start;
    
        let top_labels = WebDNN.Math.argmax(y, 5);
        let predicted_str = 'Predicted:';
        for (let j = 0; j < top_labels.length; j++) {
            predicted_str += ` ${top_labels[j]}(${imagenet_labels[top_labels[j]]})`;
        }
        console.log(predicted_str);
        //log(predicted_str);
    
        console.log('output vector: ', y.toActual());
        let tmpy = y.toActual();
        if (idx == 0){
            mulNum = Math.ceil(1/Math.min(...tmpy));
        }
        console.log("----------->");
        console.log(mulNum);
        let result = tmpy.map(function(x) { return x * mulNum; });
        console.log(`Total Elapsed Time[ms/image]: ${elapsed_time.toFixed(2)}`);
        //log(`Total Elapsed Time[ms/image]: ${elapsed_time.toFixed(2)}`);
        resultArray.push(result);
    }
}


async function populateImageDataArray(){
    console.log('Start load image');
    Object.keys(requestData).forEach(function(key) {
        requestData[key].forEach(function (arrayItem) {
            var myImage = new Image();
            myImage.src = arrayItem;
            myImage.onload = function() {
                console.log('End load image');
                var canvas = document.createElement('canvas');
                //document.body.appendChild(canvas);
                var context = canvas.getContext('2d');
                
                context.drawImage(myImage, 0, 0);
                var imageData = context.getImageData(0, 0, 224,224);
                console.log(imageData);
                imageDataArray.push(imageData);
            };
        });
    });
}
