# Suivi Post-Formation (SPF) - Documentation complete

## Vue d'ensemble

Systeme de suivi des apprenants apres leur sortie de formation. Permet d'envoyer des questionnaires de satisfaction et de suivi a 3 et 6 mois, par SMS ou par telephone, et d'analyser les resultats.

---

## Fonctionnalites

### 1. Questionnaire mobile
- Page web accessible par lien (sans compte ni mot de passe)
- Adapte aux personnes en situation d'illettrisme : emojis, gros boutons, 1 question par ecran
- Lecture audio automatique des questions (synthese vocale)
- Illustration differente par question
- Enregistrement vocal pour les questions ouvertes
- 3 types : satisfaction (10 questions), suivi 3 mois (6 questions), suivi 6 mois (6 questions)

### 2. Dashboard secretaire
- Page admin `/suivi-post-formation` avec 2 onglets :
  - **Suivi des apprenants** : tableau avec statuts, boutons d'action, telephone HS
  - **Resultats & Analyse** : filtre dates, taux de reponse, barres colorees par question, export PDF
- Saisie d'appel telephonique avec le questionnaire integre (memes questions que le SMS)
- Menu deroulant pour "Appele par" (4 salaries : Albena, Fanny, Mathieu, Sarah)
- Infobulles avec noms des apprenants sur les cartes statistiques
- Bouton "Telephone HS" pour marquer un telephone hors service

### 3. Envoi SMS automatique (desactive pour le moment)
- Script local `C:\ACLEF\suivi-post-formation.mjs`
- Utilise httpSMS (app Android sur telephone ACLEF) comme passerelle SMS
- Numeros stockes en local sur `Z:\Espace salaries\Mathieu\contacts-suivi.json` (RGPD)
- Workflow : envoi → relance a 7 jours → escalade "appeler" a 14 jours

### 4. Integration avec gestion-apprenants
- Quand un apprenant passe en statut "termine" ou "abandonne" :
  - Creation automatique du suivi post-formation (questionnaires + rappels 3/6 mois)
  - Popup : "Le questionnaire de satisfaction a-t-il ete rempli ?"
  - OUI → redirige vers SPF pour saisir les reponses
  - NON → ajoute a la liste pour envoi SMS

### 5. Cron Vercel (quotidien a 7h00)
- Avance les statuts automatiquement (a_venir → a_envoyer quand la date arrive)
- Detecte les questionnaires remplis en ligne et met a jour les statuts
- Envoie un email recap a la secretaire quand il y a des actions a faire

### 6. Export PDF
- Genere un PDF avec pdfkit (cote serveur)
- Contient : titre, periode, taux de reponse, barres colorees par question
- API : `/api/suivi/export-pdf?type=satisfaction&dateDebut=2025-01-01&dateFin=2026-12-31`

---

## Architecture technique

### Tables Supabase

**questionnaires**
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Cle primaire |
| type | TEXT | satisfaction, suivi_3mois, suivi_6mois |
| apprenant_id | UUID | FK vers users |
| parcours_id | UUID | FK vers parcours_apprenants (nullable) |
| token | TEXT | Token long UUID pour acces public |
| short_code | TEXT | Code court 6 chars pour liens SMS |
| statut | TEXT | en_attente, complete, expire |
| reponses | JSONB | {1: "oui", 2: "un_peu", ...} |
| date_reponse | TIMESTAMPTZ | Date de reponse |
| created_at | TIMESTAMPTZ | Date de creation |

**suivi_post_formation**
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Cle primaire |
| apprenant_id | UUID | FK vers users |
| parcours_id | UUID | FK vers parcours_apprenants |
| date_sortie | DATE | Date de sortie de formation |
| satisfaction_statut | TEXT | Statut du workflow satisfaction |
| satisfaction_date_envoi | TIMESTAMPTZ | Date envoi SMS satisfaction |
| satisfaction_questionnaire_id | UUID | FK vers questionnaires |
| satisfaction_notes | TEXT | Notes d'appel |
| satisfaction_appele_par | TEXT | Nom de la personne qui a appele |
| satisfaction_date_appel | DATE | Date de l'appel |
| suivi_3mois_date | DATE | Date prevue suivi 3 mois |
| suivi_3mois_statut | TEXT | Statut workflow 3 mois |
| suivi_3mois_questionnaire_id | UUID | FK vers questionnaires |
| suivi_3mois_notes | TEXT | Notes |
| suivi_3mois_appele_par | TEXT | Appelant |
| suivi_3mois_date_appel | DATE | Date appel |
| suivi_6mois_* | ... | Memes colonnes pour 6 mois |
| telephone_hs | BOOLEAN | True si telephone hors service |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Colonne ajoutee a users :**
- `telephone` TEXT (non utilisee - RGPD, numeros stockes en local)

### Statuts du workflow
```
a_venir → a_envoyer → envoye → relance/relance_1 → appeler → appel_effectue
                                                             → repondu (si reponse SMS)
                                                             → injoignable
```

### Fichiers de l'application

**Pages :**
| Fichier | Role |
|---------|------|
| pages/questionnaire/[token].js | Page questionnaire publique mobile-first |
| pages/q/[token].js | Redirect court /q/CODE → /questionnaire/CODE |
| pages/suivi-post-formation.js | Dashboard + Resultats (2 onglets) |

**API :**
| Fichier | Role |
|---------|------|
| pages/api/questionnaire/[token].js | GET charger / POST soumettre questionnaire |
| pages/api/suivi/creer-suivi.js | Creation suivi standalone |
| pages/api/suivi/export-pdf.js | Export PDF des resultats |
| pages/api/cron/suivi-post-formation.js | Cron quotidien (statuts + email) |
| pages/api/admin/terminer-parcours.js | Termine parcours + cree suivi auto |

**Lib :**
| Fichier | Role |
|---------|------|
| lib/smsService.js | Envoi SMS via httpSMS API |

**Fichiers modifies :**
| Fichier | Modification |
|---------|-------------|
| pages/gestion-apprenants.js | Popup satisfaction a la sortie |
| pages/index.js | Lien menu "Suivi Post-Formation" |
| vercel.json | Cron quotidien a 7h00 |

### Fichiers locaux (PAS dans git, sur le PC/reseau ACLEF)

| Fichier | Role |
|---------|------|
| C:\ACLEF\suivi-post-formation.mjs | Script envoi SMS automatique |
| C:\ACLEF\lancer-suivi.bat | Lanceur Windows (dossier Demarrage) |
| Z:\Espace salaries\Mathieu\contacts-suivi.json | Numeros de telephone |
| Z:\Espace salaries\Mathieu\suivi-post-formation.mjs | Copie du script sur reseau |

---

## Configuration SMS (httpSMS)

### Telephone ACLEF
- App **httpSMS** installee sur telephone Android
- Numero SIM : 06 12 72 97 02
- Batterie : optimisation desactivee, activite arriere-plan autorisee
- Doit rester branche et allume en permanence

### httpSMS
- Site : httpsms.com
- API Key : uk_ZnDnPfhupJOfT-rZ2UOgR9oXJ8L8VNVFMg_u4gtTowmj8g6IHO9rwrgGB0IUQg0m

### Variables d'environnement Vercel
- HTTPSMS_API_KEY (configuree)
- HTTPSMS_FROM = +33612729702 (configuree)

### Format du fichier contacts-suivi.json
```json
{
  "Prenom Nom": "06XXXXXXXX",
  "Fanny Apprenante": "0664828457"
}
```
Le nom doit correspondre exactement au prenom + nom dans la base.

---

## Activer l'envoi SMS automatique

Pour activer (desactive actuellement a la demande de la collegue) :

1. S'assurer que le telephone ACLEF est allume avec httpSMS
2. Remplir les numeros dans `Z:\Espace salaries\Mathieu\contacts-suivi.json`
3. Lancer : `node C:\ACLEF\suivi-post-formation.mjs`
4. Ou double-cliquer sur `C:\ACLEF\lancer-suivi.bat`
5. Pour automatiser au demarrage : le fichier est deja dans le dossier Demarrage Windows
   (`C:\Users\ACLEF25\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\lancer-suivi.bat`)

Pour desactiver : supprimer `lancer-suivi.bat` du dossier Demarrage.

---

## Questionnaires - Contenu

### Satisfaction (10 questions)
1. La formation vous a plu ? (OUI / UN PEU / NON)
2. La formation etait comme vous voulez ? (OUI / UN PEU / NON)
3. Vous avez appris de nouvelles choses ? (OUI / UN PEU / NON)
4. Content de la duree de la formation ? (OUI / UN PEU / NON)
5. Les formateurs se sont adaptes a vos besoins ? (OUI / UN PEU / NON)
6. Les formateurs ont bien explique ? (OUI / UN PEU / NON)
7. Les salles et le materiel etaient bien ? (OUI / UN PEU / NON)
8. La formation vous aide pour vos projets ? (OUI / UN PEU / NON)
9. Aujourd'hui, vous etes : (Formation / Emploi / Recherche / Autre)
10. Quelque chose a nous dire ? (Message vocal)

### Suivi 3 mois / 6 mois (6 questions SMS, 5 questions appel)
1. Aujourd'hui, vous etes : (Formation / Emploi / Recherche / Autre)
2. Quelle formation ? (vocal, si reponse 1 = formation)
3. Vous faites quoi ? (vocal, si reponse 1 = emploi)
4. La formation ACLEF vous a aide ? (OUI / UN PEU / NON)
5. Vous avez un projet ? (OUI / UN PEU / NON)
6. Quelque chose a nous dire ? (vocal)

---

## Donnees de test

### Apprenants test
- **Test SMS-ACLEF** (id: 2e56eecc) - apprenant fictif pour tests SMS
- **Fanny Apprenante** (id: a451fc6d) - apprenante fictive pour tests

### 9 vrais apprenants sortis (sans numeros de telephone)
Diankemba Diaby, Joseph Dissemberg, Vincent Garnier, Jean-Michel Leborgne,
Isabelle Neto, Madjid Charif, Lydie Reinhard, Kim Mayer, Keysi Novas

---

## RGPD

- Les numeros de telephone ne sont JAMAIS stockes dans Supabase (cloud)
- Ils restent sur le lecteur reseau local Z:\Espace salaries\Mathieu\
- Le script local les lit au moment de l'envoi, ils ne transitent que vers httpSMS
- Base legale : obligation Qualiopi (satisfaction + suivi 3/6 mois)
- Les numeros peuvent etre supprimes a tout moment du fichier JSON
