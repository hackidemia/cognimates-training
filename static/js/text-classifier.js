// Text classification functionality
$(document).ready(function() {
    let projectName = '';
    let categories = new Set();
    let trainingData = {};

    // Set project name
    $('button[devin-id="7"]').click(function() {
        const name = $('input[devin-id="6"]').val();
        if (!name.match(/^[a-zA-Z0-9_-]+$/)) {
            showErrorNotification('Project name should have only letters, numbers, underscores, and hyphens');
            return;
        }
        projectName = name;
        showNotification('Project name set to: ' + name);
    });

    // Add category
    $('button[devin-id="10"]').click(function() {
        const category = $('input[devin-id="9"]').val().trim();
        if (!category) {
            showErrorNotification('Please enter a category name');
            return;
        }
        if (categories.has(category)) {
            showErrorNotification('Category already exists');
            return;
        }
        categories.add(category);
        trainingData[category] = [];
        showNotification('Added category: ' + category);

        // Create training input section for this category
        const inputHtml = `
            <div class="category-section" data-category="${category}">
                <h3>${category}</h3>
                <input type="text" placeholder="Enter text to train..." class="training-input">
                <button class="btn btn-primary add-example">Add Example</button>
                <div class="examples-list"></div>
            </div>
        `;
        $('.categories-container').append(inputHtml);
    });

    // Add training example
    $(document).on('click', '.add-example', function() {
        const categorySection = $(this).closest('.category-section');
        const category = categorySection.data('category');
        const text = categorySection.find('.training-input').val().trim();

        if (!text) {
            showErrorNotification('Please enter text for training');
            return;
        }

        if (!trainingData[category]) {
            trainingData[category] = [];
        }

        trainingData[category].push(text);
        showNotification('Added example for ' + category);

        // Display the example
        const exampleHtml = `<div class="example">${text}</div>`;
        categorySection.find('.examples-list').append(exampleHtml);
        categorySection.find('.training-input').val('');
    });

    // Train model
    $('button[devin-id="12"]').click(function() {
        if (!projectName) {
            showErrorNotification('Please set a project name first');
            return;
        }

        if (categories.size < 2) {
            showErrorNotification('Please add at least 2 categories');
            return;
        }

        // Format training data for API
        const formattedData = [];
        for (const category of categories) {
            if (!trainingData[category] || trainingData[category].length < 10) {
                showErrorNotification(`Please add at least 10 examples for ${category}`);
                return;
            }
            trainingData[category].forEach(text => {
                formattedData.push({
                    text: text,
                    className: category
                });
            });
        }

        // Send training request
        $.ajax({
            url: '/nlc/classifier',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                classifier_name: projectName,
                training_data: formattedData
            }),
            success: function(response) {
                showNotification('Model trained successfully!');
            },
            error: function(xhr, status, error) {
                showErrorNotification('Training failed: ' + (xhr.responseJSON?.error || error));
            }
        });
    });

    // Predict
    $('button[devin-id="15"]').click(function() {
        const text = $('input[devin-id="14"]').val().trim();
        if (!text) {
            showErrorNotification('Please enter text to classify');
            return;
        }
        if (!projectName) {
            showErrorNotification('Please set a project name first');
            return;
        }

        $.ajax({
            url: '/nlc/classify',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                classifier_name: projectName,
                text: text
            }),
            success: function(response) {
                let resultText = 'Classification results:\n';
                for (const [category, confidence] of Object.entries(response)) {
                    resultText += `${category}: ${(confidence * 100).toFixed(2)}%\n`;
                }
                showNotification(resultText);
            },
            error: function(xhr, status, error) {
                showErrorNotification('Classification failed: ' + (xhr.responseJSON?.error || error));
            }
        });
    });
});
