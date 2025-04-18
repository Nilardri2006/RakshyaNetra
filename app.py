from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
client = MongoClient('localhost', 27017)
db = client['womens_safety']

# Twilio setup
twilio_client = Client(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))

@app.route('/api/trigger-sos', methods=['POST'])
def trigger_sos():
    try:
        data = request.get_json()
        contacts = data.get('contacts', [])
        user_name = data.get('user_name', 'User')
        location = data.get('location', 'Unknown location')
        
        if not contacts:
            return jsonify({"error": "No emergency contacts provided"}), 400

        message = f"🚨 EMERGENCY ALERT 🚨 HELP!! \n{user_name} needs immediate help!\nLast known location: {location}"
        
        errors = []
        for number in contacts:
            try:
                twilio_client.messages.create(
                    body=message,
                    from_=os.getenv('TWILIO_PHONE_NUMBER'),
                    to=number
                )
            except Exception as e:
                errors.append(str(e))
        
        if errors:
            return jsonify({
                "message": f"Sent to {len(contacts)-len(errors)}/{len(contacts)} contacts",
                "errors": errors
            }), 207
            
        return jsonify({"message": "Alerts sent to all contacts!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Routes to serve HTML pages
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/report')
def report():
    return render_template('report.html')

@app.route('/incidents')
def show_incidents():
    # Fetch all incidents from MongoDB, newest first
    all_incidents = list(db.incidents.find().sort('_id', -1))
    return render_template('incidents.html', incidents=all_incidents)


@app.route('/safety-map')
def safety_map():
    return render_template('safety-map.html')

@app.route('/tips')
def tips():
    return render_template('tips.html')

@app.route('/community')
def community():
    return render_template('community.html')

@app.route('/sos')
def sos():
    return render_template('sos.html')

# API Endpoints
@app.route('/api/report-incident', methods=['POST'])
def report_incident():
    data = request.get_json()
    result = db.incidents.insert_one(data)
    return jsonify({"message": "Incident reported", "id": str(result.inserted_id)}), 201

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    incidents = list(db.incidents.find({}, {'_id': 0}))
    return jsonify(incidents)

@app.route('/api/heatmap-data')
def heatmap_data():
    return jsonify([
        {"lat": 40.7128, "lng": -74.0060, "weight": 5},
        {"lat": 40.715, "lng": -74.009, "weight": 3},
        # Add more sample data points
    ])


if __name__ == '__main__':
    app.run(debug=True)
