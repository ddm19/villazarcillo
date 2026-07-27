import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useNavigate } from 'react-router-dom';
import type { HubConfig, Panel } from '../lib/types';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';
import { TableView } from './TableView';
import { renderMarkdownContent } from '../lib/markdownRenderer';
import { resolveAsset } from '../lib/assets';

type PanelContentProps = {
  config: HubConfig
  panel?: Panel,
  onJoinQuest: (questName: string) => void
  onOpenChat: (questName: string) => void
}

function FullScreenImage({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <>
      <div className='fullscreen_close'>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>

      <div className="fullscreen-modal" onClick={onClose}>
        <img src={src} alt="" />
      </div>
    </>
  )
}

export function PanelContent({ config, panel, onJoinQuest, onOpenChat }: PanelContentProps) {
  const { session } = useUser()
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)

  const navigate = useNavigate();

  function reconnect() {
    navigate(0);
  }

  const handleLeaveQuest = async (playerId: string) => {
    if (!session) {
      alert('Error inesperado.');
      return;
    }
    const { error } = await supabase
      .from('villazarcillo_quest_players')
      .delete()
      .eq('player_id', playerId)
      .eq('player_owner', session.user.id);

    if (error) {
      alert('Error al salir de la misión ');
    } else {
      window.location.reload();
    }
  };

  if (!panel) {
    return (
      <div className="camp-hub__panel-content">
        <p className="camp-hub__panel-text">No hay información disponible para este elemento.</p>
      </div>
    )
  }

  if (panel.type === 'markdown') {
    const portraitUrl = panel.portrait ? resolveAsset(config.assetsBaseUrl, panel.portrait) : undefined;
    return (
      <div className="camp-hub__panel-content">
        {portraitUrl && (
          <div className="camp-hub__panel-portrait" onClick={() => setFullScreenImage(portraitUrl)}>
            <img src={portraitUrl} alt="" />
          </div>
        )}
        {fullScreenImage === portraitUrl && portraitUrl && (
          <FullScreenImage src={portraitUrl} onClose={() => setFullScreenImage(null)} />
        )}
        <div className="camp-hub__panel-text camp-hub__markdown">
          {renderMarkdownContent(panel.content)}
        </div>
        {panel.questPlayers && panel.questPlayers.length > 0 && (
          <div className="camp-hub__quest-players">
            <h4>Aventureros apuntados:</h4>
            <ul>
              {panel.questPlayers.map((player) => (
                <li className="camp-hub__quest-player" key={player.playerId}>{player.playerId}</li>
              ))}
            </ul>
          </div>
        )}
        {panel.cta && panel.cta.quest && session && (
          <div className="camp-hub__cta-row">
            <button className="camp-hub__badge" onClick={() => onJoinQuest(panel.cta!.quest!)}>
              Unirse a la misión
            </button>
            {panel.questPlayers && session && panel.questPlayers.some((p) => p.playerOwner === session.user.id) && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discutir Fecha
              </button>
            )}
          </div>
        )}
        {session == null && panel.cta ? <><span>Hay un problema con la sesión</span> <button onClick={reconnect}>Intentar conectar de nuevo</button></> : null}
        {panel.cta && !panel.questPlayers && !session && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    );
  }

  if (panel.type === 'table') {
    const portraitUrl = panel.portrait ? resolveAsset(config.assetsBaseUrl, panel.portrait) : undefined;
    return (
      <div className="camp-hub__panel-content">
        {portraitUrl && (
          <div className="camp-hub__panel-portrait" onClick={() => setFullScreenImage(portraitUrl)}>
            <img src={portraitUrl} alt="" />
          </div>
        )}
        {fullScreenImage === portraitUrl && portraitUrl && (
          <FullScreenImage src={portraitUrl} onClose={() => setFullScreenImage(null)} />
        )}
        {panel.title || panel.subtitle ? (
          <header>
            {panel.title && <h3>{panel.title}</h3>}
            {panel.subtitle && (
              <div className="camp-hub__markdown">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{panel.subtitle}</ReactMarkdown>
              </div>
            )}
          </header>
        ) : null}
        <TableView columns={panel.columns} rows={panel.rows} />
        {panel.questPlayers && panel.questPlayers.length > 0 && (
          <div className="camp-hub__quest-players">
            <h4>Aventureros apuntados:</h4>
            <ul>
              {panel.questPlayers.map((player) => (
                <li className="camp-hub__quest-player" key={player.playerId}>{player.playerId}</li>
              ))}
            </ul>
          </div>
        )}
        {panel.cta && panel.cta.quest && session && (
          <div className="camp-hub__cta-row">
            <button className="camp-hub__badge" onClick={() => onJoinQuest(panel.cta!.quest!)}>
              Unirse a la misión
            </button>
            {panel.questPlayers && session && panel.questPlayers.some((p) => p.playerOwner === session.user.id) && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discutir Fecha
              </button>
            )}
          </div>
        )}
        {session == null ? <><span>Hay un problema con la sesión</span> <button onClick={reconnect}>Intentar conectar de nuevo</button></> : null}
        {panel.cta && !panel.questPlayers && !session && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    );
  }

  if (panel.type === 'image') {
    const imageUrl = resolveAsset(config.assetsBaseUrl, panel.image)
    return (
      <div className="camp-hub__panel-content">
        {panel.title && (
          <header>
            <h3>{panel.title}</h3>
          </header>
        )}

        <div className="camp-hub__panel-image" onClick={() => setFullScreenImage(imageUrl)}>
          <img src={imageUrl} alt="" />
        </div>

        {fullScreenImage === imageUrl && (
          <FullScreenImage src={imageUrl} onClose={() => setFullScreenImage(null)} />
        )}
        {panel.questPlayers && panel.questPlayers.length > 0 && (
          <div className="camp-hub__quest-players">
            <h4>Aventureros apuntados:</h4>
            <ul>
              {panel.questPlayers.map((player) => (
                <li className="camp-hub__quest-player" key={player.playerId}>{player.playerId} {player.playerOwner == session?.user.id && <span className="camp-hub__quest-player-remove" onClick={() => {
                  handleLeaveQuest(player.playerId);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" >
                    <polyline points="40 44 40 56 8 56 8 8 40 8 40 20" />
                    <polyline points="48 40 56 32 48 24" />
                    <line x1="28" y1="32" x2="56" y2="32" />
                  </svg>
                </span>}</li>
              ))}
            </ul>
          </div>
        )}
        {panel.cta && panel.cta.quest && session && (
          <div className="camp-hub__cta-row">
            <button className="camp-hub__badge" onClick={() => onJoinQuest(panel.cta!.quest!)}>
              Unirse a la misión
            </button>
            {(panel.questPlayers && session && panel.questPlayers.some((p) => p.playerOwner === session.user.id)) && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Discutir Fecha
              </button>
            )}
            {(panel.questPlayers && session && session?.user?.app_metadata?.role === 'admin') && (
              <button className="camp-hub__badge camp-hub__chat-button" onClick={() => onOpenChat(panel.cta!.quest!)} aria-label="Discutir Fecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ver Chat
              </button>
            )}

          </div>
        )}
        {session == null ? <><span>Hay un problema con la sesión</span> <button onClick={reconnect}>Intentar conectar de nuevo</button></> : null}
        {panel.cta && !panel.questPlayers && !session && (
          <a className="camp-hub__badge" href={panel.cta.href} target="_blank" rel="noreferrer">
            {panel.cta.label}
          </a>
        )}
      </div>
    )
  }

  return null
}
