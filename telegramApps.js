
// Initialize Telegram Web App
const tg = window.Telegram.WebApp;

// Expand the web app to full height
tg.expand();

// Setting theme
document.body.className = tg.colorScheme;

// Function to send score to bot
function sendScoreToBot(score, size) {
    // Get user info if available
    const user = tg.initDataUnsafe?.user || {};
    
    const gameData = {
        score: score,
        size: size,
        userId: user.id || 'unknown',
        username: user.username || 'anonymous',
        timestamp: new Date().toISOString()
    };
    
    // You can use this to send data to your backend
    fetch('/game-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData
        },
        body: JSON.stringify(gameData)
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch(error => console.error('Error:', error));
    
    // You can also use this to send data back to the Telegram bot
    tg.sendData(JSON.stringify(gameData));
}

// Function to show game completion in Telegram
function completeGame(score, size) {
    // Send final score to bot
    sendScoreToBot(score, size);
    
    // Close the Web App and send the data back
    tg.close();
}

// Telegram button to show in the game
function showTelegramBackButton() {
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
        // Handle back button click
        if (confirm('Are you sure you want to exit the game?')) {
            tg.close();
        }
    });
}

// Hide the back button when not needed
function hideTelegramBackButton() {
    tg.BackButton.hide();
}

// Telegram haptic feedback
function telegramHapticFeedback(type) {
    switch(type) {
        case 'notification':
            tg.HapticFeedback.notificationOccurred('success');
            break;
        case 'impact':
            tg.HapticFeedback.impactOccurred('medium');
            break;
        case 'selection':
            tg.HapticFeedback.selectionChanged();
            break;
    }
}