import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables Supabase manquantes')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addIdentifiantField() {
    try {
        console.log('🔧 Ajout du champ identifiant à la table users...')
        
        // Vérifier si le champ existe déjà
        const { data: columns, error: columnsError } = await supabase
            .rpc('get_table_columns', { table_name: 'users' })
            .single()
        
        if (!columnsError && columns && columns.includes('identifiant')) {
            console.log('✅ Le champ identifiant existe déjà')
            return
        }
        
        // Si le champ n'existe pas, on informe l'utilisateur
        console.log(`
⚠️  Le champ 'identifiant' n'existe pas dans la table users.

Pour l'ajouter, exécutez cette commande SQL dans Supabase :

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS identifiant VARCHAR(100) UNIQUE;

-- Initialiser les identifiants existants avec le prénom
UPDATE users 
SET identifiant = prenom 
WHERE identifiant IS NULL;

-- Pour gérer les doublons existants, ajouter un suffixe
WITH duplicates AS (
    SELECT id, prenom,
           ROW_NUMBER() OVER (PARTITION BY prenom ORDER BY id) as rn
    FROM users
    WHERE role IN ('apprenant', 'formateur')
)
UPDATE users 
SET identifiant = CASE 
    WHEN d.rn = 1 THEN users.prenom
    ELSE users.prenom || LPAD(d.rn::text, 2, '0')
END
FROM duplicates d
WHERE users.id = d.id AND d.rn > 1;
        `)
        
    } catch (error) {
        console.error('❌ Erreur:', error.message)
    }
}

addIdentifiantField()