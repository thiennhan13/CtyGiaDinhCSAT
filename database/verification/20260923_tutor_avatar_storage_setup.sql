-- MUTATING: run only on an explicitly authorized Supabase environment.
-- Kept separate from application migration because test PostgreSQL has no Storage schema.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('tutor-avatars','tutor-avatars',true,204800,ARRAY['image/webp']) ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='tutor-avatars' AND public=true
  AND file_size_limit=204800 AND allowed_mime_types=ARRAY['image/webp']) THEN
  RAISE EXCEPTION 'Existing avatar bucket differs. Review configuration; do not overwrite automatically.';
 END IF;
END $$;
-- Restrictive policies protect this bucket even if another permissive project policy exists.
DROP POLICY IF EXISTS tutor_avatar_no_direct_insert ON storage.objects;
CREATE POLICY tutor_avatar_no_direct_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(bucket_id<>'tutor-avatars');
DROP POLICY IF EXISTS tutor_avatar_no_direct_update ON storage.objects;
CREATE POLICY tutor_avatar_no_direct_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(bucket_id<>'tutor-avatars') WITH CHECK(bucket_id<>'tutor-avatars');
DROP POLICY IF EXISTS tutor_avatar_no_direct_delete ON storage.objects;
CREATE POLICY tutor_avatar_no_direct_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(bucket_id<>'tutor-avatars');
COMMIT;
