import os
import json
import webview
from backend.database import (
    init_db, get_user_stats, update_streak_and_xp, 
    save_lesson_progress, get_all_progress, 
    seed_flashcards, get_due_flashcards, review_flashcard,
    save_draft_code, get_draft_code,
    save_video_timestamp, get_video_timestamp,
    save_app_session_state, get_app_session_state
)
from backend.executor import run_code
from backend.curriculum_data import get_curriculum, get_day_lesson, get_all_flashcards
from backend.ai_tutor import analyze_code_with_ai, ask_ai_tutor_question

class PyLearnAPI:
    def __init__(self):
        init_db()
        all_cards = get_all_flashcards()
        seed_flashcards(all_cards)

    def get_stats(self):
        return get_user_stats()

    def get_curriculum_list(self):
        return get_curriculum()

    def get_lesson(self, day_num):
        return get_day_lesson(int(day_num))

    def get_progress_data(self):
        return get_all_progress()

    def execute_python_code(self, code, user_inputs=""):
        return run_code(code, user_inputs)

    def review_code_with_ai(self, code, user_level=1, current_day=1):
        return analyze_code_with_ai(code, int(user_level), int(current_day))

    def ask_ai_tutor(self, question, code, user_level=1, current_day=1):
        return ask_ai_tutor_question(question, code, int(user_level), int(current_day))

    # Persistence APIs
    def auto_save_draft(self, day_num, session_type, draft_code):
        return save_draft_code(int(day_num), session_type, draft_code)

    def load_draft(self, day_num, session_type):
        return get_draft_code(int(day_num), session_type)

    def save_video_progress(self, day_num, session_type, seconds):
        return save_video_timestamp(int(day_num), session_type, int(seconds))

    def get_video_progress(self, day_num, session_type):
        return get_video_timestamp(int(day_num), session_type)

    def save_session_state(self, active_view, current_day, current_session_key, timer_seconds, timer_is_running):
        return save_app_session_state(active_view, int(current_day), current_session_key, int(timer_seconds), bool(timer_is_running))

    def get_session_state(self):
        return get_app_session_state()

    def submit_lesson(self, day_num, session_type, score=100, code_saved=""):
        return save_lesson_progress(int(day_num), session_type, True, score, code_saved)

    def get_flashcards(self, deck=None):
        return get_due_flashcards(deck)

    def rate_flashcard(self, card_id, grade):
        return review_flashcard(card_id, int(grade))

    def log_study_time(self, seconds):
        return update_streak_and_xp(xp_gain=2, time_spent_sec=int(seconds))

def main():
    api = PyLearnAPI()
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    index_html = os.path.join(frontend_dir, "index.html")
    
    window = webview.create_window(
        title="PyLearn Pro — Master Python & AI",
        url=index_html,
        js_api=api,
        width=1320,
        height=880,
        min_size=(1050, 700),
        background_color='#0f172a'
    )
    
    webview.start(debug=True)

if __name__ == '__main__':
    main()
