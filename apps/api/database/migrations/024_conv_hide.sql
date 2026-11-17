-- 024: usuwanie rozmowy = ukrycie dla danej strony (wraca przy nowej wiadomości)
ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
