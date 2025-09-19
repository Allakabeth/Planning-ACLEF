-- =============================================
-- 🔧 DÉSACTIVATION COMPLÈTE RLS - ACLEF PLANNING
-- =============================================
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw/sql/new

-- 1. DÉSACTIVER RLS SUR TOUTES LES TABLES CRITIQUES
ALTER TABLE planning_type_formateurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE absences_formateurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE planning_hebdomadaire DISABLE ROW LEVEL SECURITY;
ALTER TABLE lieux DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions DISABLE ROW LEVEL SECURITY;

-- 2. VÉRIFICATION QUE TOUT EST BIEN DÉSACTIVÉ
SELECT 
    tablename AS "Table",
    CASE 
        WHEN rowsecurity = true THEN '❌ RLS ACTIF'
        ELSE '✅ RLS DÉSACTIVÉ'
    END AS "Statut RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'planning_type_formateurs',
    'absences_formateurs',
    'messages',
    'planning_hebdomadaire',
    'lieux',
    'users',
    'admin_sessions'
)
ORDER BY tablename;

-- =============================================
-- RÉSULTAT ATTENDU :
-- Toutes les tables doivent afficher "✅ RLS DÉSACTIVÉ"
-- =============================================

-- 3. TEST RAPIDE D'INSERTION
-- Si ce test passe, les formateurs pourront sauvegarder leur planning
INSERT INTO planning_type_formateurs (
    formateur_id,
    jour,
    creneau,
    statut,
    lieu_id,
    valide
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- ID test
    'Test',
    'test',
    'disponible',
    NULL,
    false
);

-- 4. NETTOYAGE DU TEST
DELETE FROM planning_type_formateurs 
WHERE formateur_id = '00000000-0000-0000-0000-000000000001';

-- =============================================
-- ✅ SI TOUT S'EXÉCUTE SANS ERREUR :
-- Les RLS sont désactivés et l'application fonctionnera normalement !
-- =============================================