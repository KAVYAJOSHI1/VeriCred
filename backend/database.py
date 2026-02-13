import sqlite3
import json
from datetime import datetime

DB_PATH = "veriscore.db"

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
            public_instances TEXT,
            status TEXT DEFAULT 'Pending',
            tx_hash TEXT,
            created_at TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def create_request(data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    created_at = datetime.now()
    
    c.execute('''
        INSERT INTO requests (age, income, debt, history, open_acc, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.age, data.income, data.debt, data.history, data.open_acc,
        'Pending', created_at
    ))
    req_id = c.lastrowid
    conn.commit()
    conn.close()
    return req_id

def update_request_proof(req_id, proof, public_instances=None, status='Completed', error=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    proof_str = proof
    if isinstance(proof, (dict, list)):
        proof_str = json.dumps(proof)
        
    instances_str = None
    if public_instances:
        instances_str = json.dumps(public_instances)

    c.execute('''
        UPDATE requests 
        SET proof = ?, public_instances = ?, status = ?
        WHERE id = ?
    ''', (proof_str, instances_str, status, req_id))
    conn.commit()
    conn.close()

def get_request(req_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM requests WHERE id = ?', (req_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM requests ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
