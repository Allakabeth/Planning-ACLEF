# STATUS.md - �tat du projet ACLEF Planning

**Derni�re mise � jour :** 1er octobre 2025
**Version :** v8 (en production)
**Statut global :** =� Stable et op�rationnel

---

## =� Vue d'ensemble

### Application principale
- **Nom :** ACLEF Planning
- **Type :** Application web Next.js 15
- **�tat :** Production active
- **H�bergement :** Vercel
- **Base de donn�es :** Supabase (PostgreSQL)

### Metrics cl�s
- **Utilisateurs :** Formateurs + Personnel administratif
- **Fonctionnalit�s principales :**
  - Gestion planning de formation
  - Gestion absences (formateurs & apprenants)
  - Syst�me de pr�sences
  - Messagerie interne
  - Planning type hebdomadaire

---

## =� Derni�res �volutions

### Commits r�cents (Octobre 2025)
-  **fd1d03f** - Fix: R�duction drastique de la largeur colonne M/AM
-  **48bbb55** - Feature: Nouveau bouton "Valider Modifications" + optimisations UX
-  **555b2b7** - Feature: Affichage adaptatif du planning selon le nombre de plages
-  **9c4bffb** - Feature: Am�lioration affichage menus formateurs/apprenants

### Commits r�cents (Septembre 2025)
-  **b49d42e** - Merge: R�solution conflits GitLab
-  **22912d6** - Fix: Syst�me d'absence apprenants fonctionnel
-  **6cb3193** - Fix: Cache et debug syst�me absences apprenants
-  **97f99f9** - Feature: Syst�me complet de gestion des absences apprenants
-  **e4083be** - Security: Remove exposed secrets file

---

##  Fonctionnalit�s op�rationnelles

### Espace Admin
-  Tableau de bord principal
-  Planning de coordination (page principale)
-  Gestion des formateurs (CRUD)
-  Gestion des apprenants (CRUD)
-  Gestion des lieux (CRUD)
-  Gestion des salari�s (CRUD)
-  Gestion des absences formateurs
-  Gestion des absences apprenants (syst�me complet)
-  Planning type (apprenants & formateurs)
-  Validation des changements en attente
-  Prise de contr�le formateur (admin override)
-  Messagerie inter-utilisateurs

### Espace Formateur
-  Dashboard personnel
-  Authentification JWT s�curis�e
-  Planning type personnel (mod�le hebdomadaire)
-  Planning hebdomadaire actuel
-  Saisie des pr�sences (pointage)
-  D�claration d'absences
-  Gestion du profil
-  Changement de mot de passe
-  Messagerie

### Authentification & S�curit�
-  Double syst�me d'authentification (Admin hardcod� + JWT Formateurs)
-  Tokens JWT avec refresh (15 min / 7 jours)
-  Hashage bcrypt des mots de passe
-  Row Level Security (RLS) sur Supabase
-  Protection des routes avec HOCs
-  Session tracking pour auditing

### Infrastructure
-  D�ploiement automatique Vercel
-  Sauvegardes automatiques quotidiennes (2h00 UTC)
-  GitHub Actions pour backups Supabase
-  Conservation 7 derni�res sauvegardes
-  Next.js 15 avec Turbopack
-  React 19

---

## >� Maintenance r�cente (Octobre 2025)

### Nettoyage effectu�
-  **37 fichiers obsol�tes supprim�s** de la racine :
  - 12 scripts debug Auda (cas sp�cifique r�solu)
  - 4 scripts debug Palma (cas sp�cifique r�solu)
  - 5 scripts debug jours sp�cifiques
  - 2 scripts nettoyage doublons
  - 7 fichiers audit/rapports (dont 3 MB JSON)
  - 2 scripts test divers
  - 5 scripts RLS debug

-  **Scripts archiv�s** dans `_old-scripts/` :
  - `add-identifiant-field.mjs` (migration historique)

-  **Documentation mise � jour** :
  - CLAUDE.md enrichi (194 � 458 lignes)
  - Nouvelles sections : Stack technique, exemples de code, ressources
  - STATUS.md cr�� (ce fichier)

### Espace disque r�cup�r�
- **~3.2 MB** lib�r�s (principalement rapport JSON audit)

---

## � Points d'attention

### Fichiers � nettoyer progressivement

**Dans `pages/` (13 fichiers) :**
- `*-vercel.js` (3 fichiers) - Versions sp�cifiques d�ploiement
- `*-local cass�.js` (2 fichiers) - Versions historiques
- `*.backup*` (7 fichiers) - Sauvegardes manuelles
- `*.backup-before-*` - Sauvegardes dat�es

**Pages de test/debug (6 fichiers) :**
- `debug-absence-orpheline.js`
- `test-menuapprenants.js`
- `test-menuapprenants-complet.js`
- `test-menuapprenants-direct.js`
- `test-vrai-menuapprenants.js`
- `login-temporaire.js`

**Recommandation :** Archiver ces fichiers apr�s v�rification qu'ils ne sont plus utilis�s.

### Fichiers de backup dans `components/`
- `MenuApprenants.js.backup-20250831-082251`
- `MenuApprenants.js.backup-20250831-094319`

### Limitations connues

**Technique :**
- Pas de suite de tests automatis�s (tests manuels uniquement)
- Certaines politiques RLS complexes � modifier
- Cr�neaux "M/AM" vs "matin/apr�s-midi" utilis�s de mani�re interchangeable

**Op�rationnel :**
- Runners GitHub Actions limit�s IPv4 (solution : Session Pooler Supabase)
- Normalisation des logins formateurs (Jos� � jose)

---

## = S�curit�

### �tat de s�curit�
-  Secrets retir�s du d�p�t (commits r�cents)
-  `.env.local` dans .gitignore
-  Service role key prot�g�e (API routes uniquement)
-  Mots de passe hash�s bcrypt (salt rounds: 10)
-  Tokens JWT avec expiration courte
-  RLS activ� sur tables sensibles

### Variables d'environnement requises
```bash
NEXT_PUBLIC_SUPABASE_URL=***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
JWT_SECRET=***
JWT_REFRESH_SECRET=***
```

---

## =� M�triques de d�veloppement

### Codebase
- **Lignes de code :** ~15-20k (estimation)
- **Fichiers principaux :**
  - Pages : ~30 fichiers
  - Composants : ~10 fichiers
  - API Routes : ~15 endpoints
  - Utilitaires lib/ : 6 fichiers

### Git
- **Branche principale :** `master`
- **Dernier commit :** fd1d03f (1er octobre 2025)
- **Commits r�cents :** Focus UX et optimisations

### D�pendances
- **Dependencies :** 4 packages principaux
  - @supabase/supabase-js ^2.54.0
  - bcryptjs ^3.0.2
  - jsonwebtoken ^9.0.2
  - next 15.4.6
  - react 19.1.0
  - react-dom 19.1.0

---

## <� Prochaines �tapes recommand�es

### Maintenance
- [ ] Nettoyer les 13 fichiers backup/vercel dans `pages/`
- [ ] Archiver les 6 pages de test/debug
- [ ] V�rifier et supprimer les 2 backups de `MenuApprenants.js`
- [ ] Standardiser les termes cr�neaux (M/AM vs matin/apr�s-midi)

### Am�liorations techniques
- [ ] Impl�menter des tests automatis�s (Jest/Vitest)
- [ ] Documenter les politiques RLS complexes
- [ ] Cr�er un script de migration pour normalisation cr�neaux
- [ ] Ajouter monitoring/alerting (erreurs, performances)

### Documentation
- [x] CLAUDE.md - Documentation compl�te
- [x] STATUS.md - �tat du projet
- [ ] README.md - Guide utilisateur/installation
- [ ] CONTRIBUTING.md - Guide contributeur

### Optimisations
- [ ] Audit de performance (Lighthouse)
- [ ] Optimisation des requ�tes Supabase (indexes)
- [ ] Mise en cache strat�gique
- [ ] Compression des images/assets

---

## =� Support & Ressources

### Documentation
- [CLAUDE.md](./CLAUDE.md) - Guide d�veloppeur complet
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React 19 Docs](https://react.dev)

### Sauvegardes
- **Emplacement :** `Save Supabase/backup-system/backups/`
- **Fr�quence :** Quotidienne (2h00 UTC)
- **R�tention :** 7 derni�res sauvegardes
- **Format :** roles.sql + schema.sql + data.sql

### D�ploiement
- **Production :** Vercel (d�ploiement automatique sur push master)
- **D�veloppement :** `npm run dev` (localhost:3000)
- **Build :** `npm run build` (v�rification avant d�ploiement)

---

## =� Notes de version

### v8 (Actuelle - Octobre 2025)
-  Syst�me d'absences apprenants complet
-  Bouton "Valider Modifications"
-  Affichage adaptatif planning
-  Optimisations UX menus
-  Fix largeur colonnes M/AM
-  Nettoyage codebase (37 fichiers)
-  Documentation enrichie

### Versions pr�c�dentes
Historique disponible via `git log`

---

## <� Tags & Labels

**�tat :** Production
**Stabilit� :** Stable
**Maintenance :** Active
**Tests :** Manuels
**D�ploiement :** Automatique (Vercel)
**Backup :** Automatique (GitHub Actions)

---

**Note :** Ce fichier STATUS.md doit �tre mis � jour r�guli�rement apr�s chaque modification importante du projet.
