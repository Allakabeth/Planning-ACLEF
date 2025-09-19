console.log('=== TEST BDD ==='); 
import { supabase } from './lib/supabaseClient.js';
const { data } = await supabase.from('planning_hebdomadaire').select('*').limit(10);
console.log('Données BDD:', data?.map(d => ({jour: d.jour, lieu_index: d.lieu_index})));
