import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUser } from '../contexts/UserContext';

type ChatMessage = {
    id: string;
    quest_name: string;
    sender_id: string;
    body: string;
    created_at: string;
};

export default function QuestChatModal({ questName, open, onClose }: { questName: string; open: boolean; onClose: () => void }) {
    const { session } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
    const [text, setText] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        let mounted = true;

        const fetchInitial = async () => {
            const { data: msgs, error: msgErr } = await supabase
                .from('villazarcillo_quest_chat_messages')
                .select('*')
                .eq('quest_name', questName)
                .order('created_at', { ascending: true });

            if (!msgErr && mounted) {
                setMessages(msgs ?? []);
            }

            const { data: players, error: playersErr } = await supabase
                .from('villazarcillo_quest_players')
                .select('player_owner, player_id')
                .eq('quest_name', questName);

            if (!playersErr && mounted) {
                const map: Record<string, string> = {};
                (players ?? []).forEach((p: any) => {
                    map[p.player_owner] = p.player_id;
                });
                setPlayersMap(map);
            }
        };

        fetchInitial();

        return () => {
            mounted = false;
        };
    }, [open, questName]);

    useEffect(() => {
        if (!open) return;

        const channel = supabase
            .channel('public:villazarcillo_quest_chat_messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'villazarcillo_quest_chat_messages', filter: `quest_name=eq.${questName}` },
                (payload) => {
                    const newRecord = payload.new as ChatMessage;
                    setMessages((m) => (m.some((x) => x.id === newRecord.id) ? m : [...m, newRecord]));

                    (async () => {
                        const { data: players, error } = await supabase
                            .from('villazarcillo_quest_players')
                            .select('player_owner, player_id')
                            .eq('quest_name', questName)
                            .eq('player_owner', newRecord.sender_id)
                            .limit(1);
                        if (!error && players && players.length > 0) {
                            setPlayersMap((prev) => ({ ...prev, [players[0].player_owner]: players[0].player_id }));
                        }
                    })();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [open, questName]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages, open]);

    const handleSend = async () => {
        if (!session || text.trim() === '') return;

        const { data, error } = await supabase
            .from('villazarcillo_quest_chat_messages')
            .insert({ quest_name: questName, sender_id: session.user.id, body: text.trim() })
            .select()
            .single();

        if (!error && data) {
            setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data as ChatMessage]));
            setText('');
        }
    };

    if (!open) return null;

    return (
        <div className="quest-chat-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="quest-chat-modal" style={{ width: '90%', maxWidth: 720, maxHeight: '80vh', background: 'var(--color-surface)', borderRadius: 'var(--radius-1)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: 'var(--color-text)' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-accent)' }}>Discutir Fecha — {questName}</h3>
                    <button onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-text)' }}>✕</button>
                </header>

                <div ref={containerRef} style={{ padding: 12, overflowY: 'auto', flex: 1, background: 'transparent' }}>
                    {messages.map((m) => (
                        <div key={m.id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-text)' }}>
                                <strong>{playersMap[m.sender_id] ?? m.sender_id}</strong>
                                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text)' }}>{new Date(m.created_at).toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: 4, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 8 }}>{m.body}</div>
                        </div>
                    ))}
                </div>

                <footer style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(0,0,0,0.06)', background: 'transparent' }}>
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button onClick={handleSend} style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', padding: '8px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Enviar
                    </button>
                </footer>
            </div>
        </div>
    );
}
