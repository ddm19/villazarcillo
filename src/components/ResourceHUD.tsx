import { useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import type { HubConfig, ResourcePanel } from '../lib/types';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabaseClient';
import { resolveAsset } from '../lib/assets';
import { PanelContent } from './PanelContent';
import { QuestJoiner } from './QuestJoiner';
import QuestChatModal from './QuestChatModal';

type ResourceHUDProps = {
  config: HubConfig
  resources: ResourcePanel[]
}

function resourceTitle(resource: ResourcePanel) {
  return resource.title || resource.id
}

const CHEST_ICON = (
  <svg className='resource-hud__chestIcon' width="24" height="24" version="1.1" id="Layer_1" viewBox="0 0 512 512" xmlSpace="preserve">
    <g>
      <g>
        <path d="M109.897,95.06c-41.708,0-78.062,23.355-96.675,57.673H271.9c9.17-22.783,24.151-42.621,43.102-57.673H109.897z" />
      </g>
    </g>
    <g>
      <g>
        <polygon points="196.92,271.197 196.92,312.878 64.892,312.878 64.892,271.197 0,271.197 0,328.87 261.812,328.87 261.812,271.197   " />
      </g>
    </g>
    <g>
      <g>
        <rect y="359.267" width="261.809" height="57.673" />
      </g>
    </g>
    <g>
      <g>
        <path d="M2.18,183.129C0.753,190.186,0,197.484,0,204.956v35.846h64.892v-41.681h132.029v41.681h64.892v-35.846    c0-7.424,0.585-14.713,1.701-21.827H2.18z" />
      </g>
    </g>
    <g>
      <g>
        <rect x="292.204" y="271.2" width="219.792" height="145.737" />
      </g>
    </g>
    <g>
      <g>
        <path d="M402.104,95.06c-60.597,0-109.897,49.299-109.897,109.896v35.846H512v-35.846C512,144.359,462.701,95.06,402.104,95.06z     M454.902,204.955c0-29.113-23.685-52.798-52.798-52.798v-30.396c45.873,0,83.194,37.321,83.194,83.194H454.902z" fill="#D4A93C" />
      </g>
    </g>
    <g>
      <g>
        <path d="M95.288,229.517v52.966h71.237v-52.966H95.288z M146.104,271.226h-30.396v-30.453h30.396V271.226z" />
      </g>
    </g>
  </svg>
);

const CLOSE_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export function ResourceHUD({ config, resources }: ResourceHUDProps) {
  const [activeResource, setActiveResource] = useState<ResourcePanel | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [showQuestJoiner, setShowQuestJoiner] = useState(false)
  const [questToJoin, setQuestToJoin] = useState<string | null>(null)
  const [chatQuest, setChatQuest] = useState<string | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const ledgerRef = useRef<HTMLElement | null>(null)
  useFocusTrap(Boolean(activeResource), drawerRef)
  useFocusTrap(ledgerOpen, ledgerRef)

  const { session } = useUser()

  const pinned = useMemo(() => resources.filter((resource) => resource.pinned !== false), [resources])

  if (resources.length === 0) {
    return null
  }

  const openResource = (resource: ResourcePanel) => {
    setActiveResource(resource)
    setLedgerOpen(false)
  }

  const closeDrawer = () => {
    setActiveResource(null)
    setShowQuestJoiner(false)
    setQuestToJoin(null)
  }

  const openQuestJoiner = (questName: string) => {
    setQuestToJoin(questName)
    setShowQuestJoiner(true)
  }

  const handleJoinQuest = async (playerId: string) => {
    if (!session || !questToJoin) {
      alert('Error inesperado.')
      return
    }

    const { error } = await supabase
      .from('villazarcillo_quest_players')
      .insert({
        quest_name: questToJoin,
        player_id: playerId,
        player_owner: session.user.id,
      })

    if (error) {
      alert('Error al unirse a la misión')
    } else {
      setShowQuestJoiner(false)
      setQuestToJoin(null)
      window.location.reload()
    }
  }

  return (
    <>
      <div className="resource-hud">
        <div className="resource-hud__bar">
          {pinned.map((resource) => (
            <button
              key={resource.id}
              type="button"
              className="resource-chip"
              onClick={() => openResource(resource)}
            >
              {resource.icon && (
                <span className="resource-chip__medallion">
                  <img src={resolveAsset(config.assetsBaseUrl, resource.icon)} alt="" />
                </span>
              )}
              <span className="resource-chip__pill">
                <span className="resource-chip__label">{resourceTitle(resource)}</span>
                {resource.amount && <span className="resource-chip__value"> {resource.amount}</span>}
              </span>
            </button>
          ))}

          <span className="resource-hud__divider" aria-hidden="true" />

          <button
            type="button"
            className={classNames('resource-chip', 'resource-chip--action', {
              'resource-chip--active': ledgerOpen,
            })}
            onClick={() => setLedgerOpen((open) => !open)}
            aria-expanded={ledgerOpen}
            aria-label="Recursos del campamento"
          >
            <span className="resource-chip__medallion">
              {CHEST_ICON}
            </span>
            <span className="resource-chip__pill">
              <span className="resource-chip__label">Recursos</span>
              <span className="resource-chip__value">{resources.length} Tipos</span>
            </span>
          </button>
        </div>
      </div>

      <div
        className={classNames('resource-hud__scrim', { 'resource-hud__scrim--visible': ledgerOpen })}
        aria-hidden={!ledgerOpen}
        onClick={() => setLedgerOpen(false)}
      />

      <aside
        className={classNames('resource-hud__ledger', { 'resource-hud__ledger--open': ledgerOpen })}
        aria-hidden={!ledgerOpen}
        ref={ledgerRef}
      >
        <div className="resource-hud__ledger-header">
          <h2>Recursos del campamento</h2>
          <button type="button" className="resource-hud__ledger-close" onClick={() => setLedgerOpen(false)} aria-label="Cerrar">
            {CLOSE_ICON}
          </button>
        </div>
        <ul className="resource-hud__ledger-list">
          {resources.map((resource) => (
            <li key={resource.id}>
              <button type="button" className="resource-hud__ledger-item" onClick={() => openResource(resource)}>
                {resource.icon && (
                  <span className="resource-hud__ledger-medallion">
                    <img src={resolveAsset(config.assetsBaseUrl, resource.icon)} alt="" />
                  </span>
                )}
                <span className="resource-hud__ledger-info">
                  <span className="resource-hud__ledger-name">{resourceTitle(resource)}</span>
                  {resource.amount && <span className="resource-hud__ledger-amount">{resource.amount}</span>}
                </span>
                <span className="resource-hud__ledger-action-slot" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <aside
        className={classNames('resource-hud__drawer', { 'resource-hud__drawer--open': Boolean(activeResource) })}
        aria-hidden={!activeResource}
        ref={drawerRef}
      >
        <div className="camp-hub__drawer__content">
          {activeResource && !showQuestJoiner && (
            <>
              <div className="camp-hub__drawer-header">
                <h2 className="camp-hub__drawer-title">{resourceTitle(activeResource)}</h2>
                <button type="button" className="camp-hub__drawer-close" onClick={closeDrawer}>
                  <span className="camp-hub__drawer-close-icon" aria-hidden="true">
                    {CLOSE_ICON}
                  </span>
                </button>
              </div>
              <PanelContent
                config={config}
                panel={activeResource}
                onJoinQuest={openQuestJoiner}
                onOpenChat={(quest) => setChatQuest(quest)}
              />
            </>
          )}
          {showQuestJoiner && questToJoin && (
            <QuestJoiner
              questName={questToJoin}
              onJoin={handleJoinQuest}
              onCancel={() => setShowQuestJoiner(false)}
            />
          )}
        </div>
      </aside>

      {chatQuest && (
        <QuestChatModal questName={chatQuest} open={Boolean(chatQuest)} onClose={() => setChatQuest(null)} />
      )}
    </>
  )
}
