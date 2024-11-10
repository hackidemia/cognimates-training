// Vision Classifier Initialization and Management
$(document).ready(function() {
    // Initialize global variables
    window.labels = [];
    window.dropZoneMap = {};

    // Initialize project name from disabled input field
    const projectNameInput = $('#input_projectName');
    window.projectName = projectNameInput.val()?.trim() || undefined;

    // Initialize project name input handler
    projectNameInput.on('change', function() {
        window.projectName = $(this).val().trim();
    });

    // Initialize category input handlers
    $('#input_categoryName').keypress((e) => {
        if (e.which == 13) {
            $('#button_categoryName').trigger('click');
            e.preventDefault();
            return false;
        }
    });

    $('#button_categoryName').click(function() {
        if ($('#input_categoryName').val() == '') {
            showWarningNotification('Enter a category name.', true, false);
            return;
        }
        var format = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        var categoryName = $('#input_categoryName').val();
        categoryName = categoryName.trim();
        if (format.test(categoryName) != false) {
            showWarningNotification('Category name should have only letters and numbers.', true, false);
            return;
        }
        if (window.labels.includes(categoryName)) {
            showWarningNotification('A category with this name already exists. Enter a different name.', true, false);
            return;
        }
        window.labels.push(categoryName);
        createCategoryHTMLElement(categoryName);
        $('#input_categoryName').val('');
    });

    // Initialize train button handler
    $('.js--train__button').on('click', function() {
        if (!window.projectName) {
            showWarningNotification('Please enter a project name.', true, false);
            return;
        }
        var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        if (format.test(window.projectName) != false) {
            showWarningNotification('Project name should have only letters and numbers.', true, false);
            return;
        }
        if (window.labels.length < 2) {
            showWarningNotification('Please add at least two categories.', true, false);
            return;
        }
        setTrainButtonState('training');
        preprocessTrainData();
    });
});

function createCategoryHTMLElement(categoryName) {
    const htmlStructure = `<div class="category__container
                                    js--dropzone__category__container--${categoryName}">
        <div class="category__box
                    category__box--dashed
                    category__box--vision">
            <form action="/file/post"
                   class="dropzone--categories
                           js--dropzone__category--${categoryName}">
                <div class="category__name">
                    ${categoryName}
                </div>
                <div class="dropzone__header
                            js--dropzone__header--${categoryName}">
                    <i class="fas fa-cloud-upload-alt
                                dropzone__upload-icon"></i>
                    <span class="dropzone__label">Drag and drop 10 or more images</span>
                </div>
                <div class="js--dropzone__previews-container dropzone-previews"
                     id="js--dropzone__previews-container_${categoryName}">
                </div>
                <div class="dropzone__error-container"></div>
            </form>
        </div>
        <a href="#" class="category--vision__remove-button
                            btn btn-primary
                            js--${categoryName}-category--vision__remove"
                    role="button">
            <i class="fas fa-times"></i>
        </a>
    </div>`;

    const htmlElement = $(htmlStructure);
    const categoriesContainerElement = $('#categoriesContainer');
    categoriesContainerElement.append(htmlElement);
    initDropZoneForClass(categoryName);
}

function initDropZoneForClass(categoryName) {
    const dropzoneFormClass = `.js--dropzone__category--${categoryName}`;
    const dropzonePreviewsContainerId = `#js--dropzone__previews-container_${categoryName}`;
    const dropzoneRemoveClass = `.js--${categoryName}-category--vision__remove`;

    const dropzoneCategoryInstance = new Dropzone(dropzoneFormClass, {
        url: "/file/post",
        paramName: "category-image",
        maxFilesize: 5,
        maxFiles: 20,
        autoProcessQueue: false,
        dictRemoveFile: "",
        acceptedFiles: ".jpg,.jpeg,.png",
        addRemoveLinks: true,
        thumbnailWidth: 80,
        thumbnailHeight: 80,
        previewsContainer: document.querySelector(dropzonePreviewsContainerId),
        init: function() {
            this.on("error", function(file) {
                if (!file.accepted) {
                    this.removeFile(file);
                    if ((file.size/1048576) >= 1) {
                        showWarningNotification('Add an image less than 5MB.');
                    }
                }
            });
            this.on("addedfile", (file) => {
                if (this.getAcceptedFiles().length == 0) {
                    $(`.js--dropzone__header--${categoryName}`).hide();
                }
            });
            this.on("removedfile", (file) => {
                if (this.getAcceptedFiles().length == 0) {
                    $(`.js--dropzone__header--${categoryName}`).show();
                }
            });
        }
    });

    $(dropzoneRemoveClass).click((e) => {
        e.preventDefault();
        removeDropZoneByClass(categoryName);
    });

    window.dropZoneMap[categoryName] = dropzoneCategoryInstance;
}
