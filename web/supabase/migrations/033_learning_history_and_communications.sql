-- Durable learner history, private instructor messaging, course discussions,
-- notification inbox, and round-based quick checks.

ALTER TABLE public.user_progress ADD COLUMN draft_updated_at timestamptz;
UPDATE public.user_progress SET draft_updated_at=last_accessed WHERE draft_code IS NOT NULL AND draft_updated_at IS NULL;

-- All browser draft writes now go through the version-checking RPC below. This
-- closes the older direct-write grants so a second device cannot silently
-- overwrite a newer draft or alter progress fields.
REVOKE INSERT, UPDATE ON public.user_progress FROM authenticated;
REVOKE INSERT (student_id, session_id, draft_code, timer_seconds_spent, last_accessed),
  UPDATE (draft_code, timer_seconds_spent, last_accessed) ON public.user_progress FROM authenticated;

CREATE OR REPLACE FUNCTION private.touch_user_progress_draft()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.draft_code IS DISTINCT FROM OLD.draft_code THEN NEW.draft_updated_at:=now(); END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.touch_user_progress_draft() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER touch_user_progress_draft BEFORE INSERT OR UPDATE OF draft_code ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION private.touch_user_progress_draft();

CREATE OR REPLACE FUNCTION public.save_lesson_draft(
  p_session_id integer,p_code text,p_timer_seconds integer,p_expected_version timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := (SELECT auth.uid()); v_current public.user_progress%ROWTYPE;
  v_saved_at timestamptz; v_course uuid; v_month integer; v_free boolean;
BEGIN
  IF v_user IS NULL OR char_length(COALESCE(p_code,''))>100000 OR p_timer_seconds<0 THEN
    RAISE EXCEPTION 'Sign in and provide a valid lesson draft';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_user AND role='student') THEN RAISE EXCEPTION 'Learner account required'; END IF;
  SELECT m.course_id,m.month_number,m.is_free INTO v_course,v_month,v_free
    FROM public.sessions s JOIN public.modules m ON m.id=s.module_id
    WHERE s.id=p_session_id AND m.status='published';
  IF v_course IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.course_enrollments e WHERE e.course_id=v_course AND e.student_id=v_user AND e.status='active'
      AND (e.plan IN ('paid_full','scholarship') OR (e.plan='free_month1' AND v_free AND e.started_at>now()-interval '30 days')
        OR EXISTS(SELECT 1 FROM public.course_month_entitlements ent WHERE ent.course_id=v_course AND ent.student_id=v_user AND ent.month_number=v_month AND ent.starts_at<=now() AND ent.expires_at>now()))
  ) THEN RAISE EXCEPTION 'You do not have access to save this lesson'; END IF;

  SELECT * INTO v_current FROM public.user_progress WHERE student_id=v_user AND session_id=p_session_id FOR UPDATE;
  IF FOUND THEN
    IF v_current.draft_updated_at IS DISTINCT FROM p_expected_version THEN
      RETURN jsonb_build_object('status','conflict','cloud_code',COALESCE(v_current.draft_code,''),'cloud_version',v_current.draft_updated_at);
    END IF;
    UPDATE public.user_progress SET draft_code=p_code,timer_seconds_spent=p_timer_seconds,last_accessed=now()
      WHERE student_id=v_user AND session_id=p_session_id RETURNING draft_updated_at INTO v_saved_at;
  ELSE
    IF p_expected_version IS NOT NULL THEN RETURN jsonb_build_object('status','conflict','cloud_code','','cloud_version',NULL); END IF;
    INSERT INTO public.user_progress(student_id,session_id,draft_code,timer_seconds_spent,last_accessed)
      VALUES(v_user,p_session_id,p_code,p_timer_seconds,now())
      ON CONFLICT(student_id,session_id) DO NOTHING RETURNING draft_updated_at INTO v_saved_at;
    IF v_saved_at IS NULL THEN
      SELECT draft_code,draft_updated_at INTO v_current.draft_code,v_current.draft_updated_at
        FROM public.user_progress WHERE student_id=v_user AND session_id=p_session_id;
      RETURN jsonb_build_object('status','conflict','cloud_code',COALESCE(v_current.draft_code,''),'cloud_version',v_current.draft_updated_at);
    END IF;
  END IF;
  RETURN jsonb_build_object('status','saved','draft_version',v_saved_at);
END; $$;
REVOKE ALL ON FUNCTION public.save_lesson_draft(integer,text,integer,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_lesson_draft(integer,text,integer,timestamptz) TO authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
UPDATE public.profiles
SET display_name = NULLIF(BTRIM(split_part(full_name, ' ', 1)), '')
WHERE display_name IS NULL;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(BTRIM(display_name)) BETWEEN 1 AND 40);

CREATE TABLE public.practice_code_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(BTRIM(name)) BETWEEN 1 AND 60),
  code text NOT NULL CHECK (char_length(code) <= 50000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practice_code_versions_owner_session_idx
  ON public.practice_code_versions(student_id, session_id, created_at DESC);
ALTER TABLE public.practice_code_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.practice_code_versions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.practice_code_versions TO authenticated;
CREATE POLICY "Learners manage their own named code versions"
  ON public.practice_code_versions FOR ALL TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Lesson help' CHECK (char_length(title) <= 120),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversations_owner_session_idx
  ON public.ai_conversations(student_id, session_id, updated_at DESC);
CREATE UNIQUE INDEX ai_conversations_one_default_per_lesson_idx
  ON public.ai_conversations(student_id, session_id) WHERE is_default;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_conversations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
CREATE POLICY "Learners manage only their own AI conversations"
  ON public.ai_conversations FOR ALL TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  provider text,
  fallback boolean NOT NULL DEFAULT false,
  code_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_chat_messages_conversation_idx ON public.ai_chat_messages(conversation_id, created_at);
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_chat_messages FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
CREATE POLICY "Learners read messages in their own AI conversations"
  ON public.ai_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_chat_messages.conversation_id AND c.student_id = (SELECT auth.uid())
  ));
CREATE POLICY "Learners save only their own questions to AI conversations"
  ON public.ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (role='user' AND EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_chat_messages.conversation_id AND c.student_id = (SELECT auth.uid())
  ));
CREATE POLICY "Learners delete messages in their own AI conversations"
  ON public.ai_chat_messages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_chat_messages.conversation_id AND c.student_id = (SELECT auth.uid())
  ));

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('private_chat', 'discussion', 'announcement')),
  learner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(BTRIM(title)) BETWEEN 1 AND 160),
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'private_chat' AND learner_id IS NOT NULL AND instructor_id IS NOT NULL)
      OR (kind <> 'private_chat' AND learner_id IS NULL AND instructor_id IS NULL))
);
CREATE UNIQUE INDEX conversations_private_pair_idx
  ON public.conversations(course_id, learner_id, instructor_id) WHERE kind = 'private_chat';
CREATE INDEX conversations_course_recent_idx ON public.conversations(course_id, updated_at DESC);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversations FROM anon, authenticated;
GRANT SELECT ON public.conversations TO authenticated;

CREATE TABLE public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversation_reads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversation_reads TO authenticated;

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(BTRIM(body)) BETWEEN 1 AND 12000),
  reply_to uuid REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  lesson_id integer REFERENCES public.sessions(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_messages_thread_idx ON public.conversation_messages(conversation_id, created_at);
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversation_messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversation_messages TO authenticated;

CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('unhelpful', 'inappropriate', 'privacy', 'safety', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id),
  resolution text CHECK (resolution IS NULL OR char_length(resolution) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.message_reports TO authenticated;

CREATE TABLE public.message_moderation_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.message_reports(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  accessed_at timestamptz NOT NULL DEFAULT now(),
  purpose text NOT NULL CHECK (char_length(BTRIM(purpose)) BETWEEN 5 AND 500)
);
ALTER TABLE public.message_moderation_access_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_moderation_access_audit FROM anon, authenticated;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('message', 'announcement', 'quiz_feedback', 'assignment_feedback', 'instructor_assignment', 'reminder')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  href text NOT NULL CHECK (href LIKE '/%' AND href NOT LIKE '//%'),
  entity_id uuid,
  dedupe_key text UNIQUE,
  read_at timestamptz,
  email_status text NOT NULL DEFAULT 'not_requested' CHECK (email_status IN ('not_requested', 'pending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox_idx ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
CREATE POLICY "Learners and staff read their own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Recipients mark their own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT false,
  reminder_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
CREATE POLICY "Users manage their own notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION private.queue_opted_in_notification_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.kind IN ('message','announcement','assignment_feedback') AND EXISTS (
    SELECT 1 FROM public.notification_preferences p WHERE p.user_id=NEW.user_id AND p.email_enabled
  ) THEN
    NEW.email_status:='pending';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.queue_opted_in_notification_email() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER queue_opted_in_notification_email BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION private.queue_opted_in_notification_email();

CREATE OR REPLACE FUNCTION private.notify_instructor_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.instructor_id IS DISTINCT FROM OLD.instructor_id THEN
    INSERT INTO public.notifications(user_id,kind,title,body,href,dedupe_key)
    VALUES(NEW.student_id,'instructor_assignment','Your instructor assignment was updated',
      'Open Messages to contact your assigned instructor.','/messages',
      'instructor-assignment:'||NEW.course_id::text||':'||NEW.student_id::text||':'||NEW.assigned_at::text)
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.notify_instructor_assignment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_instructor_assignment AFTER INSERT OR UPDATE OF instructor_id ON public.student_instructors
  FOR EACH ROW EXECUTE FUNCTION private.notify_instructor_assignment();

CREATE TABLE public.quiz_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id integer NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score >= 0),
  question_count smallint NOT NULL CHECK (question_count BETWEEN 1 AND 4),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  content_snapshot jsonb NOT NULL,
  CHECK (score <= question_count)
);
CREATE INDEX quiz_rounds_owner_session_idx ON public.quiz_rounds(student_id, session_id, submitted_at DESC);
CREATE TABLE public.quiz_round_answers (
  round_id uuid NOT NULL REFERENCES public.quiz_rounds(id) ON DELETE CASCADE,
  question_number smallint NOT NULL CHECK (question_number BETWEEN 1 AND 4),
  selected_option smallint NOT NULL CHECK (selected_option >= 0),
  correct boolean NOT NULL,
  explanation text NOT NULL,
  PRIMARY KEY (round_id, question_number)
);

CREATE OR REPLACE FUNCTION public.instructor_course_quiz_round_summary(p_course_id uuid)
RETURNS TABLE(
  student_id uuid, session_id integer, round_count bigint,
  latest_score smallint, best_score smallint, question_count smallint, latest_submitted_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT (SELECT private.is_admin()) AND NOT (SELECT private.is_course_instructor(p_course_id)) THEN
    RAISE EXCEPTION 'You are not assigned to this course';
  END IF;
  RETURN QUERY
  SELECT qr.student_id,qr.session_id,count(*)::bigint,
    (array_agg(qr.score ORDER BY qr.submitted_at DESC))[1]::smallint,max(qr.score)::smallint,
    (array_agg(qr.question_count ORDER BY qr.submitted_at DESC))[1]::smallint,max(qr.submitted_at)
  FROM public.quiz_rounds qr
  JOIN public.sessions s ON s.id=qr.session_id
  JOIN public.modules m ON m.id=s.module_id AND m.course_id=p_course_id
  JOIN public.course_enrollments e ON e.course_id=p_course_id AND e.student_id=qr.student_id AND e.status='active'
  LEFT JOIN public.student_instructors si ON si.course_id=p_course_id AND si.student_id=qr.student_id
  WHERE (SELECT private.is_admin()) OR si.instructor_id=(SELECT auth.uid())
  GROUP BY qr.student_id,qr.session_id;
END; $$;
REVOKE ALL ON FUNCTION public.instructor_course_quiz_round_summary(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.instructor_course_quiz_round_summary(uuid) TO authenticated;
ALTER TABLE public.quiz_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_round_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quiz_rounds, public.quiz_round_answers FROM anon, authenticated;
GRANT SELECT ON public.quiz_rounds, public.quiz_round_answers TO authenticated;
CREATE POLICY "Learners and assigned course staff read quiz rounds"
  ON public.quiz_rounds FOR SELECT TO authenticated USING (
    student_id = (SELECT auth.uid()) OR (SELECT private.is_admin()) OR EXISTS (
      SELECT 1 FROM public.sessions s JOIN public.modules m ON m.id=s.module_id
      WHERE s.id=quiz_rounds.session_id AND (SELECT private.is_course_instructor(m.course_id))
    )
  );
CREATE POLICY "Learners and assigned course staff read quiz round answers"
  ON public.quiz_round_answers FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quiz_rounds qr WHERE qr.id=quiz_round_answers.round_id)
  );

CREATE OR REPLACE FUNCTION private.can_access_conversation(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id=p_conversation_id AND p_user_id=(SELECT auth.uid()) AND (
      (c.kind='private_chat' AND (
        (c.learner_id=p_user_id AND EXISTS (
          SELECT 1 FROM public.course_enrollments e
          JOIN public.student_instructors si ON si.course_id=e.course_id AND si.student_id=e.student_id AND si.instructor_id=c.instructor_id
          JOIN public.course_instructors ci ON ci.course_id=si.course_id AND ci.instructor_id=si.instructor_id
          WHERE e.course_id=c.course_id AND e.student_id=p_user_id AND e.status='active'
        )) OR (c.instructor_id=p_user_id AND EXISTS (
          SELECT 1 FROM public.course_instructors ci
          JOIN public.student_instructors si ON si.course_id=ci.course_id AND si.instructor_id=ci.instructor_id
          WHERE ci.course_id=c.course_id AND ci.instructor_id=p_user_id AND si.student_id=c.learner_id
        ))
      )) OR (c.kind<>'private_chat' AND (
        EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=c.course_id AND e.student_id=p_user_id AND e.status='active')
        OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id=c.course_id AND ci.instructor_id=p_user_id)
        OR (SELECT private.is_admin())
      ))
    )
  )
$$;
REVOKE ALL ON FUNCTION private.can_access_conversation(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_conversation(uuid,uuid) TO authenticated;

CREATE POLICY "Conversation participants and course members can read threads"
  ON public.conversations FOR SELECT TO authenticated
  USING (private.can_access_conversation(id, (SELECT auth.uid())));

CREATE OR REPLACE FUNCTION private.initialize_conversation_reads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.kind='private_chat' THEN
    INSERT INTO public.conversation_reads(conversation_id,user_id,last_read_at)
      VALUES(NEW.id,NEW.learner_id,NEW.created_at),(NEW.id,NEW.instructor_id,NEW.created_at)
      ON CONFLICT(conversation_id,user_id) DO NOTHING;
  ELSE
    INSERT INTO public.conversation_reads(conversation_id,user_id,last_read_at)
      SELECT NEW.id,members.user_id,NEW.created_at FROM (
        SELECT e.student_id AS user_id FROM public.course_enrollments e WHERE e.course_id=NEW.course_id AND e.status='active'
        UNION
        SELECT ci.instructor_id AS user_id FROM public.course_instructors ci WHERE ci.course_id=NEW.course_id
      ) members
      ON CONFLICT(conversation_id,user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.initialize_conversation_reads() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER initialize_conversation_reads AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION private.initialize_conversation_reads();

CREATE OR REPLACE FUNCTION public.conversation_inbox_summaries()
RETURNS TABLE(
  id uuid, course_id uuid, kind text, title text, is_pinned boolean, locked_at timestamptz,
  updated_at timestamptz, latest_body text, latest_sender_id uuid, latest_at timestamptz, unread_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.id,c.course_id,c.kind,c.title,c.is_pinned,c.locked_at,c.updated_at,
    latest.body,latest.sender_id,latest.created_at,COALESCE(unread.count,0)::bigint
  FROM public.conversations c
  LEFT JOIN LATERAL (
    SELECT m.body,m.sender_id,m.created_at FROM public.conversation_messages m
    WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1
  ) latest ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS count FROM public.conversation_messages m
    LEFT JOIN public.conversation_reads r ON r.conversation_id=c.id AND r.user_id=(SELECT auth.uid())
    WHERE m.conversation_id=c.id AND m.sender_id IS DISTINCT FROM (SELECT auth.uid())
      AND m.created_at>COALESCE(r.last_read_at,c.created_at) AND m.deleted_at IS NULL
  ) unread ON true
  WHERE private.can_access_conversation(c.id,(SELECT auth.uid()))
  ORDER BY c.is_pinned DESC,c.updated_at DESC
$$;
REVOKE ALL ON FUNCTION public.conversation_inbox_summaries() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.conversation_inbox_summaries() TO authenticated;
CREATE POLICY "Participants read messages"
  ON public.conversation_messages FOR SELECT TO authenticated
  USING (private.can_access_conversation(conversation_id, (SELECT auth.uid())));

CREATE OR REPLACE FUNCTION private.validate_conversation_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_course uuid;
BEGIN
  SELECT course_id INTO v_course FROM public.conversations WHERE id=NEW.conversation_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF NEW.reply_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conversation_messages parent
    WHERE parent.id=NEW.reply_to AND parent.conversation_id=NEW.conversation_id
  ) THEN RAISE EXCEPTION 'Replies must point to a message in this conversation'; END IF;
  IF NEW.lesson_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sessions s JOIN public.modules m ON m.id=s.module_id
    WHERE s.id=NEW.lesson_id AND m.course_id=v_course AND m.status='published'
  ) THEN RAISE EXCEPTION 'The linked lesson must be published in this course'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_conversation_message() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_conversation_message BEFORE INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION private.validate_conversation_message();

-- Return only classroom names for this thread. The general profile row stays private.
CREATE OR REPLACE FUNCTION public.conversation_messages_for_thread(p_conversation_id uuid)
RETURNS TABLE(
  id uuid, conversation_id uuid, sender_id uuid, body text, reply_to uuid,
  lesson_id integer, edited_at timestamptz, deleted_at timestamptz, is_pinned boolean,
  created_at timestamptz, display_name text, sender_role text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.id,m.conversation_id,m.sender_id,m.body,m.reply_to,m.lesson_id,m.edited_at,m.deleted_at,m.is_pinned,m.created_at,
    COALESCE(NULLIF(BTRIM(p.display_name),''),CASE WHEN p.role='instructor' THEN 'Instructor' ELSE 'Learner' END),p.role
  FROM public.conversation_messages m JOIN public.profiles p ON p.id=m.sender_id
  WHERE m.conversation_id=p_conversation_id AND private.can_access_conversation(p_conversation_id,(SELECT auth.uid()))
  ORDER BY m.created_at
$$;
REVOKE ALL ON FUNCTION public.conversation_messages_for_thread(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.conversation_messages_for_thread(uuid) TO authenticated;
CREATE POLICY "Participants send messages to unlocked threads"
  ON public.conversation_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id=(SELECT auth.uid())
    AND private.can_access_conversation(conversation_id, (SELECT auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id=conversation_id AND c.locked_at IS NOT NULL)
  );
CREATE POLICY "Authors edit or hide their own messages"
  ON public.conversation_messages FOR UPDATE TO authenticated
  USING (sender_id=(SELECT auth.uid()) AND private.can_access_conversation(conversation_id, (SELECT auth.uid())))
  WITH CHECK (sender_id=(SELECT auth.uid()) AND private.can_access_conversation(conversation_id, (SELECT auth.uid())));

-- Authors can edit the message text or soft-delete their own message, but cannot
-- impersonate another sender, pin content, or rewrite its history timestamps.
CREATE OR REPLACE FUNCTION private.guard_conversation_message_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT private.is_admin()) OR (SELECT private.is_course_instructor(
    (SELECT c.course_id FROM public.conversations c WHERE c.id=OLD.conversation_id)
  )) THEN
    RETURN NEW;
  END IF;
  IF OLD.sender_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Only the author or course staff can update this message';
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.edited_at IS DISTINCT FROM OLD.edited_at
     OR NEW.is_pinned IS DISTINCT FROM OLD.is_pinned
     OR NEW.reply_to IS DISTINCT FROM OLD.reply_to
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id THEN
    RAISE EXCEPTION 'Only message text and deletion state can be changed by its author';
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body THEN NEW.edited_at := now(); END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.guard_conversation_message_update() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_conversation_message_update ON public.conversation_messages;
CREATE TRIGGER guard_conversation_message_update BEFORE UPDATE ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION private.guard_conversation_message_update();
CREATE POLICY "Participants manage their read cursor"
  ON public.conversation_reads FOR ALL TO authenticated
  USING (user_id=(SELECT auth.uid()) AND private.can_access_conversation(conversation_id,(SELECT auth.uid())))
  WITH CHECK (user_id=(SELECT auth.uid()) AND private.can_access_conversation(conversation_id,(SELECT auth.uid())));
CREATE POLICY "Learners report visible messages"
  ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id=(SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.conversation_messages m WHERE m.id=message_id
      AND private.can_access_conversation(m.conversation_id,(SELECT auth.uid()))
  ));
CREATE POLICY "Report authors view their reports; admins view report queue"
  ON public.message_reports FOR SELECT TO authenticated
  USING (reporter_id=(SELECT auth.uid()) OR (SELECT private.is_admin()));

CREATE OR REPLACE FUNCTION public.open_assigned_instructor_chat(p_course_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid := (SELECT auth.uid()); v_instructor uuid; v_conversation uuid;
BEGIN
  IF v_student IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.course_enrollments e WHERE e.course_id=p_course_id AND e.student_id=v_student AND e.status='active'
  ) THEN RAISE EXCEPTION 'Active course enrollment is required'; END IF;
  SELECT si.instructor_id INTO v_instructor FROM public.student_instructors si
    JOIN public.course_instructors ci ON ci.course_id=si.course_id AND ci.instructor_id=si.instructor_id
    WHERE si.course_id=p_course_id AND si.student_id=v_student;
  IF v_instructor IS NULL THEN RAISE EXCEPTION 'No instructor has been assigned to this course yet'; END IF;
  INSERT INTO public.conversations(course_id,kind,learner_id,instructor_id,title,created_by)
  VALUES(p_course_id,'private_chat',v_student,v_instructor,'Learner and instructor',v_student)
  ON CONFLICT (course_id,learner_id,instructor_id) WHERE kind='private_chat'
  DO UPDATE SET updated_at=public.conversations.updated_at
  RETURNING id INTO v_conversation;
  RETURN v_conversation;
END; $$;
REVOKE ALL ON FUNCTION public.open_assigned_instructor_chat(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_assigned_instructor_chat(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.share_ai_messages_to_instructor(
  p_ai_conversation_id uuid,p_message_ids uuid[],p_include_code boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := (SELECT auth.uid()); v_session integer; v_course uuid;
  v_conversation uuid; v_body text; v_message_count integer;
BEGIN
  IF v_user IS NULL OR p_message_ids IS NULL OR cardinality(p_message_ids) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Choose between 1 and 20 messages to share';
  END IF;
  SELECT c.session_id,m.course_id INTO v_session,v_course
    FROM public.ai_conversations c JOIN public.sessions s ON s.id=c.session_id
    JOIN public.modules m ON m.id=s.module_id
    WHERE c.id=p_ai_conversation_id AND c.student_id=v_user;
  IF v_session IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.course_enrollments e
    JOIN public.student_instructors si ON si.course_id=e.course_id AND si.student_id=e.student_id
    JOIN public.course_instructors ci ON ci.course_id=si.course_id AND ci.instructor_id=si.instructor_id
    WHERE e.course_id=v_course AND e.student_id=v_user AND e.status='active'
  ) THEN RAISE EXCEPTION 'An assigned instructor and active course enrollment are required'; END IF;
  SELECT count(*) INTO v_message_count FROM public.ai_chat_messages msg
    WHERE msg.conversation_id=p_ai_conversation_id AND msg.id=ANY(p_message_ids);
  IF v_message_count<>cardinality(p_message_ids) OR v_message_count<>(SELECT count(DISTINCT x) FROM unnest(p_message_ids) AS t(x)) THEN
    RAISE EXCEPTION 'The selected messages do not belong to this saved chat';
  END IF;
  SELECT string_agg(
    CASE WHEN msg.role='user' THEN 'Learner' ELSE 'AI mentor' END || E':\n' || msg.content ||
      CASE WHEN p_include_code AND msg.role='user' AND msg.code_context IS NOT NULL THEN E'\n\nLearner-selected code context:\n```python\n'||msg.code_context||E'\n```' ELSE '' END,
    E'\n\n---\n\n' ORDER BY msg.created_at
  ) INTO v_body FROM public.ai_chat_messages msg
    WHERE msg.conversation_id=p_ai_conversation_id AND msg.id=ANY(p_message_ids);
  v_body := 'Selected AI tutor messages from lesson '||v_session||E':\n\n'||COALESCE(v_body,'');
  IF char_length(v_body)>12000 THEN RAISE EXCEPTION 'The selected content is too long. Share fewer messages.'; END IF;
  SELECT public.open_assigned_instructor_chat(v_course) INTO v_conversation;
  INSERT INTO public.conversation_messages(conversation_id,sender_id,body,lesson_id)
    VALUES(v_conversation,v_user,v_body,v_session);
  RETURN v_conversation;
END; $$;
REVOKE ALL ON FUNCTION public.share_ai_messages_to_instructor(uuid,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.share_ai_messages_to_instructor(uuid,uuid[],boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_course_discussion(p_course_id uuid,p_title text,p_body text,p_announcement boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := (SELECT auth.uid()); v_id uuid; v_kind text;
BEGIN
  IF v_user IS NULL OR NOT (
    EXISTS (SELECT 1 FROM public.course_enrollments e WHERE e.course_id=p_course_id AND e.student_id=v_user AND e.status='active')
    OR (SELECT private.is_course_instructor(p_course_id)) OR (SELECT private.is_admin())
  ) THEN RAISE EXCEPTION 'Course enrollment or instructor access is required'; END IF;
  IF p_announcement AND NOT ((SELECT private.is_course_instructor(p_course_id)) OR (SELECT private.is_admin())) THEN
    RAISE EXCEPTION 'Only course instructors and administrators can post announcements';
  END IF;
  v_kind := CASE WHEN p_announcement THEN 'announcement' ELSE 'discussion' END;
  INSERT INTO public.conversations(course_id,kind,title,created_by,is_pinned) VALUES(p_course_id,v_kind,BTRIM(p_title),v_user,p_announcement) RETURNING id INTO v_id;
  INSERT INTO public.conversation_messages(conversation_id,sender_id,body) VALUES(v_id,v_user,BTRIM(p_body));
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.start_course_discussion(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_course_discussion(uuid,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_course_thread(p_conversation_id uuid,p_lock boolean DEFAULT NULL,p_pin boolean DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_course uuid; v_kind text;
BEGIN
  SELECT course_id,kind INTO v_course,v_kind FROM public.conversations WHERE id=p_conversation_id;
  IF v_course IS NULL OR v_kind='private_chat' THEN RAISE EXCEPTION 'Course discussion not found'; END IF;
  IF NOT ((SELECT private.is_admin()) OR (SELECT private.is_course_instructor(v_course))) THEN
    RAISE EXCEPTION 'Course staff access is required';
  END IF;
  IF p_pin IS NOT NULL AND v_kind<>'announcement' THEN RAISE EXCEPTION 'Only announcements can be pinned'; END IF;
  UPDATE public.conversations SET
    locked_at=CASE WHEN p_lock IS NULL THEN locked_at WHEN p_lock THEN now() ELSE NULL END,
    is_pinned=CASE WHEN p_pin IS NULL THEN is_pinned ELSE p_pin END,
    updated_at=now()
  WHERE id=p_conversation_id;
END; $$;
REVOKE ALL ON FUNCTION public.moderate_course_thread(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_course_thread(uuid,boolean,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_conversation_message(p_message_id uuid,p_hide boolean DEFAULT NULL,p_pin boolean DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_course uuid; v_kind text;
BEGIN
  SELECT c.course_id,c.kind INTO v_course,v_kind FROM public.conversation_messages m
    JOIN public.conversations c ON c.id=m.conversation_id WHERE m.id=p_message_id;
  IF v_course IS NULL OR v_kind='private_chat' THEN RAISE EXCEPTION 'Course discussion message not found'; END IF;
  IF NOT ((SELECT private.is_admin()) OR (SELECT private.is_course_instructor(v_course))) THEN
    RAISE EXCEPTION 'Course staff access is required';
  END IF;
  UPDATE public.conversation_messages SET
    deleted_at=CASE WHEN p_hide IS NULL THEN deleted_at WHEN p_hide THEN COALESCE(deleted_at,now()) ELSE NULL END,
    is_pinned=CASE WHEN p_pin IS NULL THEN is_pinned ELSE p_pin END
  WHERE id=p_message_id;
END; $$;
REVOKE ALL ON FUNCTION public.moderate_conversation_message(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_conversation_message(uuid,boolean,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_conversation_message(p_message_id uuid,p_reason text,p_details text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := (SELECT auth.uid()); v_report uuid;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.conversation_messages m
    WHERE m.id=p_message_id AND private.can_access_conversation(m.conversation_id,v_user)
  ) THEN RAISE EXCEPTION 'You cannot report this message'; END IF;
  INSERT INTO public.message_reports(message_id,reporter_id,reason,details)
  VALUES(p_message_id,v_user,p_reason,NULLIF(BTRIM(p_details),'')) RETURNING id INTO v_report;
  RETURN v_report;
END; $$;
REVOKE ALL ON FUNCTION public.report_conversation_message(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.report_conversation_message(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_message_report(p_report_id uuid,p_purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_report record; v_context jsonb;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF char_length(BTRIM(p_purpose)) < 5 THEN RAISE EXCEPTION 'Enter a brief reason for this review'; END IF;
  SELECT r.id,r.message_id,r.reason,r.details,r.status,r.created_at,m.conversation_id,m.sender_id,m.body,m.created_at AS message_created
  INTO v_report FROM public.message_reports r JOIN public.conversation_messages m ON m.id=r.message_id WHERE r.id=p_report_id;
  IF v_report.id IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  INSERT INTO public.message_moderation_access_audit(report_id,admin_id,purpose) VALUES(p_report_id,(SELECT auth.uid()),BTRIM(p_purpose));
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',q.id,'sender_id',q.sender_id,'body',q.body,'created_at',q.created_at,'deleted_at',q.deleted_at) ORDER BY q.created_at),'[]'::jsonb)
  INTO v_context FROM (
    SELECT m.id,m.sender_id,m.body,m.created_at,m.deleted_at FROM public.conversation_messages m
    WHERE m.conversation_id=v_report.conversation_id
      AND m.created_at BETWEEN v_report.message_created - interval '2 days' AND v_report.message_created + interval '2 days'
    ORDER BY abs(extract(epoch FROM (m.created_at-v_report.message_created))) LIMIT 21
  ) q;
  RETURN jsonb_build_object('report',jsonb_build_object('id',v_report.id,'reason',v_report.reason,'details',v_report.details,'status',v_report.status,'created_at',v_report.created_at),
    'reported_message',jsonb_build_object('id',v_report.message_id,'sender_id',v_report.sender_id,'body',v_report.body,'created_at',v_report.message_created),'context',v_context);
END; $$;
REVOKE ALL ON FUNCTION public.admin_review_message_report(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_message_report(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_message_report(p_report_id uuid,p_status text,p_resolution text,p_hide_message boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_message uuid;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_status NOT IN ('reviewing','resolved','dismissed') THEN RAISE EXCEPTION 'Invalid report status'; END IF;
  UPDATE public.message_reports SET status=p_status,resolution=NULLIF(BTRIM(p_resolution),''),reviewed_by=(SELECT auth.uid()),reviewed_at=now()
    WHERE id=p_report_id RETURNING message_id INTO v_message;
  IF v_message IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF p_hide_message THEN UPDATE public.conversation_messages SET deleted_at=COALESCE(deleted_at,now()) WHERE id=v_message; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_resolve_message_report(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_message_report(uuid,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quick_check_round(p_session_id integer,p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_student uuid := (SELECT auth.uid()); v_count integer; v_score integer := 0; v_round uuid;
  v_snapshot jsonb; v_mastered smallint[]; v_completed boolean := false; v_answer record;
BEGIN
  IF v_student IS NULL OR jsonb_typeof(p_answers)<>'array' THEN RAISE EXCEPTION 'Sign in and submit a complete answer set'; END IF;
  SELECT CASE WHEN jsonb_typeof(s.quick_check->'questions')='array' THEN jsonb_array_length(s.quick_check->'questions')
    WHEN jsonb_typeof(s.quick_check->'options')='array' THEN 1 ELSE 0 END,
    jsonb_build_object('session_id',s.id,'title',s.title,'quick_check',s.quick_check,'captured_at',now())
    INTO v_count,v_snapshot FROM public.sessions s JOIN public.modules m ON m.id=s.module_id
    WHERE s.id=p_session_id AND m.status='published'
      AND (SELECT private.is_admin() OR private.is_course_instructor(m.course_id) OR EXISTS (
        SELECT 1 FROM public.course_enrollments e WHERE e.course_id=m.course_id AND e.student_id=v_student AND e.status='active'
          AND (e.plan IN ('paid_full','scholarship') OR (e.plan='free_month1' AND m.is_free AND e.started_at>now()-interval '30 days')
            OR EXISTS(SELECT 1 FROM public.course_month_entitlements ent WHERE ent.course_id=e.course_id AND ent.student_id=e.student_id AND ent.month_number=m.month_number AND ent.starts_at<=now() AND ent.expires_at>now()))
      ));
  IF v_count IS NULL OR v_count NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'This quick check is unavailable'; END IF;
  IF jsonb_array_length(p_answers)<>v_count THEN RAISE EXCEPTION 'Answer every question before submitting the round'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.sessions earlier JOIN public.sessions current_s ON current_s.module_id=earlier.module_id
    JOIN public.modules cm ON cm.id=current_s.module_id
    WHERE current_s.id=p_session_id AND earlier.session_number<current_s.session_number
      AND NOT EXISTS(SELECT 1 FROM public.user_progress up WHERE up.student_id=v_student AND up.session_id=earlier.id AND up.completed)
  ) THEN RAISE EXCEPTION 'Complete the earlier lessons in this week first'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_answers) a WHERE (a->>'question_number') IS NULL OR (a->>'selected_option') IS NULL) THEN
    RAISE EXCEPTION 'Each answer needs a question number and selected option';
  END IF;
  IF (SELECT count(DISTINCT (a->>'question_number')::int) FROM jsonb_array_elements(p_answers) a)<>v_count
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_answers) a WHERE (a->>'question_number')::int NOT BETWEEN 1 AND v_count) THEN
    RAISE EXCEPTION 'Submit one answer for every question';
  END IF;
  INSERT INTO public.quiz_rounds(student_id,session_id,score,question_count,content_snapshot)
  VALUES(v_student,p_session_id,0,v_count,v_snapshot) RETURNING id INTO v_round;
  FOR v_answer IN SELECT (a->>'question_number')::smallint AS question_number,(a->>'selected_option')::smallint AS selected_option
    FROM jsonb_array_elements(p_answers) a ORDER BY (a->>'question_number')::int
  LOOP
    IF v_answer.selected_option<0 THEN RAISE EXCEPTION 'Answer choices must be valid'; END IF;
    DECLARE v_key smallint; v_explanation text; v_question jsonb;
    BEGIN
      SELECT correct_option,explanation INTO v_key,v_explanation FROM private.session_quick_check_question_answers
        WHERE session_id=p_session_id AND question_number=v_answer.question_number;
      IF v_key IS NULL AND v_answer.question_number=1 THEN
        SELECT correct_option,explanation INTO v_key,v_explanation FROM private.session_quick_check_answers WHERE session_id=p_session_id;
      END IF;
      IF v_key IS NULL THEN RAISE EXCEPTION 'Answer key is missing for a question'; END IF;
      SELECT CASE WHEN jsonb_typeof(s.quick_check->'questions')='array' THEN s.quick_check->'questions'->(v_answer.question_number-1)
        ELSE s.quick_check END INTO v_question FROM public.sessions s WHERE s.id=p_session_id;
      IF v_answer.selected_option>=jsonb_array_length(v_question->'options') THEN RAISE EXCEPTION 'Selected answer is outside the available options'; END IF;
      INSERT INTO public.quiz_round_answers(round_id,question_number,selected_option,correct,explanation)
        VALUES(v_round,v_answer.question_number,v_answer.selected_option,v_answer.selected_option=v_key,COALESCE(v_explanation,''));
      IF v_answer.selected_option=v_key THEN v_score:=v_score+1; END IF;
      INSERT INTO public.session_quick_check_attempts(student_id,session_id,question_number,selected_option,correct,content_snapshot)
        VALUES(v_student,p_session_id,v_answer.question_number,v_answer.selected_option,v_answer.selected_option=v_key,v_snapshot);
    END;
  END LOOP;
  UPDATE public.quiz_rounds SET score=v_score WHERE id=v_round;
  SELECT array_agg(DISTINCT a.question_number ORDER BY a.question_number) INTO v_mastered
    FROM public.session_quick_check_attempts a WHERE a.student_id=v_student AND a.session_id=p_session_id AND a.correct;
  IF COALESCE(cardinality(v_mastered),0)=v_count THEN
    INSERT INTO public.user_progress(student_id,session_id,completed,last_accessed)
      VALUES(v_student,p_session_id,false,now()) ON CONFLICT(student_id,session_id) DO NOTHING;
    UPDATE public.user_progress SET completed=true,completed_at=COALESCE(completed_at,now()),last_accessed=now(),completed_content_snapshot=v_snapshot
      WHERE student_id=v_student AND session_id=p_session_id AND completed=false;
    v_completed:=FOUND;
    IF v_completed THEN UPDATE public.profiles SET xp=xp+COALESCE((SELECT s.xp_reward FROM public.sessions s WHERE s.id=p_session_id),0),updated_at=now() WHERE id=v_student AND role='student'; END IF;
  END IF;
  RETURN jsonb_build_object('round_id',v_round,'score',v_score,'question_count',v_count,'mastered_questions',COALESCE(to_jsonb(v_mastered),'[]'::jsonb),'completed_now',v_completed,
    'answers',(SELECT jsonb_agg(jsonb_build_object('question_number',question_number,'selected_option',selected_option,'correct',correct,'explanation',explanation) ORDER BY question_number) FROM public.quiz_round_answers WHERE round_id=v_round),
    'best_score',(SELECT max(score) FROM public.quiz_rounds WHERE student_id=v_student AND session_id=p_session_id),
    'latest_score',v_score);
END; $$;
REVOKE ALL ON FUNCTION public.submit_quick_check_round(integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_quick_check_round(integer,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION private.notify_conversation_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_conversation public.conversations%ROWTYPE; v_recipient record;
BEGIN
  SELECT * INTO v_conversation FROM public.conversations WHERE id=NEW.conversation_id;
  UPDATE public.conversations SET updated_at=NEW.created_at WHERE id=NEW.conversation_id;
  IF v_conversation.kind='private_chat' THEN
    INSERT INTO public.notifications(user_id,kind,title,body,href,entity_id,dedupe_key)
    VALUES(CASE WHEN NEW.sender_id=v_conversation.learner_id THEN v_conversation.instructor_id ELSE v_conversation.learner_id END,
      'message',CASE WHEN NEW.sender_id=v_conversation.learner_id THEN 'New learner message' ELSE 'New instructor message' END,'You have a new message in PyLearn Pro.',
      '/messages',NEW.conversation_id,
      'message:'||NEW.id::text) ON CONFLICT (dedupe_key) DO NOTHING;
  ELSE
    FOR v_recipient IN
      SELECT e.student_id AS user_id FROM public.course_enrollments e WHERE e.course_id=v_conversation.course_id AND e.status='active'
      UNION SELECT ci.instructor_id FROM public.course_instructors ci WHERE ci.course_id=v_conversation.course_id
    LOOP
      IF v_recipient.user_id<>NEW.sender_id THEN
        INSERT INTO public.notifications(user_id,kind,title,body,href,entity_id,dedupe_key)
        VALUES(v_recipient.user_id,CASE WHEN v_conversation.kind='announcement' AND (SELECT count(*) FROM public.conversation_messages WHERE conversation_id=v_conversation.id)=1 THEN 'announcement' ELSE 'message' END,
          CASE WHEN v_conversation.kind='announcement' AND (SELECT count(*) FROM public.conversation_messages WHERE conversation_id=v_conversation.id)=1 THEN 'Course announcement' ELSE 'New course discussion' END,
          CASE WHEN v_conversation.kind='announcement' AND (SELECT count(*) FROM public.conversation_messages WHERE conversation_id=v_conversation.id)=1 THEN 'A course instructor posted an announcement.' ELSE 'There is a new post in your course discussion.' END,
          '/messages',NEW.conversation_id,'message:'||NEW.id::text||':'||v_recipient.user_id::text) ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER conversation_message_notifications AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION private.notify_conversation_message();

-- Supabase Realtime is used for inbox refreshes. Duplicate registration is harmless.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
