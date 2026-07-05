import React from 'react';

export const tableHeaderStyle: React.CSSProperties = {
  padding: '5px 8px',
  textAlign: 'left',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

export const tableCellStyle: React.CSSProperties = {
  padding: '0 8px',
  height: 'var(--row-height)',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const pageHeaderBreadcrumbStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '2px',
};

export const pageH1Style: React.CSSProperties = {
  fontSize: 'var(--font-size-h1)',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
};

export const primaryButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};

export const secondaryButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 'var(--font-size-sm)',
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

export const inlineFormInputStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: 'var(--font-size-md)',
  padding: '4px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  width: '100%',
};

export const inlineFormLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
};
