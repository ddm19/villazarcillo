import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUser } from '../contexts/UserContext';

type ChatMessage = {
    id: string;
    quest_name: string;
    sender_id: string;
    sender_name?: string;
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

        const senderName = (session.user as any).user_metadata?.name ?? session.user.email ?? session.user.id;

        const { data, error } = await supabase
            .from('villazarcillo_quest_chat_messages')
            .insert({ quest_name: questName, sender_id: session.user.id, sender_name: senderName, body: text.trim() })
            .select()
            .single();

        if (!error && data) {
            setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data as ChatMessage]));
            setText('');
        }
    };

    if (!open) return null;

    return (
        <div className="quest-chat-modal-overlay">
            <div className="quest-chat-modal">
                <header className="quest-chat-header">
                    <h3 className="quest-chat-title">Discutir Fecha — {questName}</h3>
                    <button className="quest-chat-close" onClick={onClose} aria-label="Cerrar">✕</button>
                </header>

                <div ref={containerRef} className="quest-chat-messages">
                    {messages.map((m) => (
                        <div key={m.id} className="quest-chat-message">
                            <div className="quest-chat-meta">
                                <strong className="quest-chat-sender">{playersMap[m.sender_id] ?? m.sender_name ?? m.sender_id}</strong>
                                <span className="quest-chat-time">{new Date(m.created_at).toLocaleString()}</span>
                            </div>
                            <div className="quest-chat-body">{m.body}</div>
                        </div>
                    ))}
                </div>

                <footer className="quest-chat-footer">
                    <input
                        className="quest-chat-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button className="quest-chat-send" onClick={handleSend} aria-label="Enviar mensaje">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="quest-chat-send-label">Enviar</span>
                    </button>
                </footer>
            </div>
        </div>
    );
}
