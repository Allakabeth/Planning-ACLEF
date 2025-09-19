import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DebugAbsenceOrpheline() {
    const [absences, setAbsences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        analyserAbsences();
    }, []);

    const analyserAbsences = async () => {
        try {
            setLoading(true);
            
            // 1. Récupérer toutes les absences en_attente
            const { data: absencesData, error: absError } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('statut', 'en_attente')
                .order('created_at', { ascending: false });
                
            if (absError) throw absError;
            
            // 2. Récupérer tous les formateurs
            const { data: formateurs, error: formError } = await supabase
                .from('users')
                .select('id, prenom, nom, archive')
                .eq('role', 'formateur');
                
            if (formError) throw formError;
            
            // 3. Identifier les absences orphelines
            const absencesAnalysees = absencesData.map(absence => {
                const formateur = formateurs.find(f => f.id === absence.formateur_id);
                return {
                    ...absence,
                    formateur: formateur,
                    estOrpheline: !formateur
                };
            });
            
            setAbsences(absencesAnalysees);
            
            const orphelines = absencesAnalysees.filter(a => a.estOrpheline);
            setMessage(`✅ Analyse terminée: ${absencesAnalysees.length} absences, ${orphelines.length} orphelines`);
            
        } catch (error) {
            console.error('Erreur:', error);
            setMessage(`❌ Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const supprimerAbsenceOrpheline = async (absenceId) => {
        if (!window.confirm('Supprimer définitivement cette absence orpheline ?')) return;
        
        try {
            setMessage('Suppression en cours...');
            
            const { error } = await supabase
                .from('absences_formateurs')
                .delete()
                .eq('id', absenceId);
                
            if (error) throw error;
            
            setMessage('✅ Absence orpheline supprimée');
            await analyserAbsences(); // Recharger
            
        } catch (error) {
            console.error('Erreur suppression:', error);
            setMessage(`❌ Erreur suppression: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                <h1>🔍 Analyse des absences orphelines...</h1>
            </div>
        );
    }

    const orphelines = absences.filter(a => a.estOrpheline);

    return (
        <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
            <h1>🔍 Debug - Absences Orphelines</h1>
            
            {message && (
                <div style={{
                    padding: '15px',
                    background: message.includes('❌') ? '#fee2e2' : '#d1fae5',
                    color: message.includes('❌') ? '#991b1b' : '#065f46',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}

            <div style={{ marginBottom: '30px' }}>
                <h2>📊 Statistiques</h2>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ padding: '15px', background: 'white', borderRadius: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                            {absences.length}
                        </div>
                        <div>Absences en attente</div>
                    </div>
                    <div style={{ padding: '15px', background: 'white', borderRadius: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                            {orphelines.length}
                        </div>
                        <div>Absences orphelines</div>
                    </div>
                </div>
            </div>

            {orphelines.length > 0 && (
                <>
                    <h2 style={{ color: '#ef4444' }}>❌ Absences Orphelines à Nettoyer</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
                        {orphelines.map(absence => (
                            <div key={absence.id} style={{
                                background: '#fef2f2',
                                border: '2px solid #fecaca',
                                borderRadius: '8px',
                                padding: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                        ID: {absence.id}
                                    </div>
                                    <div>Formateur ID orphelin: <code>{absence.formateur_id}</code></div>
                                    <div>Date: {absence.date_debut} → {absence.date_fin}</div>
                                    <div>Type: {absence.type}</div>
                                    <div>Créé le: {new Date(absence.created_at).toLocaleString()}</div>
                                    {absence.motif && <div>Motif: "{absence.motif}"</div>}
                                </div>
                                <button
                                    onClick={() => supprimerAbsenceOrpheline(absence.id)}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🗑️ Supprimer
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <h2>✅ Toutes les Absences en Attente</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {absences.map(absence => (
                    <div key={absence.id} style={{
                        background: absence.estOrpheline ? '#fef2f2' : 'white',
                        border: `1px solid ${absence.estOrpheline ? '#fecaca' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        padding: '15px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <strong>
                                    {absence.formateur ? 
                                        `${absence.formateur.prenom} ${absence.formateur.nom}` : 
                                        '❌ FORMATEUR INCONNU'
                                    }
                                </strong>
                                <div style={{ fontSize: '14px', color: '#666' }}>
                                    {absence.date_debut} → {absence.date_fin} | {absence.type}
                                </div>
                            </div>
                            <div style={{
                                padding: '4px 12px',
                                background: absence.estOrpheline ? '#fecaca' : '#dbeafe',
                                color: absence.estOrpheline ? '#991b1b' : '#1e40af',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                {absence.estOrpheline ? 'ORPHELINE' : 'OK'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={analyserAbsences}
                style={{
                    marginTop: '30px',
                    padding: '15px 30px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                }}
            >
                🔄 Actualiser
            </button>
        </div>
    );
}