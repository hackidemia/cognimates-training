// Utility functions for vision classifier

async function preprocessTrainData() {
    try {
        // First, create the classifier
        const createResponse = await $.ajax({
            url: '/vision/classifier',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                name: window.projectName,
                concepts: window.labels
            })
        });

        console.log('Classifier created:', createResponse);

        // Prepare training data
        const trainingData = [];
        for (const category of window.labels) {
            const dropzone = window.dropZoneMap[category];
            if (!dropzone) {
                throw new Error(`Dropzone not found for category: ${category}`);
            }

            const files = dropzone.getAcceptedFiles();
            if (files.length < 10) {
                throw new Error(`Please add at least 10 images for category: ${category}`);
            }

            for (const file of files) {
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        trainingData.push({
                            category: category,
                            image: reader.result.split(',')[1] // Get base64 data without prefix
                        });
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }
        }

        // Train the classifier
        const trainResponse = await $.ajax({
            url: '/api/vision/train',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                name: window.projectName,
                images: trainingData
            })
        });

        console.log('Training initiated:', trainResponse);
        showSuccessNotification('Training started successfully!');
        setTrainButtonState('finished');
    } catch (error) {
        console.error('Error during training:', error);
        showErrorNotification(error.message || 'Error during training process');
        setTrainButtonState('normal');
    }
}

function setTrainButtonState(state) {
    const button = $('.js--train__button');
    const icon = button.find('i');
    const text = button.find('span');

    switch (state) {
        case 'normal':
            button.removeClass('disabled');
            icon.attr('class', 'fas fa-play');
            text.text('Train');
            break;
        case 'training':
            button.addClass('disabled');
            icon.attr('class', 'fas fa-spinner fa-spin');
            text.text('Training...');
            break;
        case 'finished':
            button.removeClass('disabled');
            icon.attr('class', 'fas fa-check');
            text.text('Trained');
            break;
    }
}

function showSuccessNotification(message) {
    new Noty({
        type: 'success',
        text: message,
        timeout: 3000,
        progressBar: true
    }).show();
}

function showErrorNotification(message) {
    new Noty({
        type: 'error',
        text: message,
        timeout: 5000,
        progressBar: true
    }).show();
}

function showWarningNotification(message, closeWith = false) {
    new Noty({
        type: 'warning',
        text: message,
        timeout: closeWith ? 3000 : false,
        progressBar: closeWith
    }).show();
}
