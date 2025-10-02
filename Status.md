# STATUS.md - État du projet ACLEF Planning

**Dernière mise à jour :** 1er octobre 2025
**Version :** v8 (en production)
**Statut global :** =â Stable et opérationnel

---

## =Ê Vue d'ensemble

### Application principale
- **Nom :** ACLEF Planning
- **Type :** Application web Next.js 15
- **État :** Production active
- **Hébergement :** Vercel
- **Base de données :** Supabase (PostgreSQL)

### Metrics clés
- **Utilisateurs :** Formateurs + Personnel administratif
- **Fonctionnalités principales :**
  - Gestion planning de formation
  - Gestion absences (formateurs & apprenants)
  - Système de présences
  - Messagerie interne
  - Planning type hebdomadaire

---

## =€ Dernières évolutions

### Commits récents (Octobre 2025)
-  **fd1d03f** - Fix: Réduction drastique de la largeur colonne M/AM
-  **48bbb55** - Feature: Nouveau bouton "Valider Modifications" + optimisations UX
-  **555b2b7** - Feature: Affichage adaptatif du planning selon le nombre de plages
-  **9c4bffb** - Feature: Amélioration affichage menus formateurs/apprenants

### Commits récents (Septembre 2025)
-  **b49d42e** - Merge: Résolution conflits GitLab
-  **22912d6** - Fix: Système d'absence apprenants fonctionnel
-  **6cb3193** - Fix: Cache et debug système absences apprenants
-  **97f99f9** - Feature: Système complet de gestion des absences apprenants
-  **e4083be** - Security: Remove exposed secrets file

---

##  Fonctionnalités opérationnelles

### Espace Admin
-  Tableau de bord principal
-  Planning de coordination (page principale)
-  Gestion des formateurs (CRUD)
-  Gestion des apprenants (CRUD)
-  Gestion des lieux (CRUD)
-  Gestion des salariés (CRUD)
-  Gestion des absences formateurs
-  Gestion des absences apprenants (système complet)
-  Planning type (apprenants & formateurs)
-  Validation des changements en attente
-  Prise de contrôle formateur (admin override)
-  Messagerie inter-utilisateurs

### Espace Formateur
-  Dashboard personnel
-  Authentification JWT sécurisée
-  Planning type personnel (modèle hebdomadaire)
-  Planning hebdomadaire actuel
-  Saisie des présences (pointage)
-  Déclaration d'absences
-  Gestion du profil
-  Changement de mot de passe
-  Messagerie

### Authentification & Sécurité
-  Double système d'authentification (Admin hardcodé + JWT Formateurs)
-  Tokens JWT avec refresh (15 min / 7 jours)
-  Hashage bcrypt des mots de passe
-  Row Level Security (RLS) sur Supabase
-  Protection des routes avec HOCs
-  Session tracking pour auditing

### Infrastructure
-  Déploiement automatique Vercel
-  Sauvegardes automatiques quotidiennes (2h00 UTC)
-  GitHub Actions pour backups Supabase
-  Conservation 7 dernières sauvegardes
-  Next.js 15 avec Turbopack
-  React 19

---

## >ù Maintenance récente (Octobre 2025)

### Nettoyage effectué
-  **37 fichiers obsolètes supprimés** de la racine :
  - 12 scripts debug Auda (cas spécifique résolu)
  - 4 scripts debug Palma (cas spécifique résolu)
  - 5 scripts debug jours spécifiques
  - 2 scripts nettoyage doublons
  - 7 fichiers audit/rapports (dont 3 MB JSON)
  - 2 scripts test divers
  - 5 scripts RLS debug

-  **Scripts archivés** dans `_old-scripts/` :
  - `add-identifiant-field.mjs` (migration historique)

-  **Documentation mise à jour** :
  - CLAUDE.md enrichi (194 ’ 458 lignes)
  - Nouvelles sections : Stack technique, exemples de code, ressources
  - STATUS.md créé (ce fichier)

### Espace disque récupéré
- **~3.2 MB** libérés (principalement rapport JSON audit)

---

##   Points d'attention

### Fichiers à nettoyer progressivement

**Dans `pages/` (13 fichiers) :**
- `*-vercel.js` (3 fichiers) - Versions spécifiques déploiement
- `*-local cassé.js` (2 fichiers) - Versions historiques
- `*.backup*` (7 fichiers) - Sauvegardes manuelles
- `*.backup-before-*` - Sauvegardes datées

**Pages de test/debug (6 fichiers) :**
- `debug-absence-orpheline.js`
- `test-menuapprenants.js`
- `test-menuapprenants-complet.js`
- `test-menuapprenants-direct.js`
- `test-vrai-menuapprenants.js`
- `login-temporaire.js`

**Recommandation :** Archiver ces fichiers après vérification qu'ils ne sont plus utilisés.

### Fichiers de backup dans `components/`
- `MenuApprenants.js.backup-20250831-082251`
- `MenuApprenants.js.backup-20250831-094319`

### Limitations connues

**Technique :**
- Pas de suite de tests automatisés (tests manuels uniquement)
- Certaines politiques RLS complexes à modifier
- Créneaux "M/AM" vs "matin/après-midi" utilisés de manière interchangeable

**Opérationnel :**
- Runners GitHub Actions limités IPv4 (solution : Session Pooler Supabase)
- Normalisation des logins formateurs (José ’ jose)

---

## = Sécurité

### État de sécurité
-  Secrets retirés du dépôt (commits récents)
-  `.env.local` dans .gitignore
-  Service role key protégée (API routes uniquement)
-  Mots de passe hashés bcrypt (salt rounds: 10)
-  Tokens JWT avec expiration courte
-  RLS activé sur tables sensibles

### Variables d'environnement requises
```bash
NEXT_PUBLIC_SUPABASE_URL=***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
JWT_SECRET=***
JWT_REFRESH_SECRET=***
```

---

## =È Métriques de développement

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
- **Commits récents :** Focus UX et optimisations

### Dépendances
- **Dependencies :** 4 packages principaux
  - @supabase/supabase-js ^2.54.0
  - bcryptjs ^3.0.2
  - jsonwebtoken ^9.0.2
  - next 15.4.6
  - react 19.1.0
  - react-dom 19.1.0

---

## <¯ Prochaines étapes recommandées

### Maintenance
- [ ] Nettoyer les 13 fichiers backup/vercel dans `pages/`
- [ ] Archiver les 6 pages de test/debug
- [ ] Vérifier et supprimer les 2 backups de `MenuApprenants.js`
- [ ] Standardiser les termes créneaux (M/AM vs matin/après-midi)

### Améliorations techniques
- [ ] Implémenter des tests automatisés (Jest/Vitest)
- [ ] Documenter les politiques RLS complexes
- [ ] Créer un script de migration pour normalisation créneaux
- [ ] Ajouter monitoring/alerting (erreurs, performances)

### Documentation
- [x] CLAUDE.md - Documentation complète
- [x] STATUS.md - État du projet
- [ ] README.md - Guide utilisateur/installation
- [ ] CONTRIBUTING.md - Guide contributeur

### Optimisations
- [ ] Audit de performance (Lighthouse)
- [ ] Optimisation des requêtes Supabase (indexes)
- [ ] Mise en cache stratégique
- [ ] Compression des images/assets

---

## =Þ Support & Ressources

### Documentation
- [CLAUDE.md](./CLAUDE.md) - Guide développeur complet
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React 19 Docs](https://react.dev)

### Sauvegardes
- **Emplacement :** `Save Supabase/backup-system/backups/`
- **Fréquence :** Quotidienne (2h00 UTC)
- **Rétention :** 7 dernières sauvegardes
- **Format :** roles.sql + schema.sql + data.sql

### Déploiement
- **Production :** Vercel (déploiement automatique sur push master)
- **Développement :** `npm run dev` (localhost:3000)
- **Build :** `npm run build` (vérification avant déploiement)

---

## =Ý Notes de version

### v8 (Actuelle - Octobre 2025)
-  Système d'absences apprenants complet
-  Bouton "Valider Modifications"
-  Affichage adaptatif planning
-  Optimisations UX menus
-  Fix largeur colonnes M/AM
-  Nettoyage codebase (37 fichiers)
-  Documentation enrichie

### Versions précédentes
Historique disponible via `git log`

---

## <÷ Tags & Labels

**État :** Production
**Stabilité :** Stable
**Maintenance :** Active
**Tests :** Manuels
**Déploiement :** Automatique (Vercel)
**Backup :** Automatique (GitHub Actions)

---

**Note :** Ce fichier STATUS.md doit être mis à jour régulièrement après chaque modification importante du projet.
