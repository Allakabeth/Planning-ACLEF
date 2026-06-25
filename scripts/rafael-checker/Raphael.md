# Rafael Cap Métiers - Système de notification prescriptions

## Objectif
Vérifier automatiquement le site Rafael Cap Métiers (Région Nouvelle-Aquitaine) pour détecter les nouvelles prescriptions et notifier la coordination ACLEF dans la messagerie interne de l'app.

## Stack
- **Script** : Node.js (ES modules) avec `cheerio` pour parser HTML et `@supabase/supabase-js` pour insérer les messages
- **Cron** : GitHub Actions, lun-ven 8h-18h, toutes les heures
- **Stockage état** : pas de table dédiée, tracking via `[count:N]` dans le contenu des messages de type `prescription_rafael`

## Fichiers
- `scripts/rafael-checker/check-prescriptions.mjs` - Script principal
- `scripts/rafael-checker/package.json` - Dépendances
- `.github/workflows/check-rafael.yml` - Cron GitHub Actions
- `.gitignore` - Exception ajoutée : `!scripts/rafael-checker/*.mjs` (le repo ignore tous les `.mjs` par défaut)
- `components/MessagerieDashboard.js` (ligne ~1355) - Modifié pour rendre les URLs cliquables (target=_blank) dans le contenu des messages

## URLs Rafael
- **Login CAS** : `https://sso.cap-metiers.pro/v2/users/login?service=https://rafael.cap-metiers.pro/authentification/identifie_cas`
- **Dashboard** : `https://rafael.cap-metiers.pro/preinscription/accueil`

## Authentification CAS - étapes critiques
1. **GET** la page de login (n'envoie AUCUN cookie au GET initial - normal pour ce serveur)
2. Parser tous les champs `<input type="hidden">` du formulaire (`_method`, `service`)
3. **POST** vers la même URL avec : tous les hidden fields + `email` + `password` + `service`
4. Vérifier la redirection :
   - Si 302 vers `/v2/users/login` → login échoué (mauvais mdp)
   - Si 302 vers `rafael.cap-metiers.pro/.../jwt_token/...` → succès
5. Suivre la chaîne de redirections (jusqu'à 8) pour obtenir les cookies `CAKEPHP` et `PHPSESSID`

**Le champ s'appelle `email` mais peut contenir un identifiant non-email** - le label sur la page dit "Identifiant".

## Détection des prescriptions
La page accueil contient 5 tables, dont 4 remplies dynamiquement par DataTables AJAX (`Home/script.js`). Chaque table a un endpoint server-side qui renvoie du JSON DataTables 1.9 (`{ sEcho, iTotalRecords, aaData, ... }`).

**Endpoint utilisé** : `getUpcomingAndCurrentCandidaturesList` — liste TOUTES les candidatures en cours (135 chez l'ACLEF), une par ligne `aaData`, avec dans l'ordre des colonnes :

| index | contenu |
|---|---|
| 0 | Référence candidature (+ lien consulter) |
| 1 | Candidat (HTML : civilité, NOM, né(e), prénom) |
| 2 | Session (contient `Ref: <réf session>` → mappe le lieu) |
| 8 | **État** : `Retenue` / `Non retenue` / **`En attente`** |

On filtre les lignes dont la colonne 8 = **"En attente"**. Ça donne directement le **nom du candidat** et le **lieu** (via la Ref session → `SESSIONS_HSP`), sans devinette.

```javascript
const url = '/preinscription/getUpcomingAndCurrentCandidaturesList/?sEcho=1&iDisplayStart=0&iDisplayLength=500';
const data = JSON.parse(res.body);        // header X-Requested-With requis
const enAttente = data.aaData.filter(row =>
    /en\s+attente/i.test(strip(row[8]))   // strip = enlève le HTML
);
```

> **Ne PAS utiliser** la table résumé `#tableInfoPendingTreatments` : sa colonne "En attente" (index 1 des `<td>`) est correcte par rôle, mais le script sommait Responsable + Positionneur + **Formateur** alors que Positionneur et Formateur désignent le même organisme → **double comptage** (3 réelles affichées comme 6). L'ancien `detecterLieux()` (essais d'URL) est aussi supprimé : peu fiable (faux positifs).

## Sessions HSP (références fournies par l'utilisateur)
```javascript
const SESSIONS_HSP = [
    { lieu: 'CCP', ref: '00550837' },
    { lieu: 'MPT', ref: '00550835' },
    { lieu: 'Lencloitre', ref: '00550838' },
    { lieu: 'Pleumartin', ref: '00550836' }
];
```

Le lieu vient directement de la Ref session lue dans la colonne 2 de chaque candidature (`Ref: 00550837` → CCP, etc.) — fiable, plus aucune devinette d'URL.

## Logique de notification (suivi par références)
Le tracking utilise le **dernier message** de type `prescription_rafael` (visible OU caché) pour récupérer la liste des références déjà connues, stockée sous forme `[refs:a,b,c]` :

| Situation | Action |
|---|---|
| Une référence **nouvelle** apparaît (pas dans `[refs:...]`) | **Notification visible** (lu=false, archive=false) listant les nouveaux candidats |
| Le set de références **change sans nouveauté** (uniquement des suppressions) | **Message tracking caché** (lu=true, archive=true) — met `[refs:...]` à jour |
| Set identique | Rien |

Le suivi par **références** (et non par simple compteur) gère le cas où une prescription est traitée ET une autre arrive dans le même intervalle (count 2→2 mais une réf différente) : l'ancien système basé sur le nombre ne voyait rien, le nouveau détecte bien la nouvelle réf.

## Format du message visible
```
Objet: Nouvelle(s) prescription(s) HSP
Contenu:
Vous avez 2 nouvelles prescriptions en attente :

• M. DEMARCONNAY Jerome — CCP
• Mme REKIA Maellie-houria — Pleumartin

Voir sur Rafael : https://rafael.cap-metiers.pro/preinscription/accueil

[refs:2026828732,2026830823]
```

L'URL est rendue cliquable (nouvel onglet) grâce à la modif de `MessagerieDashboard.js`. Le marqueur `[refs:...]` est technique (suivi anti-spam) et peut être masqué à l'affichage si souhaité.

## GitHub Secrets requis
| Nom | Description |
|---|---|
| `RAFAEL_EMAIL` | Identifiant CAS (le champ s'appelle "email" mais c'est un identifiant) |
| `RAFAEL_PASSWORD` | Mot de passe CAS |
| `SUPABASE_URL` | Même que `NEXT_PUBLIC_SUPABASE_URL` du .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase (bypass RLS pour insérer dans `messages`) |

## Cron schedule
```yaml
schedule:
  - cron: '0 6-16 * * 1-5'  # Lun-ven, 8h-18h heure française (UTC+2)
```

## Champs table `messages` utilisés
```javascript
{
    expediteur_id: null,
    destinataire_id: null,
    expediteur: 'Rafael Cap Metiers',
    destinataire: 'Coordination ACLEF',
    objet: '...',
    contenu: '...[count:N]',
    type: 'prescription_rafael',
    lu: false,         // ou true pour tracking caché
    archive: false,    // ou true pour tracking caché
    date: 'YYYY-MM-DD',
    heure: 'HH:MM'
}
```

## Tests / déclenchement manuel
- GitHub : https://github.com/Allakabeth/Planning-ACLEF/actions → "Check Rafael Prescriptions" → "Run workflow"
- Le job s'appelle `check`

## Bugs résolus pendant le développement
1. **Hidden fields non envoyés** : le formulaire CAS a des champs `_method=POST` cachés qu'il faut parser et renvoyer
2. **Cookies non capturés au GET** : le GET initial ne set rien, c'est uniquement le POST qui envoie le cookie CAKEPHP. Suivre la redirection est nécessaire pour obtenir PHPSESSID
3. **Body vide sur `/preinscription/candidatures`** : URL inexistante ou redirige silencieusement
4. **`Invalid API key` (juin 2026)** : le secret GitHub `SUPABASE_SERVICE_ROLE_KEY` contenait l'ancienne clé (rotée après l'incident de sécurité de mars). Aucune notif n'avait jamais pu être insérée. → secret mis à jour avec la clé valide.
5. **`messages_type_check` violé (juin 2026)** : le type `prescription_rafael` n'était pas dans la contrainte CHECK de la table `messages` (`planning, messagerie, validation, fin_formation, anniversaire`). → type ajouté à la contrainte.
6. **Double comptage** : la table résumé sommait Positionneur + Formateur (même organisme) → 6 au lieu de 3. → remplacé par l'endpoint candidatures filtré sur l'état.
7. **Pas de nom ni lieu** : on n'avait qu'un compteur. → endpoint candidatures qui donne nom + session/lieu, suivi par références.

## À tester quand une vraie prescription arrivera
- [ ] La notification apparaît dans la messagerie
- [ ] Le lien Rafael est cliquable et ouvre dans un nouvel onglet
- [ ] La détection de lieu fonctionne (sinon retirer les patterns inutiles ou trouver le bon)
- [ ] Après traitement, le compteur revient à 0 et le tracking est mis à jour
- [ ] La prescription suivante déclenche bien une nouvelle notification

## Notes
- Les hooks PostToolUse du repo sont cassés (utilisent `[[ ]]` en `/bin/sh`) — ils affichent des erreurs mais n'empêchent pas les éditions de s'appliquer
- Repo GitHub : `Allakabeth/Planning-ACLEF`, branche `master`
