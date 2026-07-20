// Shared action -> color map for every log view that renders an audit
// action keyword (System Log, Study Log, Audit Trail, Study Overview's
// recent-activity feed) - one place so the keywords read consistently
// no matter which page they show up on.
export const ACTION_COLORS: Record<string, string> = {
  INSERT: 'var(--status-insert)',
  UPDATE: 'var(--status-update)',
  DELETE: 'var(--status-dropped)',
  SOFT_DELETE: 'var(--status-warning)',
  ROLE_CHANGE: 'var(--status-sign)',
  STATUS_CHANGE: 'var(--status-pending)',
  SIGN_OFF: 'var(--status-sign)',
  // LOCK/UNLOCK get their own distinct colors (rather than muted/secondary
  // text tones) so they stand out as state-changing actions the same way
  // DELETE and SIGN_OFF already do.
  LOCK: 'var(--status-warning)',
  UNLOCK: 'var(--status-active)',
};
