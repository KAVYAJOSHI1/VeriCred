import sqlite3
import json
from datetime import datetime

DB_PATH = "backend/veriscore.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            age INTEGER,
            income INTEGER,
            debt INTEGER,
            history INTEGER,
            open_acc INTEGER,
            input_hash TEXT,
            proof TEXT,
            status TEXT DEFAULT 'Pending',
            tx_hash TEXT,
            created_at TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def add_request(data, proof):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    created_at = datetime.now()
    
    # Store proof as JSON string if it's a dict, or text if string
    proof_str = json.dumps(proof) if isinstance(proof, (dict, list)) else str(proof)
    
    c.execute('''
        INSERT INTO requests (age, income, debt, history, open_acc, proof, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.age, data.income, data.debt, data.history, data.open_acc,
        proof_str, 'Generated', created_at
    ))
    req_id = c.lastrowid
    conn.commit()
    conn.close()
    return req_id

def get_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM requests ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
