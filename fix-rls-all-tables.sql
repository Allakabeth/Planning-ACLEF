-- 🔧 SCRIPT DE CORRECTION RLS - ACLEF Planning v8
-- ================================================
-- Ce script désactive RLS sur les tables qui posent problème
-- car l'application utilise son propre système JWT, pas l'auth Supabase

-- 1. PLANNING TYPE FORMATEURS (problème actuel d'Auda)
ALTER TABLE planning_type_formateurs DISABLE ROW LEVEL SECURITY;

-- 2. ABSENCES FORMATEURS (pour éviter des problèmes similaires)
ALTER TABLE absences_formateurs DISABLE ROW LEVEL SECURITY;

-- 3. MESSAGES (communication admin-formateurs)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 4. PLANNING HEBDOMADAIRE (affectations coordo)
ALTER TABLE planning_hebdomadaire DISABLE ROW LEVEL SECURITY;

-- 5. USERS (table principale des utilisateurs)
-- ⚠️ Celle-ci est plus sensible, on peut la garder avec RLS si elle fonctionne
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 6. LIEUX (référentiel des lieux)
ALTER TABLE lieux DISABLE ROW LEVEL SECURITY;

-- 7. ADMIN SESSIONS (si elle existe)
-- ALTER TABLE admin_sessions DISABLE ROW LEVEL SECURITY;

-- ================================================
-- VÉRIFICATION DU STATUT RLS
-- ================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'planning_type_formateurs',
    'absences_formateurs', 
    'messages',
    'planning_hebdomadaire',
    'users',
    'lieux'
)
ORDER BY tablename;

-- ================================================
-- RÉSULTAT ATTENDU :
-- rowsecurity = false pour toutes les tables
-- ================================================