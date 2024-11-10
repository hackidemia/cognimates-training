// Test Image Loader Script
(function() {
    // Expose loadTestImages function globally
    window.loadTestImages = async function() {
        try {
            console.log('Starting test image loading process...');
            console.log('Checking project name...');

            // Get the project name from the disabled input field
            const projectNameInput = document.querySelector('input[disabled][type="text"]');
            if (!projectNameInput || !projectNameInput.value) {
                console.error('Project name not set. Please set a project name before loading test images.');
                return;
            }
            console.log('Project name verified:', projectNameInput.value);

            // Verify dropzones are available
            console.log('Checking dropzone initialization...');

            // Find dropzone elements and their Dropzone instances
            const dropzones = document.querySelectorAll('.dropzone--categories');
            console.log('Found dropzone elements:', dropzones.length);

            // Get Dropzone instances
            const catsDropzone = Dropzone.instances.find(dz => dz.element.querySelector('div').textContent.includes('cats'));
            const dogsDropzone = Dropzone.instances.find(dz => dz.element.querySelector('div').textContent.includes('dogs'));

            if (!catsDropzone || !dogsDropzone) {
                console.error('Category dropzones not found. Please add both cats and dogs categories first.');
                return;
            }

            console.log('Dropzones verified, loading cat images...');

            // Load cat images (10 images)
            for (let i = 1; i <= 10; i++) {
                try {
                    console.log(`Fetching cat${i}.jpg...`);
                    const response = await fetch(`/static/test_images/cats/cat${i}.jpg`);
                    if (!response.ok) {
                        console.error(`Failed to fetch cat${i}.jpg:`, response.statusText);
                        continue;
                    }
                    const imageBlob = await response.blob();
                    const file = new File([imageBlob], `cat${i}.jpg`, { type: 'image/jpeg' });
                    catsDropzone.addFile(file);
                    console.log(`Successfully added cat${i}.jpg to cats dropzone`);
                } catch (err) {
                    console.error(`Error loading cat${i}.jpg:`, err);
                }
            }

            console.log('Loading dog images...');

            // Load dog images (10 images)
            for (let i = 1; i <= 10; i++) {
                try {
                    console.log(`Fetching dog${i}.jpg...`);
                    const response = await fetch(`/static/test_images/dogs/dog${i}.jpg`);
                    if (!response.ok) {
                        console.error(`Failed to fetch dog${i}.jpg:`, response.statusText);
                        continue;
                    }
                    const imageBlob = await response.blob();
                    const file = new File([imageBlob], `dog${i}.jpg`, { type: 'image/jpeg' });
                    dogsDropzone.addFile(file);
                    console.log(`Successfully added dog${i}.jpg to dogs dropzone`);
                } catch (err) {
                    console.error(`Error loading dog${i}.jpg:`, err);
                }
            }

            console.log('Test image loading process completed');

        } catch (error) {
            console.error('Error loading test images:', error);
        }
    };

    // Function to initialize button click handler
    function initializeButtonHandler() {
        console.log('Initializing test image loader button handler...');
        const button = document.querySelector('.js--test-image-loader');
        if (button) {
            console.log('Test image loader button found, attaching click handler...');
            button.addEventListener('click', window.loadTestImages);
            console.log('Click handler attached successfully');
        } else {
            console.error('Test image loader button not found in DOM');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        console.log('Document still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', initializeButtonHandler);
    } else {
        console.log('Document already loaded, initializing immediately...');
        initializeButtonHandler();
    }

    // Additional initialization check after a short delay
    setTimeout(() => {
        console.log('Performing delayed initialization check...');
        if (!document.querySelector('.js--test-image-loader')) {
            console.log('Button not found in delayed check, attempting to initialize again...');
            initializeButtonHandler();
        }
    }, 1000);
})();
