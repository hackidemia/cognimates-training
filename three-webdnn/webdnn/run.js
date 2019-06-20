let WebDNN = require('webdnn');


let runner, image, probabilities;


async function init() {
    // Initialize descriptor runner
    runner = await WebDNN.load('./output');
    image = runner.inputs[0]; 
    probabilities = runner.outputs[0];
}

async function run() {
    // Set the value into input variable.
    image.set(await WebDNN.Image.getImageArray('./input_image.png'));
    
    // Run
    await runner.run(); 

    // Show the result
    console.log('Output', WebDNN.Math.argmax(probabilities));
}