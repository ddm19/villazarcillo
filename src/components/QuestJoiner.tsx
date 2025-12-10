import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUser } from '../contexts/UserContext';

type Sheet = {
  id: string;
};

type QuestJoinerProps = {
  questName: string;
  onJoin: (playerId: string) => void;
  onCancel: () => void;
  onQuestJoined?: () => void;
};

export const QuestJoiner = ({ questName, onJoin, onCancel }: QuestJoinerProps) => {
  const { session } = useUser();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSheets = async () => {
      if (!session) return;

      const { data, error } = await supabase
        .from('sheets')
        .select('id')
        .eq('owner', session.user.id);

      if (error) {
        console.error('Error fetching sheets:', error);
      } else {
        setSheets(data as Sheet[]);
        if (data && data.length > 0) {
          setSelectedSheet(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchSheets();
  }, [session]);

  const handleJoin = () => {
    if (selectedSheet) {
      onJoin(selectedSheet);
    }
  };

  if (loading) {
    return <div className="camp-hub__quest-joiner">Cargando tus personajes...</div>;
  }

  if (sheets.length === 0) {
    return (
      <div className="camp-hub__quest-joiner">
        <p>No tienes personajes para unirte a la misión.</p>
        <div className="camp-hub__quest-joiner-actions">
          <button onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="camp-hub__quest-joiner">
      <h4 className="camp-hub__quest-joiner-title">Unirse a la misión: {questName}</h4>
      <p>Selecciona tu personaje:</p>
      <select className="camp-hub__quest-joiner-select" value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}>
        {sheets.map((sheet) => (
          <option key={sheet.id} value={sheet.id}>
            {sheet.id}
          </option>
        ))}
      </select>
      <div className="camp-hub__quest-joiner-actions">
        <button onClick={handleJoin}>Unirse</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
};
