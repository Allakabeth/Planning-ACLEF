import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== TEST FLUX PLANNING TYPE APRÈS PURGE ===\n');

// ID de Palma Lombardi
const palmaId = '55c6a2ab-a7a6-4259-932b-ca6ce6d44193';

// Vérifier l'état actuel
console.log('1. VÉRIFICATION ÉTAT ACTUEL PALMA');
const { data: currentData } = await supabase
    .from('planning_type_formateurs')
    .select('*')
    .eq('formateur_id', palmaId)
    .order('jour');

console.log(`   Nombre d'entrées actuelles: ${currentData?.length || 0}`);

if (currentData && currentData.length > 0) {
    // Grouper par jour-créneau pour voir les doublons
    const grouped = {};
    currentData.forEach(row => {
        const key = `${row.jour} ${row.creneau}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
            statut: row.statut,
            valide: row.valide,
            lieu_id: row.lieu_id
        });
    });
    
    console.log('\n   Détail par créneau:');
    Object.keys(grouped).sort().forEach(key => {
        const entries = grouped[key];
        if (entries.length > 1) {
            console.log(`   ⚠️ ${key}: ${entries.length} DOUBLONS`);
        } else {
            const e = entries[0];
            console.log(`   ✅ ${key}: ${e.statut} (valide=${e.valide})`);
        }
    });
} else {
    console.log('   ✅ Planning vide - prêt pour nouveau test');
}

console.log('\n2. MONITORING PROCHAINES ACTIONS');
console.log('   Après purge, testez le flux complet :');
console.log('   a) Formateur déclare dans /formateur/planning-formateur-type');
console.log('   b) Admin valide dans /planning-type-formateurs');
console.log('   c) Relancer ce script pour vérifier absence de doublons');

process.exit(0);