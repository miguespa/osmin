-- Fix: añade el unique constraint en months si no existe
-- Ejecutar en Supabase SQL Editor si el error persiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'months_user_year_month'
  ) THEN
    ALTER TABLE months
      ADD CONSTRAINT months_user_year_month UNIQUE (user_id, year, month);
  END IF;
END $$;
