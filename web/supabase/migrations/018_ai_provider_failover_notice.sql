-- Disclose the additional AI providers and request re-acceptance of the
-- updated Admission Document. Applying this migration pauses lesson access
-- until learners accept the new version; guardians must confirm again for
-- learners under 18.
DO $$
DECLARE
  current_document public.admission_document_versions%ROWTYPE;
  next_version integer;
  ai_update text := E'\n\n## Updated information about optional AI help\nThis section updates and replaces earlier descriptions of AI providers in this guide. When you use the AI tutor, your question, lesson title and text, current editor code, and recent tutor conversation are sent to the configured AI provider. PyLearn Pro tries Google Gemini, Groq, Cloudflare Workers AI, and OpenRouter in that order, skipping any provider that has not been configured. If one provider is unavailable, the same request is sent to the next configured provider. A provider that was tried has already received the request.\n\nEach provider has its own service terms and data practices. Some free services may use prompts to improve their products, and OpenRouter may route a request to different model providers. Do not include names, contact details, passwords, private, or confidential information in AI requests. AI replies can be wrong; check important information against your lesson.';
BEGIN
  SELECT * INTO current_document
  FROM public.admission_document_versions
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot publish the AI provider notice because no Admission Document exists';
  END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO next_version
  FROM public.admission_document_versions;

  INSERT INTO public.admission_document_versions(version, title, content_markdown, requires_reacceptance)
  VALUES (
    next_version,
    current_document.title,
    current_document.content_markdown || ai_update,
    true
  );

  -- Preserve any unpublished administrator draft and add the same notice.
  UPDATE public.admission_document_draft
  SET content_markdown = CASE
        WHEN position('## Updated information about optional AI help' IN content_markdown) > 0 THEN content_markdown
        ELSE content_markdown || ai_update
      END,
      updated_at = now()
  WHERE id = true;

  -- Guardian consent is version-specific. Mark minors for a fresh guardian
  -- confirmation; the administrator must send the updated guide/link.
  UPDATE public.profiles
  SET guardian_consent_status = 'pending', updated_at = now()
  WHERE age < 18 AND guardian_consent_status = 'verified';
END;
$$;
