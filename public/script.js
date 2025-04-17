// Add these loading functions at the top of script.js
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

let currentScenario = null;
let currentStepIndex = 0;
// Registration function
async function startSession() {
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();

    if (!firstName || !lastName || !email.endsWith('@hwdsb.on.ca')) {
        alert('Please fill all fields with valid HWDSB email');
        return;
    }

    try {
        showLoading();
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email }),
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Registration failed');
        
        const result = await response.json();
        window.location.href = result.redirectTo;

    } catch (error) {
        alert(error.message);
        window.location.href = '/';
    } finally {
        hideLoading();
    }
}

// Loading functions
// Rest of your existing scenario code...
// Scenario loader
async function loadRandomScenario() {
    try {
        const response = await fetch('/scenarios');
        const scenarios = await response.json();
        
        currentScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        currentStepIndex = 0;
        
        document.getElementById('completion').style.display = 'none';
        document.getElementById('chat').innerHTML = '';
        document.getElementById('choices').innerHTML = '';
        
        processStep();
        
    } catch (error) {
        alert('Failed to load scenarios');
    }
}

// Existing scenario handling functions remain unchanged
function processStep() {
    const step = currentScenario.steps[currentStepIndex];
    
    if (!step) {
        showCompletion();
        return;
    }

    if (step.type === 'message') {
        addMessage(step.from, step.text);
        currentStepIndex++;
        setTimeout(processStep, step.delay);
    } else if (step.type === 'choices') {
        showChoices(step.options);
    }
}

function showCompletion() {
    document.getElementById('completion').style.display = 'block';
}

function addMessage(sender, text) {
    const chat = document.getElementById('chat');
    const message = document.createElement('div');
    message.className = `message ${sender}`;
    message.textContent = text;
    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
}

function showChoices(options) {
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = options.map(option => `
        <button class="${option.result}" 
                onclick="handleChoice('${option.result}')">
            ${option.text}
        </button>
    `).join('');
}

function showCompletionScreen() {
    const chat = document.getElementById('chat');
    const choices = document.getElementById('choices');
    const completion = document.getElementById('completion');
    
    // Clear existing content
    chat.innerHTML = '';
    choices.innerHTML = '';
    
    // Show completion message
    completion.innerHTML = `
        <h2>Great Job! 🎉</h2>
        <p>You've successfully navigated this scenario!</p>
        <button onclick="resetScenario()">Play Again!!</button>
    `;
    completion.style.display = 'block';
}

function resetScenario() {
    const completion = document.getElementById('completion');
    completion.style.display = 'none';
    currentScenario = null;
    currentStepIndex = 0;
    loadRandomScenario();
}

function handleChoice(result) {
    const success = result === 'good' || result === 'block';
    
    switch(result) {
        case 'block':
            addMessage('system', '🚫 User blocked successfully');
            break;
        case 'good':
            addMessage('system', '✅ Boundary set successfully');
            break;
        case 'bad':
            addMessage('them', 'Why are you being like this?');
            break;
    }
    
    setTimeout(() => {
        showCompletionScreen();
    }, 1500);
}
// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#main-content') {
        document.getElementById('start-page').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        loadRandomScenario();
    }
});