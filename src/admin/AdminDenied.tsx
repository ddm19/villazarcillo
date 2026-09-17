export function AdminDenied() {
  return (
    <div className="admin-denied">
      <div className="admin-denied__card">
        <p className="admin-denied__emoji" aria-hidden="true">🥚</p>
        <p>Enhorabuena, has encontrado el easter egg, pero no eres administrador :(</p>
      </div>
    </div>
  )
}
