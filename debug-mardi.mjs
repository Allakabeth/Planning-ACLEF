console.log('=== DEBUG COMPARAISON LUNDI vs MARDI ===');
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Récupérer les données de cette semaine
const now = new Date();
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay() + 1);

const weekDates = [];
for (let i = 0; i < 5; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    weekDates.push(`${year}-${month}-${day}`);
}

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

// Récupérer toutes les données
const { data } = await supabase
    .from('planning_hebdomadaire')
    .select('*')
    .in('date', weekDates)
    .order('created_at', { ascending: false });

// Récupérer les lieux pour avoir les lieu_id
const { data: lieux } = await supabase
    .from('lieux')
    .select('id, nom')
    .eq('archive', false);

console.log('Lieux disponibles:', lieux?.map(l => ({ id: l.id, nom: l.nom })));

// Analyser spécifiquement Lundi et Mardi
['Lundi', 'Mardi'].forEach((jour, jourIndex) => {
    console.log(`\n=== ANALYSE ${jour.toUpperCase()} ===`);
    const dataJour = data?.filter(d => d.jour === jour) || [];
    
    console.log(`Date: ${weekDates[jourIndex]}`);
    console.log(`Nombre d'entrées: ${dataJour.length}`);
    
    // Simuler la logique d'exclusion pour ce jour
    dataJour.forEach((item, itemIndex) => {
        console.log(`\nEntrée ${itemIndex + 1}:`);
        console.log(`  - lieu_index: ${item.lieu_index}`);
        console.log(`  - lieu_id: ${item.lieu_id}`);
        console.log(`  - creneau: ${item.creneau}`);
        console.log(`  - formateurs: ${JSON.stringify(item.formateurs_ids)}`);
        
        const lieuInfo = lieux?.find(l => l.id === item.lieu_id);
        console.log(`  - lieu_nom: ${lieuInfo?.nom || 'Non trouvé'}`);
        
        // Simuler la logique bugguée
        const lieuActuelIndex = lieux?.findIndex(lieu => lieu.id === item.lieu_id) ?? -1;
        const cellLieuIndex = item.lieu_index || 0;
        
        console.log(`  - lieuActuelIndex (index dans tableau lieux): ${lieuActuelIndex}`);
        console.log(`  - cellLieuIndex (lieu_index BDD): ${cellLieuIndex}`);
        console.log(`  - Comparaison bugguée: ${cellLieuIndex} !== ${lieuActuelIndex} = ${cellLieuIndex !== lieuActuelIndex}`);
        
        if (cellLieuIndex !== lieuActuelIndex) {
            console.log(`  ❌ EXCLUSION BUGGUÉE: Le formateur serait exclu à tort!`);
        } else {
            console.log(`  ✅ OK: Pas d'exclusion erronée`);
        }
    });
    
    // Analyser les conflits potentiels
    console.log(`\n--- ANALYSE DES CONFLITS POTENTIELS ---`);
    const creneauxOccupes = new Map();
    
    dataJour.forEach(item => {
        const key = `${item.creneau}`;
        if (!creneauxOccupes.has(key)) {
            creneauxOccupes.set(key, []);
        }
        creneauxOccupes.get(key).push({
            lieu_index: item.lieu_index,
            lieu_id: item.lieu_id,
            formateurs: item.formateurs_ids
        });
    });
    
    creneauxOccupes.forEach((items, creneau) => {
        console.log(`\nCréneau ${creneau}:`);
        items.forEach((item, i) => {
            console.log(`  Lieu ${i + 1}: lieu_index=${item.lieu_index}, lieu_id=${item.lieu_id}, formateurs=${item.formateurs?.length || 0}`);
        });
        
        if (items.length > 1) {
            console.log(`  ⚠️ Multiples lieux sur même créneau - logique d'exclusion va s'activer!`);
        } else {
            console.log(`  ✅ Un seul lieu - pas de conflit d'exclusion`);
        }
    });
});

process.exit(0);