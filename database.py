import sqlite3
import os
from werkzeug.security import generate_password_hash

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'my_buzz.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Create Tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('driver', 'admin', 'passenger'))
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        destination TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_id INTEGER NOT NULL,
        stop_name TEXT NOT NULL,
        stop_order INTEGER NOT NULL,
        estimated_duration_min INTEGER NOT NULL,
        FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS buses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bus_number TEXT UNIQUE NOT NULL,
        bus_type TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bus_id INTEGER NOT NULL,
        driver_id INTEGER NOT NULL,
        route_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed')),
        departure_time TEXT NOT NULL,
        current_stop_id INTEGER,
        current_status TEXT CHECK(current_status IN ('reached', 'left') OR current_status IS NULL),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bus_id) REFERENCES buses (id),
        FOREIGN KEY (driver_id) REFERENCES users (id),
        FOREIGN KEY (route_id) REFERENCES routes (id),
        FOREIGN KEY (current_stop_id) REFERENCES stops (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS trip_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        stop_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('reached', 'left')),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
        FOREIGN KEY (stop_id) REFERENCES stops (id)
    )
    ''')

    conn.commit()

    # 2. Seed Data if empty
    # Seed Users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        drivers = [
            ('driver1', 'driver1@gmail.com', generate_password_hash('driver123'), 'driver'),
            ('conductor1', 'conductor1@gmail.com', generate_password_hash('conductor123'), 'driver'),
            ('admin', 'admin@gmail.com', generate_password_hash('admin123'), 'admin')
        ]
        cursor.executemany("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", drivers)

    # Seed Routes
    cursor.execute("SELECT COUNT(*) FROM routes")
    if cursor.fetchone()[0] == 0:
        routes = [
            (1, 'Nagpur', 'Gondia'),
            (2, 'Gondia', 'Nagpur')
        ]
        cursor.executemany("INSERT INTO routes (id, source, destination) VALUES (?, ?, ?)", routes)

    # Seed Stops
    cursor.execute("SELECT COUNT(*) FROM stops")
    if cursor.fetchone()[0] == 0:
        # Nagpur to Gondia stops (Route 1)
        nagpur_to_gondia_stops = [
            (1, 'Nagpur', 0, 0),
            (1, 'Kamptee', 1, 20),
            (1, 'Kanhan', 2, 10),
            (1, 'Mauda', 3, 20),
            (1, 'Bhandara', 4, 25),
            (1, 'Pavni Naka', 5, 15),
            (1, 'Sakoli', 6, 25),
            (1, 'Dawaniwada', 7, 20),
            (1, 'Tumsar', 8, 25),
            (1, 'Devada', 9, 15),
            (1, 'Tirora', 10, 20),
            (1, 'Kachewani', 11, 15),
            (1, 'Khamari', 12, 15),
            (1, 'Fulchur', 13, 15),
            (1, 'Gondia', 14, 15)
        ]
        # Gondia to Nagpur stops (Route 2) - reversed order
        gondia_to_nagpur_stops = [
            (2, 'Gondia', 0, 0),
            (2, 'Fulchur', 1, 15),
            (2, 'Khamari', 2, 15),
            (2, 'Kachewani', 3, 15),
            (2, 'Tirora', 4, 20),
            (2, 'Devada', 5, 15),
            (2, 'Tumsar', 6, 25),
            (2, 'Dawaniwada', 7, 20),
            (2, 'Sakoli', 8, 25),
            (2, 'Pavni Naka', 9, 15),
            (2, 'Bhandara', 10, 25),
            (2, 'Mauda', 11, 20),
            (2, 'Kanhan', 12, 10),
            (2, 'Kamptee', 13, 20),
            (2, 'Nagpur', 14, 20)
        ]
        cursor.executemany(
            "INSERT INTO stops (route_id, stop_name, stop_order, estimated_duration_min) VALUES (?, ?, ?, ?)",
            nagpur_to_gondia_stops + gondia_to_nagpur_stops
        )

    # Seed Buses
    cursor.execute("SELECT COUNT(*) FROM buses")
    if cursor.fetchone()[0] == 0:
        buses = [
            ('MH40 N 1234', 'MSRTC Ordinary'),
            ('MH40 N 5678', 'MSRTC Shivshahi'),
            ('MH35 G 9876', 'MSRTC Ordinary'),
            ('MH31 A 4321', 'MSRTC Shivshahi')
        ]
        cursor.executemany("INSERT INTO buses (bus_number, bus_type) VALUES (?, ?)", buses)

    conn.commit()
    conn.close()
    print("Database initialized and seeded successfully.")

if __name__ == '__main__':
    if os.path.exists(DATABASE_PATH):
        try:
            os.remove(DATABASE_PATH)
            print("Deleted existing database for migration.")
        except Exception as e:
            print(f"Warning: could not delete database: {e}")
    init_db()
