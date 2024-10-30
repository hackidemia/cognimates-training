// Automatically initialize vision classifier with server-side API key
document.addEventListener('DOMContentLoaded', function() {
    // Hide the API key input step since we're using server-side keys
    const apiKeyStep = document.querySelector('.stepper__step:nth-child(2)');
    if (apiKeyStep) {
        apiKeyStep.style.display = 'none';
    }

    // Update step numbers
    const steps = document.querySelectorAll('.stepper__step');
    steps.forEach((step, index) => {
        const numberSpan = step.querySelector('.step__number');
        if (numberSpan && step.style.display !== 'none') {
            numberSpan.textContent = index + 1;
        }
    });

    // Simulate API key being set to enable next steps
    const event = new CustomEvent('apiKeySet', { detail: { success: true } });
    document.dispatchEvent(event);
});
