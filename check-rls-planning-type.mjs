import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'

// Client admin pour voir les RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 ANALYSE DES RLS SUR planning_type_formateurs\n')
console.log('=' .repeat(60))

// Requête pour voir les policies actuelles
const query = `
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'planning_type_formateurs'
ORDER BY policyname;
`

try {
    const { data, error } = await supabaseAdmin.rpc('sql_query', { query_text: query }).single()
    
    if (error) {
        // Si la fonction n'existe pas, essayons une approche différente
        console.log('⚠️  Impossible d\'accéder directement aux policies via SQL')
        console.log('Utilisons une approche de test empirique...\n')
    } else {
        console.log('📋 POLICIES ACTUELLES:')
        data.forEach(policy => {
            console.log(`\nPolicy: ${policy.policyname}`)
            console.log(`  Command: ${policy.cmd}`)
            console.log(`  Roles: ${policy.roles}`)
            console.log(`  Check: ${policy.with_check || policy.qual}`)
        })
    }
} catch (err) {
    console.log('Erreur requête policies:', err.message)
}

console.log('\n' + '=' .repeat(60))
console.log('🧪 TEST EMPIRIQUE DES PERMISSIONS\n')

// Test avec client normal (anon)
const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic')

// 1. Test SELECT
console.log('1. TEST SELECT (lecture):')
const { data: selectTest, error: selectError } = await supabaseAnon
    .from('planning_type_formateurs')
    .select('*')
    .limit(1)

console.log(`   SELECT: ${selectError ? '❌ Bloqué - ' + selectError.message : '✅ Autorisé'}`)

// 2. Test INSERT (ce qui pose problème)
console.log('\n2. TEST INSERT (création):')
const testData = {
    formateur_id: '00000000-0000-0000-0000-000000000000', // ID bidon pour test
    jour: 'Lundi',
    creneau: 'matin',
    statut: 'disponible',
    lieu_id: null,
    valide: false
}

const { error: insertError } = await supabaseAnon
    .from('planning_type_formateurs')
    .insert(testData)

console.log(`   INSERT: ${insertError ? '❌ Bloqué - ' + insertError.message : '✅ Autorisé'}`)

// 3. Test UPDATE
console.log('\n3. TEST UPDATE (modification):')
const { error: updateError } = await supabaseAnon
    .from('planning_type_formateurs')
    .update({ statut: 'disponible' })
    .eq('formateur_id', '00000000-0000-0000-0000-000000000000')

console.log(`   UPDATE: ${updateError ? '❌ Bloqué - ' + updateError.message : '✅ Autorisé'}`)

// 4. Test DELETE
console.log('\n4. TEST DELETE (suppression):')
const { error: deleteError } = await supabaseAnon
    .from('planning_type_formateurs')
    .delete()
    .eq('formateur_id', '00000000-0000-0000-0000-000000000000')

console.log(`   DELETE: ${deleteError ? '❌ Bloqué - ' + deleteError.message : '✅ Autorisé'}`)

console.log('\n' + '=' .repeat(60))
console.log('🔧 SOLUTION PROPOSÉE:\n')

console.log(`-- SQL À EXÉCUTER DANS SUPABASE POUR CORRIGER LE PROBLÈME:

-- 1. D'abord, voir les policies existantes
SELECT * FROM pg_policies WHERE tablename = 'planning_type_formateurs';

-- 2. Supprimer les policies restrictives existantes (si nécessaire)
DROP POLICY IF EXISTS "planning_type_formateurs_insert_policy" ON planning_type_formateurs;
DROP POLICY IF EXISTS "planning_type_formateurs_select_policy" ON planning_type_formateurs;
DROP POLICY IF EXISTS "planning_type_formateurs_update_policy" ON planning_type_formateurs;
DROP POLICY IF EXISTS "planning_type_formateurs_delete_policy" ON planning_type_formateurs;

-- 3. Créer des policies qui fonctionnent
-- Permettre à tous de lire (nécessaire pour l'app)
CREATE POLICY "Enable read for all users" 
ON planning_type_formateurs FOR SELECT 
USING (true);

-- Permettre aux formateurs d'insérer LEURS PROPRES données
CREATE POLICY "Enable insert for formateurs" 
ON planning_type_formateurs FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL -- Utilisateur connecté
    -- Pas de restriction sur formateur_id car on utilise pas l'auth Supabase
);

-- Permettre aux formateurs de modifier LEURS données
CREATE POLICY "Enable update for formateurs" 
ON planning_type_formateurs FOR UPDATE 
USING (
    auth.uid() IS NOT NULL -- Utilisateur connecté
);

-- Permettre aux formateurs de supprimer LEURS données
CREATE POLICY "Enable delete for formateurs" 
ON planning_type_formateurs FOR DELETE 
USING (
    auth.uid() IS NOT NULL -- Utilisateur connecté
);

-- OU SOLUTION PLUS SIMPLE : Désactiver RLS temporairement
-- ALTER TABLE planning_type_formateurs DISABLE ROW LEVEL SECURITY;
`)

console.log('\n⚠️  IMPORTANT: Ces policies sont à adapter selon votre système d\'auth')
console.log('Si vous n\'utilisez pas l\'auth Supabase, il faudrait désactiver RLS')

process.exit(0)