# GUIDE : Utilisation du MCP Supabase

## ❌ CE QU'IL NE FAUT **JAMAIS** FAIRE

1. **NE JAMAIS** demander à l'utilisateur d'aller sur le dashboard Supabase
2. **NE JAMAIS** essayer d'utiliser `supabase.rpc('exec_sql')` - cette fonction n'existe pas
3. **NE JAMAIS** essayer d'installer des packages (pg, dotenv, etc.) pour exécuter du SQL
4. **NE JAMAIS** dire "je ne peux pas" - SI ON PEUT, VIA LE MCP

## ✅ LA BONNE MÉTHODE : Management API

### Configuration MCP (déjà configuré dans .mcp.json)
```json
{
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=mkbchdhbgdynxwfhpxbw"],
    "env": {
      "SUPABASE_ACCESS_TOKEN": "sbp_0a6db35105a956290b3f3d2aca90c644b4f2c9e6"
    }
  }
}
```

### Comment exécuter du SQL

**TOUJOURS** utiliser ce pattern :

```javascript
#!/usr/bin/env node

const SUPABASE_ACCESS_TOKEN = 'sbp_0a6db35105a956290b3f3d2aca90c644b4f2c9e6'
const PROJECT_REF = 'mkbchdhbgdynxwfhpxbw'

const SQL = `
  -- Votre SQL ici
  ALTER TABLE ma_table ADD COLUMN nouvelle_colonne TEXT;
`

async function executerSQL() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: SQL })
    }
  )

  const result = await response.json()

  if (!response.ok) {
    console.log('❌ Erreur:', result)
    throw new Error(JSON.stringify(result))
  }

  console.log('✅ SQL exécuté avec succès!')
  return result
}

executerSQL()
```

### Exemples de scripts qui FONCTIONNENT

1. **create-table-direct.mjs** - Création de table
2. **execute-sql-via-mcp.mjs** - Exécution SQL via MCP
3. **add-columns-via-mcp.mjs** - Ajout de colonnes (vient de fonctionner!)

### Vérification après exécution

Pour vérifier que le SQL a fonctionné, utiliser le client Supabase normal :

```javascript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase.from('ma_table').select('*').limit(1)
```

## 🎯 RÉSUMÉ EN 3 POINTS

1. **Pour exécuter du SQL** → Utiliser Management API (`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`)
2. **Token requis** → `sbp_0a6db35105a956290b3f3d2aca90c644b4f2c9e6`
3. **Pour vérifier** → Utiliser le client Supabase normal avec `.from('table').select()`

## 📋 CHECKLIST AVANT D'EXÉCUTER

- [ ] J'ai créé un fichier `.mjs` avec le pattern ci-dessus
- [ ] J'ai utilisé le SUPABASE_ACCESS_TOKEN correct
- [ ] J'ai utilisé le PROJECT_REF correct
- [ ] Mon SQL est dans la variable `SQL`
- [ ] J'exécute avec `node mon-fichier.mjs`
- [ ] Je vérifie le résultat après avec un script de vérification

## ⚠️ RAPPEL IMPORTANT

**TOUJOURS** utiliser cette méthode. **JAMAIS** demander à l'utilisateur d'aller sur le dashboard.
Le MCP Supabase est configuré et fonctionne. Il suffit de l'utiliser correctement.
