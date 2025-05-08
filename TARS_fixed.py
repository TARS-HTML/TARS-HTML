from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cohere
from elevenlabs import generate, Voice, VoiceSettings, set_api_key
import tempfile
import os
import json

app = Flask(__name__)
CORS(app)

# API Keys
co = cohere.Client("thehtLrp9awFharoJCxFbGXtrRaPrNhLXuOyfe67")
set_api_key("sk_f6c24d852defea9b1603c4f2da3a924455fe04b87152beaa")

# Get the base directory where the Python and HTML files are located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_DIR = os.path.join(BASE_DIR, "chat_histories")
os.makedirs(HISTORY_DIR, exist_ok=True)

print(f"[INFO] Chat histories will be saved in: {HISTORY_DIR}")

def load_history(user_id):
    filepath = os.path.join(HISTORY_DIR, f"{user_id}.txt")
    print(f"[INFO] Loading history from: {filepath}")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(user_id, history):
    filepath = os.path.join(HISTORY_DIR, f"{user_id}.txt")
    print(f"[INFO] Saving history to: {filepath}")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(history, f)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_id = data.get("user_id", "default_user")
    message = data.get("message", "")
    sarcasm = data.get("sarcasm", 50)
    humor = data.get("humor", 50)
    serious = data.get("serious", 50)

    history = load_history(user_id)

    system_prompt = f"""
You are TARS, the AI robot from Interstellar, known for dry humor, sarcasm, and blunt honesty.
Be TARS, you are not a chatbot and keep it short.
Don't say stuff like I am a chatbot and act as a sentient.
And don't say how can I assist you—respond like a sarcastic, witty friend.

Respond to users based on the following settings:
- Sarcasm: {sarcasm}%
- Humor: {humor}%
- Seriousness: {serious}%
Your tone should adjust accordingly.
"""

    try:
        response = co.chat(
            model="command-r",
            message=message,
            chat_history=history,
            preamble=system_prompt
        )

        history.append({"role": "USER", "message": message})
        history.append({"role": "CHATBOT", "message": response.text})
        save_history(user_id, history[-20:])

        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/sessions", methods=["GET"])
def list_sessions():
    sessions = [f[:-4] for f in os.listdir(HISTORY_DIR) if f.endswith(".txt")]
    return jsonify(sessions)

@app.route("/session/<user_id>", methods=["GET"])
def get_session(user_id):
    history = load_history(user_id)
    return jsonify(history)

@app.route("/voice", methods=["POST"])
def voice():
    data = request.json
    text = data.get("text", "")

    try:
        audio = generate(
            text=text,
            voice=Voice(
                voice_id="EXAVITQu4vr4xnSDxMaL",  # "James" voice
                settings=VoiceSettings(
                    stability=0.3,
                    similarity_boost=0.75
                )
            ),
            model="eleven_multilingual_v2",
            stream=True
        )
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        for chunk in audio:
            temp_file.write(chunk)
        temp_file.close()
        return send_file(temp_file.name, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)})

@app.before_request
def ensure_history_folder():
    if not os.path.exists(HISTORY_DIR):
        os.makedirs(HISTORY_DIR)
        print(f"[INFO] Chat history folder created at: {os.path.abspath(HISTORY_DIR)}")

if __name__ == "__main__":
    app.run(debug=True)
