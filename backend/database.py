import sqlite3
import json
import os
from datetime import datetime, date, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pylearn.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # User Profile & Stats
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        streak_count INTEGER DEFAULT 0,
        last_active_date TEXT,
        level INTEGER DEFAULT 1,
        total_time_spent_seconds INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Progress per lesson/session (including draft & submitted code)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lesson_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_number INTEGER,
        session_type TEXT,
        completed INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        code_saved TEXT,
        draft_code TEXT,
        video_seconds_watched INTEGER DEFAULT 0,
        completed_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(day_number, session_type)
    )
    """)
    
    # App Global Session State (Timer, active view, active session)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_session_state (
        id INTEGER PRIMARY KEY,
        active_view TEXT DEFAULT 'dashboard',
        current_day INTEGER DEFAULT 1,
        current_session_key TEXT DEFAULT 'm1_concept',
        timer_seconds INTEGER DEFAULT 1800,
        timer_is_running INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Spaced Repetition Flashcards
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        deck TEXT,
        question TEXT,
        answer TEXT,
        code_snippet TEXT,
        repetition_count INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 0,
        due_date TEXT,
        last_reviewed_at TEXT
    )
    """)
    
    # User Notes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        content TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("SELECT COUNT(*) FROM user_profile")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO user_profile (id, xp, streak_count, last_active_date) VALUES (1, 0, 0, ?)",
                       (date.today().isoformat(),))

    cursor.execute("SELECT COUNT(*) FROM app_session_state")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO app_session_state (id, active_view, current_day, current_session_key, timer_seconds, timer_is_running) VALUES (1, 'dashboard', 1, 'm1_concept', 1800, 0)")

    conn.commit()
    conn.close()

def get_user_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profile WHERE id = 1")
    row = cursor.fetchone()
    stats = dict(row) if row else {"xp": 0, "streak_count": 0, "level": 1, "last_active_date": "", "total_time_spent_seconds": 0}
    
    cursor.execute("SELECT COUNT(*) FROM lesson_progress WHERE completed = 1")
    stats["completed_sessions_count"] = cursor.fetchone()[0]

    import math
    stats["level"] = math.floor(math.sqrt(stats["xp"] / 50)) + 1 if stats["xp"] > 0 else 1
    
    conn.close()
    return stats

def update_streak_and_xp(xp_gain=10, time_spent_sec=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    today_str = date.today().isoformat()
    yesterday_str = (date.today() - timedelta(days=1)).isoformat()
    
    cursor.execute("SELECT streak_count, last_active_date, xp, total_time_spent_seconds FROM user_profile WHERE id = 1")
    row = cursor.fetchone()
    current_streak = row["streak_count"] if row else 0
    last_date = row["last_active_date"] if row else ""
    current_xp = row["xp"] if row else 0
    total_time = row["total_time_spent_seconds"] if row else 0
    
    if last_date == yesterday_str:
        current_streak += 1
    elif last_date != today_str:
        current_streak = 1
        
    new_xp = current_xp + xp_gain
    new_time = total_time + time_spent_sec
    
    cursor.execute("""
        UPDATE user_profile 
        SET streak_count = ?, last_active_date = ?, xp = ?, total_time_spent_seconds = ?
        WHERE id = 1
    """, (current_streak, today_str, new_xp, new_time))
    
    conn.commit()
    conn.close()
    return {"streak": current_streak, "xp": new_xp}

def save_draft_code(day_number, session_type, draft_code):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO lesson_progress (day_number, session_type, draft_code)
        VALUES (?, ?, ?)
        ON CONFLICT(day_number, session_type) DO UPDATE SET
            draft_code = excluded.draft_code,
            updated_at = CURRENT_TIMESTAMP
    """, (int(day_number), session_type, draft_code))
    conn.commit()
    conn.close()
    return {"status": "draft_saved"}

def get_draft_code(day_number, session_type):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT draft_code, code_saved FROM lesson_progress WHERE day_number = ? AND session_type = ?", (int(day_number), session_type))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row["draft_code"] or row["code_saved"] or ""
    return ""

def save_video_timestamp(day_number, session_type, seconds):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO lesson_progress (day_number, session_type, video_seconds_watched)
        VALUES (?, ?, ?)
        ON CONFLICT(day_number, session_type) DO UPDATE SET
            video_seconds_watched = excluded.video_seconds_watched,
            updated_at = CURRENT_TIMESTAMP
    """, (int(day_number), session_type, int(seconds)))
    conn.commit()
    conn.close()
    return {"status": "video_time_saved"}

def get_video_timestamp(day_number, session_type):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT video_seconds_watched FROM lesson_progress WHERE day_number = ? AND session_type = ?", (int(day_number), session_type))
    row = cursor.fetchone()
    conn.close()
    if row and row["video_seconds_watched"]:
        return row["video_seconds_watched"]
    return 0

def save_app_session_state(active_view, current_day, current_session_key, timer_seconds, timer_is_running):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO app_session_state (id, active_view, current_day, current_session_key, timer_seconds, timer_is_running)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            active_view = excluded.active_view,
            current_day = excluded.current_day,
            current_session_key = excluded.current_session_key,
            timer_seconds = excluded.timer_seconds,
            timer_is_running = excluded.timer_is_running,
            updated_at = CURRENT_TIMESTAMP
    """, (active_view, int(current_day), current_session_key, int(timer_seconds), 1 if timer_is_running else 0))
    conn.commit()
    conn.close()
    return {"status": "session_saved"}

def get_app_session_state():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM app_session_state WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "active_view": "dashboard",
        "current_day": 1,
        "current_session_key": "m1_concept",
        "timer_seconds": 1800,
        "timer_is_running": 0
    }

def save_lesson_progress(day_number, session_type, completed, score=100, code_saved=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT INTO lesson_progress (day_number, session_type, completed, score, code_saved, draft_code, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(day_number, session_type) DO UPDATE SET
            completed = excluded.completed,
            score = excluded.score,
            code_saved = excluded.code_saved,
            draft_code = excluded.code_saved,
            completed_at = excluded.completed_at
    """, (day_number, session_type, 1 if completed else 0, score, code_saved, code_saved, now_str))
    
    conn.commit()
    conn.close()
    
    if completed:
        update_streak_and_xp(xp_gain=25)
    return {"status": "saved"}

def get_all_progress():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lesson_progress")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def review_flashcard(card_id, grade):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM flashcards WHERE id = ?", (card_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return None
        
    rep = row["repetition_count"]
    ef = row["ease_factor"]
    interval = row["interval_days"]
    
    q = grade + 2
    if grade == 0:
        q = 1
        
    if q >= 3:
        if rep == 0:
            interval = 1
        elif rep == 1:
            interval = 6
        else:
            interval = int(interval * ef)
        rep += 1
    else:
        rep = 0
        interval = 1
        
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if ef < 1.3:
        ef = 1.3
        
    due = (date.today() + timedelta(days=interval)).isoformat()
    now_str = datetime.now().isoformat()
    
    cursor.execute("""
        UPDATE flashcards
        SET repetition_count = ?, ease_factor = ?, interval_days = ?, due_date = ?, last_reviewed_at = ?
        WHERE id = ?
    """, (rep, ef, interval, due, now_str, card_id))
    
    conn.commit()
    conn.close()
    update_streak_and_xp(xp_gain=5)
    return {"due_date": due, "interval": interval}

def seed_flashcards(cards_list):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    
    for c in cards_list:
        cursor.execute("""
            INSERT OR IGNORE INTO flashcards (id, deck, question, answer, code_snippet, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (c["id"], c.get("deck", "General"), c["question"], c["answer"], c.get("code_snippet", ""), today_str))
        
    conn.commit()
    conn.close()

def get_due_flashcards(deck=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = date.today().isoformat()
    
    if deck:
        cursor.execute("SELECT * FROM flashcards WHERE deck = ? AND (due_date <= ? OR due_date IS NULL)", (deck, today_str))
    else:
        cursor.execute("SELECT * FROM flashcards WHERE due_date <= ? OR due_date IS NULL", (today_str,))
        
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
