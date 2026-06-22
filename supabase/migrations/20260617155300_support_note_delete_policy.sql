-- Add delete policy for support_notes to allow authors to delete their own notes
CREATE POLICY "notes_delete_policy" ON public.support_notes
    FOR DELETE USING (
        auth.uid() = author_id
    );
