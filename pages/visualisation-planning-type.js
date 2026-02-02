import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withAuthAdmin } from '../components/withAuthAdmin';

/**
 * Page de visualisation du planning type
 * Affiche qui DEVRAIT etre present chaque jour/creneau selon les plannings types
 * Les formateurs "sans preference" (lieu_id = NULL) sont places dans le lieu
 * le plus frequent selon l'historique, avec "(SP)" apres leur nom
 */
function VisualisationPlanningType() {
    const router = useRouter();
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const creneaux = ['Matin', 'AM'];
    
    // Mapping jour vers numero PostgreSQL (EXTRACT DOW: 1=Lundi, 5=Vendredi)
    const jourVersNum = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5 };

    // Etats
    const [lieux, setLieux] = useState([]);
    const [formateurs, setFormateurs] = useState([]);
    const [apprenants, setApprenants] = useState([]);
    const [planningFormateurs, setPlanningFormateurs] = useState([]);
    const [planningApprenants, setPlanningApprenants] = useState([]);
    const [historiqueFormateurs, setHistoriqueFormateurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Charger les donnees au montage
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Charger toutes les donnees en parallele
            const [lieuxRes, formateursRes, apprenantsRes, planningFRes, planningARes, historiqueRes] = await Promise.all([
                supabase.from('lieux').select('id, nom, initiale, couleur').eq('archive', false).order('nom'),
                supabase.from('users').select('id, prenom, nom').eq('role', 'formateur').eq('archive', false).order('nom'),
                supabase.from('users').select('id, prenom, nom, date_fin_formation_reelle').eq('role', 'apprenant').eq('archive', false).order('nom'),
                supabase.from('planning_type_formateurs')
                    .select('formateur_id, jour, creneau, lieu_id, statut')
                    .eq('valide', true)
                    .in('statut', ['disponible', 'dispo_except']),
                supabase.from('planning_apprenants')
                    .select('apprenant_id, jour, creneau, lieu_id')
                    .eq('actif', true),
                // Historique pour calculer lieu prefere des "sans preference"
                supabase.from('planning_formateurs_hebdo')
                    .select('formateur_id, date, creneau, lieu_nom')
            ]);

            if (lieuxRes.error) throw lieuxRes.error;
            if (formateursRes.error) throw formateursRes.error;
            if (planningFRes.error) throw planningFRes.error;
            if (planningARes.error) throw planningARes.error;

            setLieux(lieuxRes.data || []);
            setFormateurs(formateursRes.data || []);

            // Filtrer les apprenants dont la formation est terminee
            const today = new Date().toISOString().split('T')[0];
            const apprenantsActifs = (apprenantsRes.data || []).filter(a => {
                if (!a.date_fin_formation_reelle) return true;
                return a.date_fin_formation_reelle >= today;
            });
            setApprenants(apprenantsActifs);

            setPlanningFormateurs(planningFRes.data || []);
            setPlanningApprenants(planningARes.data || []);
            setHistoriqueFormateurs(historiqueRes.data || []);

        } catch (err) {
            setError(err.message || 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    // Calculer le lieu le plus frequent pour un formateur/jour/creneau
    const getLieuPlusFerequent = (formateurId, jourNum, creneau) => {
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
        
        // Filtrer l'historique pour ce formateur/jour/creneau
        const occurrences = {};
        historiqueFormateurs.forEach(h => {
            if (h.formateur_id !== formateurId) return;
            if (!h.lieu_nom || h.lieu_nom === '') return;
            
            // Calculer le jour de semaine de la date
            const date = new Date(h.date);
            const jourSemaine = date.getDay(); // 0=Dimanche, 1=Lundi, etc.
            // Convertir: getDay() retourne 0=Dimanche, mais on veut 1=Lundi
            const jourDB = jourSemaine === 0 ? 7 : jourSemaine;
            
            if (jourDB !== jourNum) return;
            if (h.creneau?.toLowerCase() !== creneauDB.toLowerCase() && h.creneau !== creneau) return;
            
            occurrences[h.lieu_nom] = (occurrences[h.lieu_nom] || 0) + 1;
        });
        
        // Trouver le lieu avec le plus d'occurrences
        let maxLieu = null;
        let maxCount = 0;
        Object.entries(occurrences).forEach(([lieu, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxLieu = lieu;
            }
        });

        // Si pas d'historique, mettre CCP par defaut
        if (!maxLieu) {
            maxLieu = 'Centre Camille Pagé';
        }

        return maxLieu;
    };

    // Obtenir les formateurs pour un jour/creneau/lieu donne
    const getFormateursForCell = (jour, creneau, lieuId, lieuNom) => {
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
        const jourNum = jourVersNum[jour.toLowerCase()];
        const result = [];
        
        // 1. Formateurs avec ce lieu specifique
        planningFormateurs
            .filter(pt =>
                pt.jour?.toLowerCase() === jour.toLowerCase() &&
                (pt.creneau === creneauDB || pt.creneau === creneau) &&
                pt.lieu_id === lieuId
            )
            .forEach(pt => {
                const formateur = formateurs.find(f => f.id === pt.formateur_id);
                if (formateur) {
                    result.push({
                        nom: formateur.prenom + ' ' + formateur.nom,
                        sp: false,
                        statut: pt.statut
                    });
                }
            });

        // 2. Formateurs "sans preference" (lieu_id = NULL) dont le lieu calcule = ce lieu
        planningFormateurs
            .filter(pt =>
                pt.jour?.toLowerCase() === jour.toLowerCase() &&
                (pt.creneau === creneauDB || pt.creneau === creneau) &&
                pt.lieu_id === null
            )
            .forEach(pt => {
                const formateur = formateurs.find(f => f.id === pt.formateur_id);
                if (!formateur) return;

                const lieuCalcule = getLieuPlusFerequent(pt.formateur_id, jourNum, creneau);
                if (lieuCalcule && lieuCalcule === lieuNom) {
                    result.push({
                        nom: formateur.prenom + ' ' + formateur.nom,
                        sp: true,
                        statut: pt.statut
                    });
                }
            });
        
        return result;
    };

    // Obtenir les apprenants pour un jour/creneau/lieu donne
    const getApprenantsForCell = (jour, creneau, lieuId) => {
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
        return planningApprenants
            .filter(pt =>
                pt.jour?.toLowerCase() === jour.toLowerCase() &&
                (pt.creneau === creneauDB || pt.creneau === creneau) &&
                pt.lieu_id === lieuId
            )
            .map(pt => {
                const apprenant = apprenants.find(a => a.id === pt.apprenant_id);
                return apprenant ? apprenant.prenom + ' ' + apprenant.nom : null;
            })
            .filter(Boolean);
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Chargement du planning type...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
                <p>Erreur: {error}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            {/* En-tete */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <h1 style={{ margin: 0, color: '#1e40af' }}>
                    Planning Type - Vue Globale
                </h1>
                <button
                    onClick={() => router.push('/planning-coordo')}
                    style={{
                        padding: '10px 20px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Retour au Planning
                </button>
            </div>

            {/* Legende */}
            <div style={{
                background: '#f0f9ff',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #bae6fd'
            }}>
                <p style={{ margin: 0, color: '#0369a1' }}>
                    Cette page affiche le <strong>planning type theorique</strong> : qui devrait etre present chaque jour/creneau selon les plannings types configures.
                    <br />
                    <strong>(SP)</strong> = Sans Preference - lieu calcule selon l'historique des presences.
                    <br />
                    Les absences ne sont PAS prises en compte ici.
                </p>
            </div>

            {/* Grille du planning */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                }}>
                    <thead>
                        <tr>
                            <th style={{
                                border: '1px solid #d1d5db',
                                padding: '10px',
                                background: '#f3f4f6',
                                minWidth: '80px'
                            }}>
                                Jour / Lieu
                            </th>
                            {jours.map(jour => (
                                <th
                                    key={jour}
                                    colSpan={2}
                                    style={{
                                        border: '1px solid #d1d5db',
                                        padding: '10px',
                                        background: '#1e40af',
                                        color: 'white',
                                        textAlign: 'center'
                                    }}
                                >
                                    {jour}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th style={{
                                border: '1px solid #d1d5db',
                                padding: '8px',
                                background: '#f3f4f6'
                            }}>
                                Creneau
                            </th>
                            {jours.map(jour => (
                                creneaux.map(creneau => (
                                    <th
                                        key={jour + '-' + creneau}
                                        style={{
                                            border: '1px solid #d1d5db',
                                            padding: '8px',
                                            background: creneau === 'Matin' ? '#dbeafe' : '#fef3c7',
                                            minWidth: '150px'
                                        }}
                                    >
                                        {creneau}
                                    </th>
                                ))
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {lieux.map(lieu => (
                            <tr key={lieu.id}>
                                <td style={{
                                    border: '1px solid #d1d5db',
                                    padding: '10px',
                                    background: lieu.couleur || '#f9fafb',
                                    fontWeight: 'bold',
                                    verticalAlign: 'top',
                                    color: '#000000',
                                    textShadow: '0 0 2px white'
                                }}>
                                    {lieu.initiale || lieu.nom}
                                </td>
                                {jours.map(jour => (
                                    creneaux.map(creneau => {
                                        const formateursCell = getFormateursForCell(jour, creneau, lieu.id, lieu.nom);
                                        const apprenantsCell = getApprenantsForCell(jour, creneau, lieu.id);
                                        const hasContent = formateursCell.length > 0 || apprenantsCell.length > 0;

                                        return (
                                            <td
                                                key={jour + '-' + creneau + '-' + lieu.id}
                                                style={{
                                                    border: '1px solid #d1d5db',
                                                    padding: '8px',
                                                    verticalAlign: 'top',
                                                    background: hasContent ? '#ffffff' : '#f9fafb'
                                                }}
                                            >
                                                {hasContent ? (
                                                    <>
                                                        {/* Formateurs */}
                                                        {formateursCell.length > 0 && (
                                                            <div style={{ marginBottom: '8px' }}>
                                                                <div style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    color: '#1e40af',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    FORMATEURS
                                                                </div>
                                                                {formateursCell.map((f, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        style={{
                                                                            background: f.statut === 'dispo_except' ? '#fef3c7' : '#dbeafe',
                                                                            padding: '3px 6px',
                                                                            borderRadius: '3px',
                                                                            marginBottom: '2px',
                                                                            fontSize: '11px'
                                                                        }}
                                                                    >
                                                                        {f.nom}{f.sp ? ' (SP)' : ''}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Apprenants */}
                                                        {apprenantsCell.length > 0 && (
                                                            <div>
                                                                <div style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    color: '#059669',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    APPRENANTS
                                                                </div>
                                                                {apprenantsCell.map((nom, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        style={{
                                                                            background: '#d1fae5',
                                                                            padding: '3px 6px',
                                                                            borderRadius: '3px',
                                                                            marginBottom: '2px',
                                                                            fontSize: '11px'
                                                                        }}
                                                                    >
                                                                        {nom}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Statistiques */}
            <div style={{
                marginTop: '20px',
                padding: '15px',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                gap: '30px',
                flexWrap: 'wrap'
            }}>
                <div>
                    <strong>Formateurs actifs :</strong> {formateurs.length}
                </div>
                <div>
                    <strong>Apprenants actifs :</strong> {apprenants.length}
                </div>
                <div>
                    <strong>Lieux actifs :</strong> {lieux.length}
                </div>
                <div>
                    <strong>Entrees planning formateurs :</strong> {planningFormateurs.length}
                </div>
                <div>
                    <strong>Entrees planning apprenants :</strong> {planningApprenants.length}
                </div>
            </div>
        </div>
    );
}

export default withAuthAdmin(VisualisationPlanningType);
