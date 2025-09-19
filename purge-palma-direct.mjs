import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== PURGE DIRECTE PALMA LOMBARDI ===\n');

const palmaId = '55c6a2ab-a7a6-4259-932b-ca6ce6d44193';

// 1. Vérifier avant suppression
const { data: before, count: countBefore } = await supabase
    .from('planning_type_formateurs')
    .select('*', { count: 'exact' })
    .eq('formateur_id', palmaId);

console.log(`📊 AVANT: ${countBefore || 0} entrées trouvées pour Palma`);

if (countBefore > 0) {
    // 2. Supprimer TOUTES les entrées de Palma
    console.log('\n🗑️ Suppression en cours...');
    
    const { error, count: deletedCount } = await supabase
        .from('planning_type_formateurs')
        .delete({ count: 'exact' })
        .eq('formateur_id', palmaId);
    
    if (error) {
        console.error('❌ ERREUR:', error.message);
        console.error('Détails:', error);
    } else {
        console.log(`✅ ${deletedCount || 'Nombre inconnu d'} entrées supprimées`);
    }
    
    // 3. Vérifier après suppression
    const { data: after, count: countAfter } = await supabase
        .from('planning_type_formateurs')
        .select('*', { count: 'exact' })
        .eq('formateur_id', palmaId);
    
    console.log(`\n📊 APRÈS: ${countAfter || 0} entrées restantes`);
    
    if (countAfter === 0) {
        console.log('✅ PURGE RÉUSSIE - Planning de Palma complètement vide');
    } else {
        console.log('⚠️ ATTENTION: Il reste encore des entrées !');
    }
} else {
    console.log('✅ Déjà vide - rien à purger');
}

process.exit(0);