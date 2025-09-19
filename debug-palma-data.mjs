import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== ANALYSE DÉTAILLÉE DONNÉES PALMA ===\n');

const palmaId = '55c6a2ab-a7a6-4259-932b-ca6ce6d44193';

// 1. Toutes les données de Palma triées par date de création
const { data: allData } = await supabase
    .from('planning_type_formateurs')
    .select('*')
    .eq('formateur_id', palmaId)
    .order('created_at', { ascending: false });  // Plus récent en premier

console.log(`📊 Total entrées: ${allData?.length || 0}`);

if (allData && allData.length > 0) {
    // Grouper par créneau et analyser
    const bySlot = {};
    
    allData.forEach(row => {
        const key = `${row.jour} ${row.creneau}`;
        if (!bySlot[key]) bySlot[key] = [];
        bySlot[key].push({
            id: row.id,
            statut: row.statut,
            valide: row.valide,
            lieu_id: row.lieu_id,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    });
    
    console.log('\n🔍 ANALYSE PAR CRÉNEAU (du plus récent au plus ancien) :\n');
    
    Object.keys(bySlot).sort().forEach(slot => {
        const entries = bySlot[slot];
        console.log(`📅 ${slot} :`);
        console.log(`   💾 ${entries.length} entrée(s) en BDD`);
        
        // Montrer les 3 plus récentes
        entries.slice(0, 3).forEach((entry, i) => {
            const badge = i === 0 ? '🏆 PLUS RÉCENT' : `   ${i + 1}.`;
            console.log(`   ${badge} statut=${entry.statut}, valide=${entry.valide}`);
            console.log(`      📅 updated: ${entry.updated_at}`);
        });
        
        if (entries.length > 3) {
            console.log(`   ... et ${entries.length - 3} autre(s)`);
        }
        console.log('');
    });
    
    // 2. Simuler ce que voit l'interface FORMATEUR (plus récent par créneau)
    console.log('\n👤 CE QUE VOIT PALMA (interface formateur - plus récent) :');
    Object.keys(bySlot).sort().forEach(slot => {
        const mostRecent = bySlot[slot][0];  // Le plus récent
        if (mostRecent.statut !== 'indisponible') {
            console.log(`   ✅ ${slot}: ${mostRecent.statut}`);
        }
    });
    
    // 3. Simuler ce que voit l'interface ADMIN (filtre valide=true ET statut=disponible)
    console.log('\n👨‍💼 CE QUE VOIT ADMIN (interface admin - filtre: valide=true + disponible) :');
    const adminVisible = allData.filter(row => 
        row.valide === true && row.statut === 'disponible'
    );
    
    console.log(`   📊 ${adminVisible.length} entrées matchent le filtre admin`);
    
    if (adminVisible.length > 0) {
        // Grouper pour éviter doublons dans l'affichage
        const adminBySlot = {};
        adminVisible.forEach(row => {
            const key = `${row.jour} ${row.creneau}`;
            if (!adminBySlot[key] || row.updated_at > adminBySlot[key].updated_at) {
                adminBySlot[key] = row;
            }
        });
        
        Object.keys(adminBySlot).sort().forEach(slot => {
            console.log(`   ✅ ${slot}: disponible (validé)`);
        });
    } else {
        console.log('   ⚠️ Aucune entrée visible pour admin !');
    }
}

process.exit(0);