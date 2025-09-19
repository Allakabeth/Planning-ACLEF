import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== RECHERCHE PALMA LOMBARDI ===');

// Chercher Palma Lombardi
const { data: users } = await supabase
    .from('users')
    .select('id, prenom, nom')
    .eq('role', 'formateur')
    .or('nom.ilike.%lombardi%,prenom.ilike.%palma%');

console.log('\nFormateurs trouvés:');
users?.forEach(u => {
    console.log(`- ${u.prenom} ${u.nom}: ${u.id}`);
});

// Si on trouve Palma, vérifier ses données
if (users && users.length > 0) {
    const palma = users.find(u => u.prenom?.toLowerCase().includes('palma')) || users[0];
    
    console.log(`\n=== DONNÉES PLANNING TYPE POUR ${palma.prenom} ${palma.nom} ===`);
    
    const { data: planning } = await supabase
        .from('planning_type_formateurs')
        .select('*')
        .eq('formateur_id', palma.id)
        .order('jour', { ascending: true });
    
    console.log(`Total entrées: ${planning?.length || 0}`);
    
    if (planning && planning.length > 0) {
        console.log('\nDétail des créneaux:');
        planning.forEach(p => {
            console.log(`  ${p.jour} ${p.creneau}:`);
            console.log(`    - statut: ${p.statut}`);
            console.log(`    - lieu_id: ${p.lieu_id || 'null'}`);
            console.log(`    - valide: ${p.valide}`);
            console.log(`    - updated_at: ${p.updated_at}`);
        });
    } else {
        console.log('⚠️ Aucune donnée de planning type trouvée');
    }
}

process.exit(0);