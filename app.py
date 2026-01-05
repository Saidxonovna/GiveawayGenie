from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
import sqlite3
import random
import re
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Ma'lumotlar bazasi
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    
    # Giveaway jadvali
    c.execute('''CREATE TABLE IF NOT EXISTS giveaways
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  post_url TEXT,
                  winners_count INTEGER,
                  selection_method TEXT,
                  status TEXT,
                  created_at TIMESTAMP,
                  results TEXT)''')
    
    # Foydalanuvchilar jadvali
    c.execute('''CREATE TABLE IF NOT EXISTS participants
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  giveaway_id INTEGER,
                  username TEXT,
                  user_id TEXT,
                  entry_type TEXT,
                  entry_time TIMESTAMP)''')
    
    conn.commit()
    conn.close()

init_db()

# Instagram post ma'lumotlarini olish (simulyatsiya - realda Instagram API token kerak)
def get_instagram_data(post_url):
    """
    Instagram post ma'lumotlarini olish
    Eslatma: Real loyiha uchun Instagram Graph API dan foydalanish kerak
    """
    
    # Post URL dan ID ni ajratish
    post_id_match = re.search(r'/p/([^/]+)', post_url)
    if not post_id_match:
        post_id_match = re.search(r'/reel/([^/]+)', post_url)
    
    # Agar API token bo'lmasa, simulyatsiya qilamiz
    participants = []
    
    # Simulyatsiya qilingan foydalanuvchilar
    sample_users = [
        "user1", "user2", "user3", "user4", "user5",
        "user6", "user7", "user8", "user9", "user10"
    ]
    
    # Simulyatsiya qilingan izohlar
    sample_comments = [
        "Men ham qatnashmoqchiman!",
        "Ajoyib tanlov!",
        "G'olib men bo'laman inshaAllah",
        "Birorta shart bormi?",
        "Qachongacha davom etadi?",
        "O'zimga kerak edi",
        "Omadimni sinab ko'ray",
        "Hammaga omad!",
        "Birinchi sharh",
        "So'nggi sharh"
    ]
    
    for i, username in enumerate(sample_users[:random.randint(5, 10)]):
        entry_type = random.choice(['comment', 'like'])
        participants.append({
            'username': username,
            'user_id': f"user_{i+1}",
            'entry_type': entry_type,
            'comment': sample_comments[i] if entry_type == 'comment' else None
        })
    
    return {
        'post_id': post_id_match.group(1) if post_id_match else 'simulated_post',
        'participants': participants,
        'total_likes': random.randint(50, 200),
        'total_comments': len([p for p in participants if p['entry_type'] == 'comment'])
    }

# G'oliblarni tanlash
def select_winners(participants, winners_count, selection_method):
    if selection_method == 'comments':
        eligible = [p for p in participants if p['entry_type'] == 'comment']
    elif selection_method == 'likes':
        eligible = [p for p in participants if p['entry_type'] == 'like']
    else:  # both
        eligible = participants
    
    if len(eligible) < winners_count:
        winners_count = len(eligible)
    
    winners = random.sample(eligible, winners_count) if eligible else []
    return winners

# API yo'llari
@app.route('/')
def home():
    return jsonify({'message': 'GiveawayGenie API ishlamoqda'})

@app.route('/api/create-giveaway', methods=['POST'])
def create_giveaway():
    try:
        data = request.json
        post_url = data.get('post_url')
        winners_count = int(data.get('winners_count', 1))
        selection_method = data.get('selection_method', 'both')
        
        # Instagram post ma'lumotlarini olish
        post_data = get_instagram_data(post_url)
        
        # Giveaway yaratish
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        
        c.execute('''INSERT INTO giveaways 
                    (post_url, winners_count, selection_method, status, created_at)
                    VALUES (?, ?, ?, ?, ?)''',
                 (post_url, winners_count, selection_method, 'active', datetime.now()))
        
        giveaway_id = c.lastrowid
        
        # Ishtirokchilarni saqlash
        for participant in post_data['participants']:
            c.execute('''INSERT INTO participants
                        (giveaway_id, username, user_id, entry_type, entry_time)
                        VALUES (?, ?, ?, ?, ?)''',
                     (giveaway_id, participant['username'], 
                      participant['user_id'], participant['entry_type'], 
                      datetime.now()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'giveaway_id': giveaway_id,
            'total_participants': len(post_data['participants']),
            'post_data': post_data
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/pick-winners/<int:giveaway_id>', methods=['POST'])
def pick_winners(giveaway_id):
    try:
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        
        # Giveaway ma'lumotlarini olish
        c.execute('SELECT * FROM giveaways WHERE id = ?', (giveaway_id,))
        giveaway = c.fetchone()
        
        if not giveaway:
            return jsonify({'success': False, 'error': 'Giveaway topilmadi'})
        
        # Ishtirokchilarni olish
        c.execute('SELECT * FROM participants WHERE giveaway_id = ?', (giveaway_id,))
        participants_data = c.fetchall()
        
        participants = []
        for p in participants_data:
            participants.append({
                'username': p[2],
                'user_id': p[3],
                'entry_type': p[4]
            })
        
        # G'oliblarni tanlash
        winners = select_winners(
            participants, 
            giveaway[2],  # winners_count
            giveaway[3]   # selection_method
        )
        
        # Natijalarni saqlash
        results = {
            'winners': winners,
            'selected_at': datetime.now().isoformat(),
            'total_participants': len(participants)
        }
        
        c.execute('''UPDATE giveaways 
                    SET status = ?, results = ?
                    WHERE id = ?''',
                 ('completed', json.dumps(results), giveaway_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'winners': winners,
            'total_participants': len(participants),
            'selection_method': giveaway[3]
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/get-giveaway/<int:giveaway_id>')
def get_giveaway(giveaway_id):
    try:
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        
        c.execute('SELECT * FROM giveaways WHERE id = ?', (giveaway_id,))
        giveaway = c.fetchone()
        
        c.execute('SELECT * FROM participants WHERE giveaway_id = ?', (giveaway_id,))
        participants = c.fetchall()
        
        conn.close()
        
        if giveaway:
            return jsonify({
                'success': True,
                'giveaway': {
                    'id': giveaway[0],
                    'post_url': giveaway[1],
                    'winners_count': giveaway[2],
                    'selection_method': giveaway[3],
                    'status': giveaway[4],
                    'created_at': giveaway[5],
                    'results': json.loads(giveaway[6]) if giveaway[6] else None
                },
                'participants': [
                    {
                        'username': p[2],
                        'user_id': p[3],
                        'entry_type': p[4],
                        'entry_time': p[5]
                    } for p in participants
                ]
            })
        else:
            return jsonify({'success': False, 'error': 'Giveaway topilmadi'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
