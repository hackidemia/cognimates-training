window.addEventListener('DOMContentLoaded', () => {
    console.log('Application initialized');
    initializeUI();
});

function initializeUI() {
    // Initialize project name handling
    $('.js--project--name__button').click(function() {
        const projectName = $('#input_projectName').val().trim();
        if (projectName === '') {
            showWarningNotification('Enter a project name.', true, false);
            return;
        }
        window.projectName = projectName;
        $('#span_project_name').html(projectName);
        $('.js--project--name__button').attr('disabled', '');
        $('#input_projectName').attr('disabled', '');
        showSuccessNotification('Project name set successfully!');
    });

    // Initialize notifications
    if (!window.notificationTimeout) {
        window.notificationTimeout = null;
    }
}

function showWarningNotification(message, autoHide = true, showIcon = true) {
    const notificationElement = $('.js--notification');
    const notificationContentElement = $('.js--notification__content');
    const notificationIconElement = $('.js--notification__icon');

    notificationElement.removeClass('notification--success notification--error').addClass('notification--warning');
    notificationContentElement.html(message);

    if (showIcon) {
        notificationIconElement.removeClass('fa-check-circle fa-times-circle').addClass('fa-exclamation-triangle');
        notificationIconElement.show();
    } else {
        notificationIconElement.hide();
    }

    notificationElement.addClass('notification--show');

    if (autoHide) {
        if (window.notificationTimeout) {
            clearTimeout(window.notificationTimeout);
        }
        window.notificationTimeout = setTimeout(() => {
            notificationElement.removeClass('notification--show');
        }, 3000);
    }
}

function showSuccessNotification(message, autoHide = true) {
    const notificationElement = $('.js--notification');
    const notificationContentElement = $('.js--notification__content');
    const notificationIconElement = $('.js--notification__icon');

    notificationElement.removeClass('notification--warning notification--error').addClass('notification--success');
    notificationContentElement.html(message);
    notificationIconElement.removeClass('fa-exclamation-triangle fa-times-circle').addClass('fa-check-circle');
    notificationIconElement.show();

    notificationElement.addClass('notification--show');

    if (autoHide) {
        if (window.notificationTimeout) {
            clearTimeout(window.notificationTimeout);
        }
        window.notificationTimeout = setTimeout(() => {
            notificationElement.removeClass('notification--show');
        }, 3000);
    }
}

function showErrorNotification(message, autoHide = true) {
    const notificationElement = $('.js--notification');
    const notificationContentElement = $('.js--notification__content');
    const notificationIconElement = $('.js--notification__icon');

    notificationElement.removeClass('notification--warning notification--success').addClass('notification--error');
    notificationContentElement.html(message);
    notificationIconElement.removeClass('fa-exclamation-triangle fa-check-circle').addClass('fa-times-circle');
    notificationIconElement.show();

    notificationElement.addClass('notification--show');

    if (autoHide) {
        if (window.notificationTimeout) {
            clearTimeout(window.notificationTimeout);
        }
        window.notificationTimeout = setTimeout(() => {
            notificationElement.removeClass('notification--show');
        }, 3000);
    }
}

// Initialize global variables
window.labels = [];
window.dropZoneMap = {};
window.apiKey = undefined;
window.projectName = '';
window.examples = {};

// Export functions for use in other scripts
window.showWarningNotification = showWarningNotification;
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;
