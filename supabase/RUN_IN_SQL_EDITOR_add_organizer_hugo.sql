-- Přidání organizátora Hugo (ručně).
-- 1) Nejdřív spusť RUN_IN_SQL_EDITOR_larp_organizers.sql (vytvoří tabulku larp_organizers).
-- 2) Pak spusť tento skript. Pokud už máš Huga v organizer_accounts, spusť jen druhý INSERT (larp_organizers).

INSERT INTO public.organizer_accounts (login, user_id, auth_email, display_name, contact_email, contact_phone)
VALUES (
  'hugo',
  '080ba5fe-65fa-4ca2-9b2f-371c946831ec'::uuid,
  'hugo@organizer.local',
  'Hugo Boss',
  NULL,
  NULL
);

INSERT INTO public.larp_organizers (larp_id, user_id, email)
VALUES (
  '5b67f6de-6639-4b94-88d8-5e4c7d064b14'::uuid,
  '080ba5fe-65fa-4ca2-9b2f-371c946831ec'::uuid,
  'hugo@organizer.local'
);
