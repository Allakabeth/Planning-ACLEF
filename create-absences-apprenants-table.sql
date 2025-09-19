-- Table pour gérer les absences et présences exceptionnelles des apprenants
-- Permet la gestion flexible des absences par période et des présences exceptionnelles

CREATE TABLE IF NOT EXISTS absences_apprenants (
    id SERIAL PRIMARY KEY,
    apprenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type d'événement
    type VARCHAR(50) NOT NULL CHECK (type IN ('absence_periode', 'absence_ponctuelle', 'presence_exceptionnelle')),

    -- Gestion des périodes (pour absence_periode)
    date_debut DATE,
    date_fin DATE,

    -- Gestion ponctuelle (pour absence_ponctuelle et presence_exceptionnelle)
    date_specifique DATE,
    creneau VARCHAR(20) CHECK (creneau IN ('matin', 'AM')),
    lieu_id UUID REFERENCES lieux(id),

    -- Métadonnées
    motif TEXT,
    statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'annule')),

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_apprenant_id ON absences_apprenants(apprenant_id);
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_date_debut ON absences_apprenants(date_debut);
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_date_fin ON absences_apprenants(date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_date_specifique ON absences_apprenants(date_specifique);
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_type ON absences_apprenants(type);
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_statut ON absences_apprenants(statut);

-- Index composé pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_absences_apprenants_recherche
ON absences_apprenants(apprenant_id, type, statut, date_debut, date_fin);

-- Contraintes de validation métier
ALTER TABLE absences_apprenants ADD CONSTRAINT check_absence_periode_dates
CHECK (
    (type = 'absence_periode' AND date_debut IS NOT NULL AND date_fin IS NOT NULL AND date_debut <= date_fin)
    OR type != 'absence_periode'
);

ALTER TABLE absences_apprenants ADD CONSTRAINT check_absence_ponctuelle_data
CHECK (
    (type = 'absence_ponctuelle' AND date_specifique IS NOT NULL AND creneau IS NOT NULL)
    OR type != 'absence_ponctuelle'
);

ALTER TABLE absences_apprenants ADD CONSTRAINT check_presence_exceptionnelle_data
CHECK (
    (type = 'presence_exceptionnelle' AND date_specifique IS NOT NULL AND creneau IS NOT NULL AND lieu_id IS NOT NULL)
    OR type != 'presence_exceptionnelle'
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_absences_apprenants_updated_at
    BEFORE UPDATE ON absences_apprenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - optionnel
-- ALTER TABLE absences_apprenants ENABLE ROW LEVEL SECURITY;

-- Commentaires
COMMENT ON TABLE absences_apprenants IS 'Table pour gérer les absences par période, absences ponctuelles et présences exceptionnelles des apprenants';
COMMENT ON COLUMN absences_apprenants.type IS 'Type: absence_periode (plage de dates), absence_ponctuelle (date+créneau spécifique), presence_exceptionnelle (ajout dans planning)';
COMMENT ON COLUMN absences_apprenants.date_debut IS 'Date de début pour les absences par période';
COMMENT ON COLUMN absences_apprenants.date_fin IS 'Date de fin pour les absences par période';
COMMENT ON COLUMN absences_apprenants.date_specifique IS 'Date spécifique pour les absences ponctuelles et présences exceptionnelles';
COMMENT ON COLUMN absences_apprenants.creneau IS 'Créneau: matin ou AM pour les événements ponctuels';
COMMENT ON COLUMN absences_apprenants.lieu_id IS 'Lieu pour les présences exceptionnelles';
COMMENT ON COLUMN absences_apprenants.statut IS 'Statut: actif ou annule';