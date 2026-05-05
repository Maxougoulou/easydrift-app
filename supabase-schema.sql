-- ============================================================
-- EasyDrift — Schéma Supabase
-- Coller ce SQL dans l'éditeur SQL de Supabase (SQL Editor)
-- ============================================================

-- ─── ÉQUIPE ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id         SERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  avatar     TEXT NOT NULL,    -- initiale ou emoji
  color      TEXT NOT NULL,    -- couleur hex
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROJETS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'À faire',
  priority         TEXT NOT NULL DEFAULT 'Moyenne',
  owner_id         INTEGER REFERENCES team_members(id),
  progress         INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date         DATE,
  category         TEXT,
  description      TEXT,
  tags             TEXT[] DEFAULT '{}',
  budget_allocated NUMERIC DEFAULT 0,
  budget_spent     NUMERIC DEFAULT 0,
  workspace        TEXT DEFAULT 'easydrift',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Assignés d'un projet (relation N-N)
CREATE TABLE IF NOT EXISTS project_assignees (
  project_id     INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, team_member_id)
);

-- ─── TÂCHES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'À faire',
  priority    TEXT NOT NULL DEFAULT 'Moyenne',
  assignee_id INTEGER REFERENCES team_members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMMENTAIRES / MESSAGES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  author_id  INTEGER REFERENCES team_members(id),
  text       TEXT NOT NULL,
  date       TEXT,   -- "2026-05-04"
  time       TEXT,   -- "14:32"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VÉHICULES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  plate                 TEXT,
  year                  INTEGER,
  mileage               INTEGER DEFAULT 0,
  role                  TEXT,
  color                 TEXT DEFAULT '#1a1a2e',
  next_ct               DATE,
  last_ct_date          DATE,
  last_ct_result        TEXT,
  last_ct_center        TEXT,
  next_revision_mileage INTEGER,
  next_revision_date    DATE,
  status                TEXT DEFAULT 'Opérationnel',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HISTORIQUE MAINTENANCE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance (
  id            SERIAL PRIMARY KEY,
  vehicle_id    INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  km            INTEGER NOT NULL,
  type          TEXT NOT NULL,  -- 'Révision', 'CT', 'Pièces'
  parts         TEXT[] DEFAULT '{}',
  cost          NUMERIC DEFAULT 0,
  technician_id INTEGER REFERENCES team_members(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÉVÉNEMENTS CALENDRIER ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  date       DATE NOT NULL,
  type       TEXT NOT NULL,  -- 'project', 'maintenance', 'ct', 'event'
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  color      TEXT DEFAULT '#F07814',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BUDGET MENSUEL ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_monthly (
  id       SERIAL PRIMARY KEY,
  month    TEXT NOT NULL,
  income   NUMERIC DEFAULT 0,
  expenses NUMERIC DEFAULT 0
);

-- ─── BUDGET CATÉGORIES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_categories (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  color  TEXT DEFAULT '#F07814'
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             SERIAL PRIMARY KEY,
  type           TEXT NOT NULL,  -- 'mention', 'task', 'email', 'info'
  from_member_id INTEGER REFERENCES team_members(id),
  to_member_id   INTEGER REFERENCES team_members(id),
  text           TEXT NOT NULL,
  detail         TEXT,
  project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  read           BOOLEAN DEFAULT FALSE,
  date           TEXT,
  time           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVER LE TEMPS RÉEL SUR LES TABLES CONCERNÉES
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- ROW LEVEL SECURITY (accès authentifiés seulement)
-- ============================================================
ALTER TABLE team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_monthly     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- Politique : utilisateurs authentifiés peuvent tout lire et écrire
CREATE POLICY "auth_all" ON team_members      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON projects          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON project_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON tasks              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON comments           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON vehicles           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON maintenance        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON events             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON budget_monthly     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON budget_categories  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON notifications      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DONNÉES INITIALES (données de démo à insérer après avoir
-- créé les comptes Maxence et Alexandre dans Supabase Auth)
-- ============================================================

-- Équipe (mettre à jour auth_user_id APRÈS la création des comptes)
INSERT INTO team_members (name, avatar, color, email) VALUES
  ('Maxence', 'M', '#F07814', 'maxence.fortier@gmail.com'),
  ('Alexandre', 'A', '#3B82F6', 'alexandre@easydrift.fr');

-- Projets EasyDrift
INSERT INTO projects (name, status, priority, owner_id, progress, due_date, category, description, tags, budget_allocated, budget_spent, workspace) VALUES
  ('BMW E46 — Build Drift', 'En cours', 'Haute', 1, 65, '2026-06-15', 'Build véhicule', 'Préparation complète de la E46 pour la saison drift 2026. Cage, moteur, suspension.', ARRAY['Drift','Build','Compétition'], 12000, 7800, 'easydrift'),
  ('Partenariat Yokohama 2026', 'En attente', 'Haute', 1, 30, '2026-05-20', 'Partenariat', 'Négociation contrat pneus saison 2026. Dotation + visibilité réseaux.', ARRAY['Partenariat','Commercial'], 0, 0, 'easydrift'),
  ('App EasyDrift — Suivi Client', 'En cours', 'Moyenne', 2, 45, '2026-07-01', 'Application', 'Développement application mobile pour les clients — suivi en temps réel de leur véhicule.', ARRAY['Dev','Application','Client'], 5000, 2200, 'easydrift'),
  ('Événement Drift Masters Mai', 'Terminé', 'Haute', 1, 100, '2026-04-28', 'Événement', 'Organisation et participation au Drift Masters — Circuit de Dijon.', ARRAY['Événement','Compétition'], 3000, 2850, 'easydrift'),
  ('Réseaux sociaux — Stratégie Q2', 'En cours', 'Moyenne', 2, 55, '2026-06-30', 'Marketing', 'Plan de contenu Instagram / TikTok pour le Q2 2026.', ARRAY['Marketing','Réseaux'], 1500, 600, 'easydrift');

-- Projets Toyah Games
INSERT INTO projects (name, status, priority, owner_id, progress, due_date, category, description, tags, budget_allocated, budget_spent, workspace) VALUES
  ('Jeu mobile — Drift Arena', 'En cours', 'Haute', 2, 40, '2026-09-01', 'Jeu mobile', 'Jeu de drift casual mobile iOS/Android. Physique arcade, personnalisation voiture, classements.', ARRAY['Mobile','Jeu','Drift'], 8000, 3200, 'toyah_games'),
  ('Site vitrine Toyah Games', 'En cours', 'Moyenne', 2, 70, '2026-05-30', 'Web', 'Site de présentation du studio avec portfolio des jeux et page de contact presse.', ARRAY['Web','Marketing','Studio'], 1500, 1050, 'toyah_games'),
  ('Partenariat Steam — Greenlight', 'À faire', 'Haute', 1, 10, '2026-10-15', 'Distribution', 'Dépôt et validation du dossier Steam pour la version PC de Drift Arena.', ARRAY['Steam','Distribution','PC'], 0, 0, 'toyah_games'),
  ('Bande originale Drift Arena', 'Terminé', 'Moyenne', 1, 100, '2026-04-15', 'Audio', 'Composition et intégration de la bande sonore complète du jeu.', ARRAY['Audio','Musique'], 2000, 1800, 'toyah_games');

-- Assignés
INSERT INTO project_assignees (project_id, team_member_id) VALUES
  (1, 1), (1, 2), (2, 1), (3, 1), (3, 2), (4, 1), (4, 2), (5, 2);

-- Tâches projet 1
INSERT INTO tasks (project_id, title, status, priority, assignee_id) VALUES
  (1, 'Cage de sécurité FIA', 'Terminé', 'Haute', 1),
  (1, 'Swap moteur 2JZ', 'En cours', 'Haute', 2),
  (1, 'Géométrie suspension', 'En cours', 'Moyenne', 1),
  (1, 'Freinage hydraulique arrière', 'À faire', 'Moyenne', 2),
  (1, 'Peinture carrosserie', 'À faire', 'Basse', 1),
  (1, 'Homologation', 'À faire', 'Haute', 1),
  (2, 'Dossier de présentation', 'Terminé', 'Haute', 1),
  (2, 'Réunion contacts Yokohama', 'En cours', 'Haute', 1),
  (2, 'Négociation contrat', 'À faire', 'Haute', 1),
  (2, 'Signature & validation', 'À faire', 'Haute', 1),
  (3, 'Cahier des charges', 'Terminé', 'Haute', 2),
  (3, 'Maquettes UX/UI', 'Terminé', 'Haute', 1),
  (3, 'Développement backend', 'En cours', 'Haute', 2),
  (3, 'Développement frontend', 'En cours', 'Haute', 2),
  (3, 'Tests utilisateurs', 'À faire', 'Moyenne', 1),
  (3, 'Déploiement', 'À faire', 'Haute', 2),
  (5, 'Calendrier éditorial', 'Terminé', 'Haute', 2),
  (5, 'Tournage vidéos build', 'En cours', 'Haute', 2),
  (5, 'Posts sponsorisés', 'À faire', 'Moyenne', 2);

-- Commentaires
INSERT INTO comments (project_id, author_id, text, date, time) VALUES
  (1, 2, 'Le moteur arrive mardi, on peut prévoir l''installation en fin de semaine ?', '2026-05-02', '14:32'),
  (1, 1, 'Parfait ! Je prépare le berceau moteur d''ici là. On se retrouve jeudi matin.', '2026-05-02', '15:10'),
  (1, 2, 'Top. J''amène les outils spéciaux pour les silent-blocs.', '2026-05-03', '09:45'),
  (2, 1, 'RDV confirmé le 15 mai avec le responsable marketing.', '2026-05-01', '11:20');

-- Véhicules
INSERT INTO vehicles (name, plate, year, mileage, role, color, next_ct, last_ct_date, last_ct_result, last_ct_center, next_revision_mileage, next_revision_date, status) VALUES
  ('BMW E46 330i', 'EZ-046-DR', 2002, 187450, 'Voiture de drift principale', '#1a1a2e', '2027-03-15', '2025-03-15', 'Favorable', 'Autovision Lyon', 190000, '2026-07-01', 'En préparation'),
  ('Toyota GR86', 'EZ-086-GR', 2023, 18200, 'Démo / Formation', '#1a2e1a', '2029-11-20', '2023-11-20', 'Favorable', 'Contrôle Technique Lyon Nord', 20000, '2026-06-15', 'Opérationnel'),
  ('Mazda MX-5 ND', 'EZ-MX5-N', 2019, 54300, 'Initiation drift', '#2e1a1a', '2026-08-10', '2024-08-10', 'Favorable avec observations', 'Dekra Lyon', 55000, '2026-06-01', 'Attention');

-- Maintenance
INSERT INTO maintenance (vehicle_id, date, km, type, parts, cost, technician_id, notes) VALUES
  (1, '2026-04-10', 185200, 'Révision', ARRAY['Huile moteur 5W40','Filtre à huile','Filtre à air','Bougies NGK'], 320, 1, 'RAS, moteur en bon état avant swap.'),
  (1, '2026-03-22', 184100, 'Pièces', ARRAY['Amortisseurs Bilstein B8 x4','Silent-blocs triangle avant x2'], 1250, 2, 'Remplacement suite usure compétition.'),
  (1, '2026-01-15', 182000, 'Révision', ARRAY['Plaquettes Ferodo Racing avant','Disques EBC Sportslot avant'], 480, 1, 'Préparation saison 2026.'),
  (1, '2025-10-05', 178500, 'CT', '{}', 85, NULL, 'CT favorable. Prochain CT mars 2027.'),
  (1, '2025-08-20', 175000, 'Révision', ARRAY['Courroie de distribution','Pompe à eau','Visco-coupleur'], 780, 1, 'Remplacement préventif à 175k km.'),
  (2, '2026-02-14', 15000, 'Révision', ARRAY['Huile Motul 5W30','Filtre à huile','Filtre habitacle'], 280, 2, 'Révision des 15000 km.'),
  (2, '2025-06-10', 10000, 'Révision', ARRAY['Huile moteur','Filtre à huile','Contrôle freins'], 190, 2, 'Révision des 10000 km. RAS.'),
  (3, '2026-03-01', 52000, 'Pièces', ARRAY['Pneus arrière Nankang NS-2R x2'], 220, 1, 'Remplacement après saison initiation.'),
  (3, '2025-09-15', 48000, 'Révision', ARRAY['Huile moteur','Filtre à huile','Liquide de frein'], 210, 2, 'RAS.');

-- Événements
INSERT INTO events (title, date, type, vehicle_id, project_id, color) VALUES
  ('Révision GR86', '2026-06-15', 'maintenance', 2, NULL, '#3B82F6'),
  ('CT MX-5 ND', '2026-08-10', 'ct', 3, NULL, '#EF4444'),
  ('Partenariat Yokohama — RDV', '2026-05-15', 'project', NULL, 2, '#F07814'),
  ('Livraison moteur 2JZ', '2026-05-06', 'project', NULL, 1, '#F07814'),
  ('Drift Masters Dijon', '2026-06-22', 'event', NULL, NULL, '#A855F7'),
  ('Révision MX-5', '2026-06-01', 'maintenance', 3, NULL, '#3B82F6'),
  ('Signature partenariat', '2026-05-20', 'project', NULL, 2, '#F07814');

-- Budget mensuel
INSERT INTO budget_monthly (month, income, expenses) VALUES
  ('Jan', 4200, 2100),
  ('Fév', 3800, 3200),
  ('Mar', 5500, 2800),
  ('Avr', 6200, 4100),
  ('Mai', 4800, 1900);

-- Budget catégories
INSERT INTO budget_categories (name, amount, color) VALUES
  ('Pièces & Mécanique', 3280, '#F07814'),
  ('Événements', 2850, '#3B82F6'),
  ('Marketing', 600, '#A855F7'),
  ('Applications', 2200, '#22C55E'),
  ('Divers', 420, '#6B7280');

-- Notifications initiales
INSERT INTO notifications (type, from_member_id, to_member_id, text, detail, project_id, read, date, time) VALUES
  ('mention', 2, 1, 'Alexandre t''a mentionné dans BMW E46 — Build Drift', 'Le moteur arrive mardi, @Maxence on peut prévoir l''installation ?', 1, false, '2026-05-02', '14:32'),
  ('task', 2, 1, 'Alexandre a complété "Cahier des charges"', 'App EasyDrift — Suivi Client', 3, false, '2026-05-03', '10:15');
