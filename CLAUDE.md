# PROJET ACLEF PLANNING V8

## CONTEXTE CRITIQUE



Application de gestion de planning pour organisme de formation.
IMPORTANTE : Cette app FONCTIONNE. Ne pas tout refaire.



## RÈGLES ABSOLUES



**1. \*\*JAMAIS modifier le code existant sans permission explicite\*\***

**2. \*\*TOUJOURS demander avant de refactorer\*\***

**3. \*\*NE JAMAIS coder en dur des données\*\***

**4. \*\*NE JAMAIS ajouter de fallbacks cachés\*\***

**5. \*\*Si tu ne comprends pas, DEMANDE. Ne devine pas.\*\***

**6. \*\*Ne Commit jamais sans mon autorisation\*\***

**7. \*\*Toujours lire GUIDE-MCP-SUPABASE.md avant de travailler sur la bdd\*\***

**8. \*\* Toujours aller voir dans le fichier .mcp.json si je parle de serveur MCP\*\***



TECHNOLOGIES UTILISÉES

Framework principal :

* Next.js 15.4.6 (avec support Turbopack pour le dev)
* React 19.1.0 (dernière version)
* React DOM 19.1.0

Backend \& Base de données :

* Supabase (@supabase/supabase-js ^2.54.0) - BaaS PostgreSQL + Auth

Authentification \& Sécurité :

* bcryptjs ^3.0.2 - Hashage des mots de passe
* jsonwebtoken ^9.0.2 - Gestion des tokens JWT pour l'auth formateurs

Styling :

* CSS Modules (Home.module.css)
* CSS Global (globals.css)

Configuration :

* ES Modules (fichiers .mjs)
* React Strict Mode activé

Environnement de développement :

* Turbopack - Bundler nouvelle génération de Next.js
* Next.js Linting intégré

## STRUCTURE DU PROJET

projet-aclef-planning-v8/
│
├── 📁 pages/                          # Pages Next.js (routage automatique)
│   ├── index.js                       # Dashboard principal admin
│   ├── login.js                       # Login admin
│   ├── planning-coordo.js             # Gestion planning coordination
│   ├── gestion-apprenants.js          # Gestion apprenants
│   ├── gestion-formateurs.js          # Gestion formateurs
│   ├── gestion-lieux.js               # Gestion lieux
│   ├── gestion-absences-formateur.js  # Gestion absences formateurs
│   ├── absence-apprenant.js           # Gestion absences apprenants
│   ├── valider-changements.js         # Validation modifications
│   │
│   ├── 📁 formateur/                  # Pages espace formateur
│   │   ├── index.js                   # Dashboard formateur
│   │   ├── login.js                   # Login formateur
│   │   ├── profil.js                  # Profil formateur
│   │   ├── change-password.js         # Changement mot de passe
│   │   ├── mon-planning-type.js       # Planning type personnel
│   │   ├── mon-planning-hebdo.js      # Planning hebdomadaire
│   │   ├── ma-presence.js             # Saisie présences
│   │   ├── absence.js                 # Déclaration absences
│   │   └── ma-messagerie.js           # Messagerie
│   │
│   ├── 📁 api/                        # Routes API Next.js
│   │   ├── admin-auth.js              # Auth admin
│   │   ├── auto-cleanup.js            # Nettoyage automatique
│   │   │
│   │   ├── 📁 auth/formateur/         # Auth formateurs (JWT)
│   │   │   ├── login.js               # Login JWT
│   │   │   ├── logout.js              # Logout
│   │   │   ├── refresh.js             # Refresh token
│   │   │   ├── verify.js              # Vérification token
│   │   │   └── change-password.js     # Changement mot de passe
│   │   │
│   │   ├── 📁 admin/                  # Endpoints admin
│   │   │   ├── presences-formateurs.js
│   │   │   ├── absences-apprenants.js
│   │   │   └── reset-formateur-password.js
│   │   │
│   │   └── 📁 formateur/              # Endpoints formateur
│   │       ├── presences.js
│   │       └── update-password.js
│   │
│   └── \_app.js                        # App wrapper Next.js
│
├── 📁 components/                     # Composants React
│   ├── MenuApprenants.js              # Menu sélection apprenants
│   ├── MessagerieDashboard.js         # Interface messagerie
│   ├── MessagerieSafeWrapper.js       # Wrapper sécurisé messagerie
│   ├── withAuthAdmin.js               # HOC auth admin
│   ├── withAuthFormateur.js           # HOC auth formateur
│   │
│   └── 📁 assistance/                 # Composants d'aide
│       ├── Absence.jsx
│       ├── MonPlanningHebdo.jsx
│       ├── MonPlanningType.jsx
│       └── PlanningFormateurType.jsx
│
├── 📁 lib/                            # Librairies et utilitaires
│   ├── supabaseClient.js              # Client Supabase standard
│   ├── supabaseAdmin.js               # Client Supabase admin (service role)
│   ├── AuthContext.js                 # Contexte auth admin
│   ├── jwt.js                         # Gestion JWT
│   ├── auditLogger.js                 # Logger d'audit
│   └── absenceApprenantUtils.js       # Utils absences
│
├── 📁 contexts/                       # Contextes React
│   └── FormateurAuthContext.js        # Contexte auth formateur JWT
│
├── 📁 styles/                         # Styles CSS
│   ├── globals.css                    # Styles globaux
│   └── Home.module.css                # Module CSS
│
├── 📁 public/                         # Assets statiques
│   ├── favicon.ico
│   └── *.svg                          # Icônes SVG
│
├── 📁 Scripts utilitaires (racine)/   # Scripts .mjs de maintenance
│   ├── check-*.mjs                    # Scripts de vérification
│   ├── debug-*.mjs                    # Scripts de debugging
│   ├── clean-*.mjs                    # Scripts de nettoyage
│   ├── test-*.mjs                     # Scripts de test
│   ├── verify-*.mjs                   # Scripts de vérification
│   ├── audit-\*.js                     # Scripts d'audit
│   └── \*.sql                          # Scripts SQL (RLS, tables)
│
├── middleware.js                      # Middleware Next.js
├── package.json                       # Dépendances npm
├── next.config.mjs                    # Config Next.js
├── .env.local                         # Variables d'environnement (non versionné)
└── .gitignore

Architecture :

* Authentification double : Admin (hardcodé) + Formateur (JWT)
* API Routes : Next.js API routes pour backend
* Base de données : Supabase PostgreSQL
* Sécurité : RLS, bcrypt, JWT
* Scripts : +30 scripts utilitaires pour maintenance BDD

## ERREURS À NE PLUS JAMAIS RÉPÉTER

* Casser la base de données
* Refaire le design sans sauvegarder
* Ajouter des fonctionnalités non demandées
* Modifier plusieurs fichiers à la fois

## MA MÉTHODE DE TRAVAIL

1. Je décris CE QUE je veux (pas comment)
2. Tu me proposes UN SEUL fichier à modifier
3. Tu me montres EXACTEMENT ce que tu vas changer
4. J'approuve ou je refuse
5. Tu modifies UN SEUL fichier
6. On teste
7. On passe au suivant



## REGLES À SUIVRE

1. Réfléchis d'abord au problème, lis le code source pour trouver les fichiers pertinents et rédige un plan dans tasks/todo.md.
2. Ce plan doit contenir une liste de tâches à effectuer que tu peux cocher au fur et à mesure de leur exécution.
3. Avant de commencer, demande-moi pour que je vérifie le plan.
4. Commence ensuite à travailler sur les tâches à effectuer, en les marquant comme terminées au fur et à mesure.
5. À chaque étape veille à me fournir une explication détaillée des modifications que tu as apportées.
6. Simplifie au maximum chaque tâche et modification de code. Nous souhaitons éviter les modifications massives ou complexes. Chaque modification doit avoir un impact minimal sur le code. Tout est une question de simplicité.
7. Enfin, ajoute une section de révision au fichier todo.md avec un résumé des modifications apportées et toute autre information pertinente.
8. NE SOIS PAS PARESSEUX. NE SOIS JAMAIS PARESSEUX. EN CAS DE BUG, ​​TROUVE-EN LA CAUSE ET CORRIGE-LA. Pas de correctifs temporaires. Tu es un développeur senior. Ne sois jamais paresseux.
9. Simplifie au maximum les correctifs et les modifications de code. Ils ne doivent affecter que le code nécessaire à la tâche et rien d'autre. Ils doivent avoir le moins d'impact possible sur le code. Ton objectif est de ne pas introduire de bugs. La simplicité est primordiale.



## QUAND JE DIS "STOP"

Tu arrêtes immédiatement. Tu ne finis pas ta phrase.
Tu ne "corriges" pas une dernière chose.
ESSENTIEL : Lors du débogage, il est impératif de suivre l'intégralité du flux de code, étape par étape. Sans hypothèses ni raccourcis.

