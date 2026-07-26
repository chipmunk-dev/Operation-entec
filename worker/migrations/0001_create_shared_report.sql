CREATE TABLE IF NOT EXISTS shared_backup_report (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_cooldowns (
  action TEXT PRIMARY KEY CHECK (action IN ('save', 'load')),
  available_at INTEGER NOT NULL
);
