import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withAuthAdmin } from '../components/withAuthAdmin';

/**
 * Page de visualisation du planning type - Version V2
 * Meme donnees que la V1, mais affichage au format planning coordo :
 * Colonnes = Jours x Lieux, Lignes = Creneaux (M / AM)
 */
function VisualisationPlanningTypeV2() {
    const router = useRouter();
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const creneaux = ['Matin', 'AM'];

    // Mapping jour vers numero PostgreSQL (EXTRACT DOW: 1=Lundi, 5=Vendredi)
    const jourVersNum = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5 };

    // Etats - copie exacte de la V1
    const [lieux, setLieux] = useState([]);
    const [formateurs, setFormateurs] = useState([]);
    const [apprenants, setApprenants] = useState([]);
    const [planningFormateurs, setPlanningFormateurs] = useState([]);
    const [planningApprenants, setPlanningApprenants] = useState([]);
    const [historiqueFormateurs, setHistoriqueFormateurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Charger les donnees au montage - copie exacte de la V1
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

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
                supabase.from('planning_formateurs_hebdo')
                    .select('formateur_id, date, creneau, lieu_nom')
            ]);

            if (lieuxRes.error) throw lieuxRes.error;
            if (formateursRes.error) throw formateursRes.error;
            if (planningFRes.error) throw planningFRes.error;
            if (planningARes.error) throw planningARes.error;

            setLieux(lieuxRes.data || []);
            setFormateurs(formateursRes.data || []);

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

    // Copie exacte de la V1 - Calculer le lieu le plus frequent
    const getLieuPlusFerequent = (formateurId, jourNum, creneau) => {
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';

        const occurrences = {};
        historiqueFormateurs.forEach(h => {
            if (h.formateur_id !== formateurId) return;
            if (!h.lieu_nom || h.lieu_nom === '') return;

            const date = new Date(h.date);
            const jourSemaine = date.getDay();
            const jourDB = jourSemaine === 0 ? 7 : jourSemaine;

            if (jourDB !== jourNum) return;
            if (h.creneau?.toLowerCase() !== creneauDB.toLowerCase() && h.creneau !== creneau) return;

            occurrences[h.lieu_nom] = (occurrences[h.lieu_nom] || 0) + 1;
        });

        let maxLieu = null;
        let maxCount = 0;
        Object.entries(occurrences).forEach(([lieu, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxLieu = lieu;
            }
        });

        if (!maxLieu) {
            maxLieu = 'Centre Camille Page';
        }

        return maxLieu;
    };

    // Copie exacte de la V1 - Obtenir les formateurs pour un jour/creneau/lieu
    const getFormateursForCell = (jour, creneau, lieuId, lieuNom) => {
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
        const jourNum = jourVersNum[jour.toLowerCase()];
        const result = [];

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

    // Copie exacte de la V1 - Obtenir les apprenants pour un jour/creneau/lieu
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

    // NOUVEAU V2 : Calculer quels lieux sont actifs pour chaque jour
    const lieuxParJour = useMemo(() => {
        const result = {};

        jours.forEach((jour, dayIndex) => {
            const lieuIds = new Set();
            const jourLower = jour.toLowerCase();

            // Lieux des formateurs (avec lieu explicite)
            planningFormateurs.forEach(pt => {
                if (pt.jour?.toLowerCase() === jourLower && pt.lieu_id) {
                    lieuIds.add(pt.lieu_id);
                }
            });

            // Lieux des apprenants
            planningApprenants.forEach(pt => {
                if (pt.jour?.toLowerCase() === jourLower && pt.lieu_id) {
                    lieuIds.add(pt.lieu_id);
                }
            });

            // Lieux des formateurs "sans preference" (resolus via historique)
            const jourNum = jourVersNum[jourLower];
            planningFormateurs
                .filter(pt => pt.jour?.toLowerCase() === jourLower && pt.lieu_id === null)
                .forEach(pt => {
                    creneaux.forEach(creneau => {
                        const lieuNom = getLieuPlusFerequent(pt.formateur_id, jourNum, creneau);
                        if (lieuNom) {
                            const lieuObj = lieux.find(l => l.nom === lieuNom);
                            if (lieuObj) {
                                lieuIds.add(lieuObj.id);
                            }
                        }
                    });
                });

            // Trier les lieux dans le meme ordre que la liste des lieux
            const lieuxOrdre = lieux.filter(l => lieuIds.has(l.id));
            result[dayIndex] = lieuxOrdre;
        });

        return result;
    }, [lieux, planningFormateurs, planningApprenants, historiqueFormateurs]);

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

    // Calculer le nombre total de colonnes pour dimensionner
    const totalColonnes = Object.values(lieuxParJour).reduce((total, lieuxJour) => total + lieuxJour.length, 0);
    const columnWidth = totalColonnes > 0 ? Math.max(140, Math.floor(1200 / totalColonnes)) : 200;

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
                    Planning Type
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
                    <span style={{ display: 'inline-block', background: '#dbeafe', padding: '1px 8px', borderRadius: '3px', marginRight: '4px' }}>Bleu</span> = Disponibilites regulieres
                    &nbsp;&nbsp;
                    <span style={{ display: 'inline-block', background: '#fef3c7', padding: '1px 8px', borderRadius: '3px', marginRight: '4px' }}>Jaune</span> = Disponibilites exceptionnelles
                    <br />
                    <strong>(SP)</strong> = Sans Preference - lieu calcule selon l&#39;historique des presences.
                    <br />
                    Les absences ne sont PAS prises en compte ici.
                </p>
            </div>

            {/* Grille du planning - FORMAT COORDO */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '15px',
                overflow: 'auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                <table style={{
                    width: totalColonnes === 0 ? 'auto' : '100%',
                    borderCollapse: 'collapse'
                }}>
                    <thead>
                        {/* Ligne 1 : Noms des jours */}
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{
                                padding: '4px 2px',
                                border: '1px solid #e5e7eb',
                                fontWeight: '600',
                                fontSize: '13px',
                                textAlign: 'center',
                                minWidth: '30px',
                                maxWidth: '30px',
                                width: '30px'
                            }}>
                            </th>
                            {jours.map((jour, dayIndex) => {
                                const lieuxJour = lieuxParJour[dayIndex] || [];
                                if (lieuxJour.length === 0) return null;
                                return (
                                    <th
                                        key={jour}
                                        colSpan={lieuxJour.length}
                                        style={{
                                            padding: '10px',
                                            border: '1px solid #e5e7eb',
                                            textAlign: 'center',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            backgroundColor: '#f9fafb'
                                        }}
                                    >
                                        {jour}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Ligne 2 : Noms/initiales des lieux avec couleur */}
                        <tr>
                            <th style={{
                                padding: '4px 2px',
                                border: '1px solid #e5e7eb',
                                minWidth: '30px',
                                maxWidth: '30px',
                                width: '30px',
                                backgroundColor: '#f9fafb'
                            }}>
                            </th>
                            {jours.map((jour, dayIndex) => {
                                const lieuxJour = lieuxParJour[dayIndex] || [];
                                return lieuxJour.map((lieu) => (
                                    <th
                                        key={dayIndex + '-' + lieu.id}
                                        style={{
                                            padding: '6px 4px',
                                            border: '1px solid #e5e7eb',
                                            textAlign: 'center',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            backgroundColor: lieu.couleur || '#f9fafb',
                                            color: '#000000',
                                            textShadow: '0 0 3px white, 0 0 3px white',
                                            minWidth: columnWidth + 'px',
                                            maxWidth: columnWidth + 'px',
                                            width: columnWidth + 'px'
                                        }}
                                    >
                                        {lieu.initiale || lieu.nom}
                                    </th>
                                ));
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Lignes : Matin et AM */}
                        {creneaux.map((creneau, creneauIndex) => (
                            <tr key={creneau}>
                                <td style={{
                                    padding: '4px 2px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: creneauIndex === 0 ? '#fef3c7' : '#dbeafe',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    fontSize: '10px',
                                    minWidth: '30px',
                                    maxWidth: '30px',
                                    width: '30px'
                                }}>
                                    {creneau === 'Matin' ? 'M' : 'AM'}
                                </td>
                                {jours.map((jour, dayIndex) => {
                                    const lieuxJour = lieuxParJour[dayIndex] || [];
                                    return lieuxJour.map((lieu) => {
                                        const formateursCell = getFormateursForCell(jour, creneau, lieu.id, lieu.nom)
                                            .sort((a, b) => {
                                                // Bleu (disponible) d'abord, jaune (dispo_except) ensuite
                                                if (a.statut === 'disponible' && b.statut !== 'disponible') return -1;
                                                if (a.statut !== 'disponible' && b.statut === 'disponible') return 1;
                                                return 0;
                                            });
                                        const apprenantsCell = getApprenantsForCell(jour, creneau, lieu.id);
                                        const hasContent = formateursCell.length > 0 || apprenantsCell.length > 0;

                                        return (
                                            <td
                                                key={dayIndex + '-' + lieu.id + '-' + creneau}
                                                style={{
                                                    padding: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    verticalAlign: 'top',
                                                    background: hasContent ? '#ffffff' : '#f9fafb',
                                                    minWidth: columnWidth + 'px',
                                                    maxWidth: columnWidth + 'px',
                                                    width: columnWidth + 'px'
                                                }}
                                            >
                                                {hasContent ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {/* Formateurs */}
                                                        {formateursCell.length > 0 && (
                                                            <div style={{
                                                                padding: '6px',
                                                                background: 'rgba(255, 255, 255, 0.2)',
                                                                borderRadius: '4px',
                                                                border: '1px solid rgba(255, 255, 255, 0.3)'
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: '600',
                                                                    marginBottom: '4px',
                                                                    textAlign: 'center',
                                                                    color: '#1e40af'
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
                                                                    fontWeight: '600',
                                                                    marginBottom: '4px',
                                                                    textAlign: 'center',
                                                                    color: '#059669'
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
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    });
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Statistiques - copie exacte de la V1 */}
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

export default withAuthAdmin(VisualisationPlanningTypeV2);
