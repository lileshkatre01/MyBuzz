from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from database import get_db_connection, init_db
from werkzeug.security import check_password_hash, generate_password_hash
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)

import random
# In-memory OTP storage: Key -> (email.lower(), role), Value -> { 'otp': otp, 'timestamp': datetime }
otp_store = {}


# Decorator to restrict access by role
def role_required(role):
    def decorator(f):
        from functools import wraps
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session or session.get('role') != role:
                if request.path.startswith('/api/'):
                    return jsonify({'error': 'Unauthorized. Please login.'}), 401
                return redirect(url_for('login_page', role=role))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Decorator to restrict access to logged-in users of any role
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized. Please login.'}), 401
        return f(*args, **kwargs)
    return decorated_function


# --- Frontend Page Routes ---

@app.route('/')
@role_required('passenger')
def passenger_dashboard():
    return render_template('passenger.html', username=session.get('username'))

@app.route('/driver')
@role_required('driver')
def driver_dashboard():
    return render_template('driver.html', username=session.get('username'))

@app.route('/login')
def login_page():
    # If already logged in, redirect to correct dashboard
    if 'user_id' in session:
        if session.get('role') == 'driver':
            return redirect(url_for('driver_dashboard'))
        elif session.get('role') == 'passenger':
            return redirect(url_for('passenger_dashboard'))
            
    role = request.args.get('role', 'passenger')
    return render_template('login.html', role=role)

@app.route('/register')
def register_page():
    # If already logged in, redirect to correct dashboard
    if 'user_id' in session:
        if session.get('role') == 'driver':
            return redirect(url_for('driver_dashboard'))
        elif session.get('role') == 'passenger':
            return redirect(url_for('passenger_dashboard'))
            
    role = request.args.get('role', 'passenger')
    return render_template('register.html', role=role)


# --- Authentication & Registration APIs ---

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role') # 'driver' or 'passenger'

    if not username or not email or not password or not role:
        return jsonify({'error': 'Username, Gmail ID, password, and role are required.'}), 400

    if role not in ('driver', 'passenger'):
        return jsonify({'error': 'Invalid role.'}), 400

    conn = get_db_connection()
    
    # Check if username already exists
    user_exists = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
    if user_exists:
        conn.close()
        return jsonify({'error': f"Username '{username}' is already taken."}), 400

    # Check if email already exists
    email_exists = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if email_exists:
        conn.close()
        return jsonify({'error': f"Gmail ID '{email}' is already registered."}), 400

    # Insert user
    password_hash = generate_password_hash(password)
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            (username, email, password_hash, role)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        # Auto-login after registration
        session['user_id'] = user_id
        session['username'] = username
        session['role'] = role
        
        conn.close()
        return jsonify({
            'success': True,
            'message': 'Registered and logged in successfully.',
            'user': {
                'id': user_id,
                'username': username,
                'role': role
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': f"Failed to register: {str(e)}"}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def api_forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    role = data.get('role')

    if not email or not role:
        return jsonify({'error': 'Gmail ID and role are required.'}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT id FROM users WHERE email = ? AND role = ?', (email, role)).fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'No user found with this Gmail ID for the selected role.'}), 404

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    otp_store[(email.lower(), role)] = {
        'otp': otp,
        'timestamp': datetime.now()
    }

    # Print to console for simulation
    print("\n" + "="*80)
    print(f" [OTP SIMULATION] OTP for {email} ({role}) is: {otp}")
    print("="*80 + "\n")

    return jsonify({'success': True, 'message': 'Simulated OTP sent successfully to your Gmail.'})

@app.route('/api/auth/reset-password', methods=['POST'])
def api_reset_password():
    data = request.get_json() or {}
    email = data.get('email')
    role = data.get('role')
    otp = data.get('otp')
    new_password = data.get('new_password')

    if not email or not role or not otp or not new_password:
        return jsonify({'error': 'All fields (email, role, OTP, and new password) are required.'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    key = (email.lower(), role)
    if key not in otp_store:
        return jsonify({'error': 'No active OTP request found for this email.'}), 400

    stored = otp_store[key]
    
    # Check OTP
    if stored['otp'] != otp.strip():
        return jsonify({'error': 'Incorrect OTP.'}), 400

    # Check expiry (10 minutes)
    time_diff = (datetime.now() - stored['timestamp']).total_seconds()
    if time_diff > 600:
        del otp_store[key]
        return jsonify({'error': 'OTP has expired.'}), 400

    # Update password
    conn = get_db_connection()
    password_hash = generate_password_hash(new_password)
    conn.execute('UPDATE users SET password_hash = ? WHERE email = ? AND role = ?', (password_hash, email, role))
    conn.commit()
    conn.close()

    # Clear OTP
    del otp_store[key]

    return jsonify({'success': True, 'message': 'Password has been reset successfully.'})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role') # Make sure role matches input!

    if not username or not password or not role:
        return jsonify({'error': 'Username, password, and role are required.'}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ? AND role = ?', (username, role)).fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'role': user['role']
            }
        })
    
    return jsonify({'error': 'Invalid username or password for the selected role.'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

@app.route('/api/auth/status', methods=['GET'])
def api_auth_status():
    if 'user_id' in session:
        return jsonify({
            'logged_in': True,
            'user': {
                'id': session['user_id'],
                'username': session['username'],
                'role': session['role']
            }
        })
    return jsonify({'logged_in': False})


# --- Bus & Route Metadata APIs ---

@app.route('/api/buses', methods=['GET'])
@role_required('driver')
def api_get_buses():
    conn = get_db_connection()
    buses = conn.execute('SELECT * FROM buses').fetchall()
    conn.close()
    return jsonify([dict(b) for b in buses])

@app.route('/api/routes', methods=['GET'])
def api_get_routes():
    conn = get_db_connection()
    routes = conn.execute('SELECT * FROM routes').fetchall()
    conn.close()
    return jsonify([dict(r) for r in routes])

@app.route('/api/stops/<int:route_id>', methods=['GET'])
def api_get_stops(route_id):
    conn = get_db_connection()
    stops = conn.execute('SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order ASC', (route_id,)).fetchall()
    conn.close()
    return jsonify([dict(s) for s in stops])


# --- Driver Trip Actions ---

@app.route('/api/driver/active_trip', methods=['GET'])
@role_required('driver')
def api_driver_active_trip():
    conn = get_db_connection()
    trip = conn.execute('''
        SELECT t.*, b.bus_number, b.bus_type, r.source, r.destination 
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        WHERE t.driver_id = ? AND t.status = 'active'
    ''', (session['user_id'],)).fetchone()
    conn.close()
    
    if trip:
        return jsonify({'has_active_trip': True, 'trip': dict(trip)})
    return jsonify({'has_active_trip': False})

@app.route('/api/driver/last_ended_trip', methods=['GET'])
@role_required('driver')
def api_driver_last_ended_trip():
    conn = get_db_connection()
    # Fetch the most recently completed trip for the active driver
    trip = conn.execute('''
        SELECT t.*, b.bus_number, b.bus_type, r.source, r.destination, s.stop_name
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        LEFT JOIN stops s ON t.current_stop_id = s.id
        WHERE t.driver_id = ? AND t.status = 'completed'
        ORDER BY t.last_updated DESC LIMIT 1
    ''', (session['user_id'],)).fetchone()
    conn.close()
    
    if trip:
        return jsonify({'has_last_trip': True, 'trip': dict(trip)})
    return jsonify({'has_last_trip': False})

@app.route('/api/trips/start', methods=['POST'])
@role_required('driver')
def api_start_trip():
    data = request.get_json() or {}
    bus_id = data.get('bus_id')
    route_id = data.get('route_id')
    departure_time = data.get('departure_time')
    start_stop_id = data.get('start_stop_id') # Optional, for resuming

    if not bus_id or not route_id or not departure_time:
        return jsonify({'error': 'Missing required fields (bus_id, route_id, departure_time).'}), 400

    conn = get_db_connection()
    
    # Check if there is already an active trip for this driver
    active_trip = conn.execute('SELECT id FROM trips WHERE driver_id = ? AND status = \'active\'', (session['user_id'],)).fetchone()
    if active_trip:
        conn.close()
        return jsonify({'error': 'You already have an active trip running. End it first.'}), 400

    # Determine starting stop
    if start_stop_id:
        initial_stop = conn.execute('SELECT * FROM stops WHERE id = ? AND route_id = ?', (start_stop_id, route_id)).fetchone()
        if not initial_stop:
            conn.close()
            return jsonify({'error': 'Selected start stop not found for this route.'}), 400
    else:
        initial_stop = conn.execute('SELECT * FROM stops WHERE route_id = ? AND stop_order = 0', (route_id,)).fetchone()
        if not initial_stop:
            conn.close()
            return jsonify({'error': 'No stops found for this route.'}), 404

    # Create the new trip
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO trips (bus_id, driver_id, route_id, status, departure_time, current_stop_id, current_status, last_updated)
        VALUES (?, ?, ?, 'active', ?, ?, 'reached', CURRENT_TIMESTAMP)
    ''', (bus_id, session['user_id'], route_id, departure_time, initial_stop['id']))
    
    trip_id = cursor.lastrowid
    
    # Seed logs for previous stops if resuming
    if start_stop_id:
        all_stops = conn.execute('SELECT id, stop_order FROM stops WHERE route_id = ? ORDER BY stop_order ASC', (route_id,)).fetchall()
        for s in all_stops:
            if s['stop_order'] < initial_stop['stop_order']:
                cursor.execute('INSERT INTO trip_logs (trip_id, stop_id, status) VALUES (?, ?, \'reached\')', (trip_id, s['id']))
                cursor.execute('INSERT INTO trip_logs (trip_id, stop_id, status) VALUES (?, ?, \'left\')', (trip_id, s['id']))
    
    # Log the current initial stop check-in
    cursor.execute('''
        INSERT INTO trip_logs (trip_id, stop_id, status, timestamp)
        VALUES (?, ?, 'reached', CURRENT_TIMESTAMP)
    ''', (trip_id, initial_stop['id']))
    
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'trip_id': trip_id, 'message': 'Trip started successfully.'})

@app.route('/api/trips/update', methods=['POST'])
@role_required('driver')
def api_update_trip():
    data = request.get_json() or {}
    trip_id = data.get('trip_id')
    stop_id = data.get('stop_id')
    status = data.get('status') # 'reached' or 'left'

    if not trip_id or not stop_id or not status or status not in ('reached', 'left'):
        return jsonify({'error': 'Invalid request parameters.'}), 400

    conn = get_db_connection()
    
    # Verify trip ownership and status
    trip = conn.execute('SELECT * FROM trips WHERE id = ? AND driver_id = ? AND status = \'active\'', (trip_id, session['user_id'])).fetchone()
    if not trip:
        conn.close()
        return jsonify({'error': 'Active trip not found or unauthorized access.'}), 404

    # Verify stop belongs to trip's route
    stop = conn.execute('SELECT * FROM stops WHERE id = ? AND route_id = ?', (stop_id, trip['route_id'])).fetchone()
    if not stop:
        conn.close()
        return jsonify({'error': 'Stop does not belong to the route of this trip.'}), 400

    # Insert into trip_logs
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO trip_logs (trip_id, stop_id, status, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ''', (trip_id, stop_id, status))

    # Check if reached the last stop
    last_stop = conn.execute('''
        SELECT id FROM stops WHERE route_id = ? ORDER BY stop_order DESC LIMIT 1
    ''', (trip['route_id'],)).fetchone()

    is_completed = False
    if status == 'reached' and stop_id == last_stop['id']:
        cursor.execute('''
            UPDATE trips 
            SET current_stop_id = ?, current_status = ?, status = 'completed', delay_minutes = 0, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (stop_id, status, trip_id))
        is_completed = True
    else:
        cursor.execute('''
            UPDATE trips 
            SET current_stop_id = ?, current_status = ?, delay_minutes = 0, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (stop_id, status, trip_id))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True, 
        'message': f'Status updated to {status} at stop {stop["stop_name"]}.',
        'is_completed': is_completed
    })

@app.route('/api/trips/report-delay', methods=['POST'])
@role_required('driver')
def api_report_delay():
    data = request.get_json() or {}
    trip_id = data.get('trip_id')
    delay_minutes = data.get('delay_minutes', 0)

    if not trip_id:
        return jsonify({'error': 'Missing trip_id.'}), 400

    conn = get_db_connection()
    # Verify trip ownership and status
    trip = conn.execute('SELECT * FROM trips WHERE id = ? AND driver_id = ? AND status = \'active\'', (trip_id, session['user_id'])).fetchone()
    if not trip:
        conn.close()
        return jsonify({'error': 'Active trip not found or unauthorized access.'}), 404

    cursor = conn.cursor()
    cursor.execute('''
        UPDATE trips 
        SET delay_minutes = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (delay_minutes, trip_id))
    
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': f'Traffic delay of {delay_minutes} minutes reported successfully.'})

@app.route('/api/trips/end', methods=['POST'])
@role_required('driver')
def api_end_trip():
    data = request.get_json() or {}
    trip_id = data.get('trip_id')

    if not trip_id:
        return jsonify({'error': 'Missing trip_id.'}), 400

    conn = get_db_connection()
    trip = conn.execute('SELECT * FROM trips WHERE id = ? AND driver_id = ? AND status = \'active\'', (trip_id, session['user_id'])).fetchone()
    
    if not trip:
        conn.close()
        return jsonify({'error': 'Active trip not found or unauthorized.'}), 404

    cursor = conn.cursor()
    cursor.execute('''
        UPDATE trips 
        SET status = 'completed', last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (trip_id,))
    
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Trip marked as completed.'})


# --- Passenger APIs ---

@app.route('/api/trips/active', methods=['GET'])
@role_required('passenger')
def api_active_trips():
    route_id = request.args.get('route_id', type=int)
    
    conn = get_db_connection()
    query = '''
        SELECT t.*, b.bus_number, b.bus_type, r.source, r.destination, s.stop_name as current_stop_name
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        LEFT JOIN stops s ON t.current_stop_id = s.id
        WHERE t.status = 'active'
    '''
    params = []
    if route_id:
        query += ' AND t.route_id = ?'
        params.append(route_id)
        
    trips = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(t) for t in trips])

@app.route('/api/trips/<int:trip_id>/status', methods=['GET'])
@login_required
def api_trip_status(trip_id):
    conn = get_db_connection()
    
    trip = conn.execute('''
        SELECT t.*, b.bus_number, b.bus_type, r.source, r.destination
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        WHERE t.id = ?
    ''', (trip_id,)).fetchone()
    
    if not trip:
        conn.close()
        return jsonify({'error': 'Trip not found.'}), 404
        
    stops = conn.execute('''
        SELECT * FROM stops 
        WHERE route_id = ? 
        ORDER BY stop_order ASC
    ''', (trip['route_id'],)).fetchall()
    
    logs = conn.execute('''
        SELECT * FROM trip_logs 
        WHERE trip_id = ? 
        ORDER BY timestamp ASC
    ''', (trip_id,)).fetchall()
    
    conn.close()
    
    return jsonify({
        'trip': dict(trip),
        'stops': [dict(s) for s in stops],
        'logs': [dict(l) for l in logs]
    })


@app.route('/api/trips/<int:trip_id>/delay-analysis', methods=['GET'])
@login_required
def api_trip_delay_analysis(trip_id):
    from delay_analyzer import analyze_route_delays
    conn = get_db_connection()
    trip = conn.execute('SELECT route_id FROM trips WHERE id = ?', (trip_id,)).fetchone()
    conn.close()
    if not trip:
        return jsonify({'error': 'Trip not found.'}), 404
        
    analysis = analyze_route_delays(trip['route_id'], active_trip_id=trip_id)
    return jsonify({
        'trip_id': trip_id,
        'route_id': trip['route_id'],
        'analysis': analysis
    })


# --- Static Timetable Data API ---
@app.route('/api/timetable', methods=['GET'])
@role_required('passenger')
def api_timetable():
    timetable_data = {
        "1": [ # Nagpur to Gondia (Route 1)
            {"time": "06:30 AM", "eta": "10:45 AM", "type": "MSRTC Ordinary", "fare": "₹ 210", "duration": "4h 15m Direct"},
            {"time": "07:00 AM", "eta": "11:15 AM", "type": "MSRTC Shivshahi", "fare": "₹ 270", "duration": "4h 15m Direct"},
            {"time": "07:30 AM", "eta": "11:45 AM", "type": "MSRTC Ordinary", "fare": "₹ 210", "duration": "4h 15m Direct"},
            {"time": "08:00 AM", "eta": "12:15 PM", "type": "MSRTC Shivshahi", "fare": "₹ 270", "duration": "4h 15m Direct"},
            {"time": "08:30 AM", "eta": "12:45 PM", "type": "MSRTC Ordinary", "fare": "₹ 210", "duration": "4h 15m Direct"},
            {"time": "09:00 AM", "eta": "01:15 PM", "type": "MSRTC Shivshahi", "fare": "₹ 270", "duration": "4h 15m Direct"},
        ],
        "2": [ # Gondia to Nagpur (Route 2)
            {"time": "06:30 AM", "eta": "10:45 AM", "type": "MSRTC Ordinary", "fare": "₹ 210", "duration": "4h 15m Direct"},
            {"time": "07:00 AM", "eta": "11:15 AM", "type": "MSRTC Shivshahi", "fare": "₹ 270", "duration": "4h 15m Direct"},
            {"time": "07:30 AM", "eta": "11:45 AM", "type": "MSRTC Ordinary", "fare": "₹ 210", "duration": "4h 15m Direct"},
            {"time": "08:00 AM", "eta": "12:15 PM", "type": "MSRTC Shivshahi", "fare": "₹ 270", "duration": "4h 15m Direct"},
            {"time": "08:30 AM", "eta": "12:45 PM", "type": "MSRTC Ordinary", "fare": "₹ 210", "duration": "4h 15m Direct"},
            {"time": "09:00 AM", "eta": "01:15 PM", "type": "MSRTC Shivshahi", "fare": "₹ 270", "duration": "4h 15m Direct"},
        ]
    }
    return jsonify(timetable_data)

if __name__ == '__main__':
    # Initialize DB tables if they don't exist
    init_db()
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)
