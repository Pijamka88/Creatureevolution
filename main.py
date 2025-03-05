
from flask import Flask, render_template, request, jsonify
import os
import logging
import hashlib
import hmac
import base64
import json
from time import time

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key")

# Get your bot token from BotFather and store it as an environment variable
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "your_bot_token_here")

def verify_telegram_data(init_data):
    """Verify the data received from Telegram"""
    if not init_data:
        return False
    
    # Parse init_data
    data_dict = {}
    for item in init_data.split('&'):
        key, value = item.split('=')
        data_dict[key] = value
        
    # Extract the hash and data to check
    received_hash = data_dict.get('hash', '')
    
    # Remove hash from the data
    check_string = init_data.replace(f'hash={received_hash}', '').strip('&')
    
    # Generate the secret key
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    
    # Calculate the data check hash
    calculated_hash = hmac.new(
        secret_key,
        check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == received_hash

@app.route('/')
def index():
    # Render the Telegram Web App
    return render_template('index.html')

@app.route('/game-data', methods=['POST'])
def game_data():
    # Endpoint to receive game data from the client
    data = request.json
    
    # Verify Telegram data (should be sent in headers or as part of the request)
    init_data = request.headers.get('X-Telegram-Init-Data')
    if not verify_telegram_data(init_data):
        return jsonify({"error": "Invalid Telegram data"}), 403
    
    # Here you would process the game data
    # For example, save scores to a database
    
    return jsonify({"success": True, "message": "Score saved"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)