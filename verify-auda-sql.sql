-- 🔍 VÉRIFICATION COMPLÈTE AUDA WELSCH
-- =====================================

-- 1. INFORMATIONS AUDA
SELECT 
    'AUDA INFO' as type,
    id,
    prenom,
    nom,
    role
FROM users 
WHERE nom ILIKE '%welsch%' AND role = 'formateur';

-- 2. PLANNING TYPE ACTUEL
SELECT 
    'PLANNING TYPE' as type,
    pt.id,
    pt.jour,
    pt.creneau,
    pt.statut,
    pt.lieu_id,
    pt.valide,
    pt.created_at
FROM planning_type_formateurs pt
JOIN users u ON pt.formateur_id = u.id
WHERE u.nom ILIKE '%welsch%' 
ORDER BY 
    CASE pt.jour 
        WHEN 'Lundi' THEN 1
        WHEN 'Mardi' THEN 2 
        WHEN 'Mercredi' THEN 3
        WHEN 'Jeudi' THEN 4
        WHEN 'Vendredi' THEN 5
        ELSE 6
    END,
    pt.creneau;

-- 3. TOUTES LES ABSENCES/DISPO EXCEPT D'AUDA
SELECT 
    'ABSENCES' as type,
    a.id,
    a.date_debut,
    a.date_fin,
    a.type,
    a.statut,
    a.created_at,
    -- Calculer le jour de la semaine
    CASE EXTRACT(DOW FROM a.date_debut::date)
        WHEN 0 THEN 'Dimanche'
        WHEN 1 THEN 'Lundi'
        WHEN 2 THEN 'Mardi'
        WHEN 3 THEN 'Mercredi'
        WHEN 4 THEN 'Jeudi'
        WHEN 5 THEN 'Vendredi'
        WHEN 6 THEN 'Samedi'
    END as jour_semaine
FROM absences_formateurs a
JOIN users u ON a.formateur_id = u.id
WHERE u.nom ILIKE '%welsch%'
ORDER BY a.date_debut DESC;

-- 4. FOCUS SUR LES DATES SPÉCIFIQUES
SELECT 
    'DATES FOCUS' as type,
    a.date_debut,
    a.date_fin,
    a.type,
    a.statut,
    CASE EXTRACT(DOW FROM a.date_debut::date)
        WHEN 0 THEN 'Dimanche'
        WHEN 1 THEN 'Lundi'
        WHEN 2 THEN 'Mardi'
        WHEN 3 THEN 'Mercredi'
        WHEN 4 THEN 'Jeudi'
        WHEN 5 THEN 'Vendredi'
        WHEN 6 THEN 'Samedi'
    END as jour_semaine,
    a.created_at as cree_le
FROM absences_formateurs a
JOIN users u ON a.formateur_id = u.id
WHERE u.nom ILIKE '%welsch%'
AND a.date_debut IN ('2025-09-02', '2025-09-04')
ORDER BY a.date_debut;

-- 5. VÉRIFICATION STATUTS ET TYPES
SELECT 
    'RESUME' as type,
    COUNT(*) as total,
    a.type,
    a.statut
FROM absences_formateurs a
JOIN users u ON a.formateur_id = u.id
WHERE u.nom ILIKE '%welsch%'
GROUP BY a.type, a.statut
ORDER BY a.type, a.statut;