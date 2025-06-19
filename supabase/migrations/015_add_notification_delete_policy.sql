-- Add delete policy for notifications so users can clear their own notifications

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
USING (auth.uid() = recipient_id);