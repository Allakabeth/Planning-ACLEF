-- Table pour gérer les présences des formateurs
-- Enregistre chaque demi-journée (matin/après-midi) avec le lieu

CREATE TABLE IF NOT EXISTS presence_formateurs (
    id SERIAL PRIMARY KEY,
    formateur_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    periode VARCHAR(20) NOT NULL CHECK (periode IN ('matin', 'apres_midi')),
    lieu VARCHAR(100) NOT NULL,
    present BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_presence_formateurs_formateur_id ON presence_formateurs(formateur_id);
CREATE INDEX IF NOT EXISTS idx_presence_formateurs_date ON presence_formateurs(date);
CREATE INDEX IF NOT EXISTS idx_presence_formateurs_formateur_date ON presence_formateurs(formateur_id, date);

-- Contrainte d'unicité pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_formateurs_unique
ON presence_formateurs(formateur_id, date, periode);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_presence_formateurs_updated_at
    BEFORE UPDATE ON presence_formateurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - seulement si nécessaire
-- ALTER TABLE presence_formateurs ENABLE ROW LEVEL SECURITY;

-- Commentaires
COMMENT ON TABLE presence_formateurs IS 'Table pour enregistrer les présences des formateurs par demi-journée';
COMMENT ON COLUMN presence_formateurs.formateur_id IS 'Référence vers le formateur';
COMMENT ON COLUMN presence_formateurs.date IS 'Date de la présence';
COMMENT ON COLUMN presence_formateurs.periode IS 'Période: matin ou apres_midi';
COMMENT ON COLUMN presence_formateurs.lieu IS 'Lieu de présence (initiales ou nom complet)';
COMMENT ON COLUMN presence_formateurs.present IS 'true si présent, false si absent';