'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

export interface NavGroup {
  /** Omit for the ungrouped items at the top of the sidebar. */
  title?: string;
  items: NavItem[];
}

interface SidebarShellProps {
  groups: NavGroup[];
  active: string;
  onSelect: (id: string) => void;
  title: string;
  subtitle?: string;
  accountName: string;
  accountEmail: string;
  /** Names the module under the brand, e.g. "Admin", "Dropshipper", "Supplier". */
  moduleLabel: string;
  backHref?: string;
  backLabel?: string;
  /** Right side of the top toolbar: balances, status chips, a link to the live store. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * macOS-style source-list sidebar plus a content pane with a large title. Shared by the admin,
 * dropshipper and supplier consoles (styles live under .apple-admin in globals.css).
 * Sidebar can be hidden (persisted), and becomes a slide-over drawer on narrow screens.
 */
export const SidebarShell: React.FC<SidebarShellProps> = ({
  groups,
  active,
  onSelect,
  title,
  subtitle,
  accountName,
  accountEmail,
  moduleLabel,
  backHref = '/marketplace',
  backLabel = 'Back to marketplace',
  toolbar,
  children,
}) => {
  const [hidden, setHidden] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem('app-sidebar-hidden') === '1');
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  const toggleHidden = () => {
    setHidden((h) => {
      try { localStorage.setItem('app-sidebar-hidden', h ? '0' : '1'); } catch { /* ignore */ }
      return !h;
    });
  };

  const choose = (id: string) => {
    onSelect(id);
    setDrawer(false);
  };

  const sidebar = (
    <nav aria-label={`${moduleLabel} sections`} className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
            Localdropshipping<span className="text-[#f04438]">gh</span>
          </p>
          <p className="text-[12px] text-[#6e6e73]">{moduleLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="admin-icon-btn inline-flex md:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <div key={g.title ?? `g${gi}`} className={gi === 0 ? '' : 'mt-5'}>
            {g.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">{g.title}</p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.icon;
                const on = it.id === active;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => choose(it.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`admin-nav-item ${on ? 'is-active' : ''}`}
                    >
                      <Icon size={17} className={on ? 'text-[#f04438]' : 'text-[#6e6e73]'} />
                      <span className="flex-1 truncate text-left">{it.label}</span>
                      {it.badge ? (
                        <span className="min-w-[20px] rounded-full bg-[#f04438] px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
                          {it.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[#e5e5ea] px-4 py-3">
        <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{accountName}</p>
        <p className="truncate text-[12px] text-[#6e6e73]">{accountEmail}</p>
        <Link href={backHref} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#d92d20] hover:underline">
          <ArrowLeft size={14} /> {backLabel}
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="apple-admin flex min-h-screen bg-white text-[#1d1d1f]">
      {/* Desktop sidebar */}
      {!hidden && (
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-[#e5e5ea] bg-[#f5f5f7] md:block">
          {sidebar}
        </aside>
      )}

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={`${moduleLabel} menu`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] bg-[#f5f5f7] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-[#e5e5ea] bg-white/95 px-4">
          <button type="button" onClick={() => setDrawer(true)} className="admin-icon-btn inline-flex md:hidden" aria-label="Open menu">
            <Menu size={18} />
          </button>
          <button
            type="button"
            onClick={toggleHidden}
            className="admin-icon-btn hidden md:inline-flex"
            aria-label={hidden ? 'Show sidebar' : 'Hide sidebar'}
            title={hidden ? 'Show sidebar' : 'Hide sidebar'}
          >
            {hidden ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1d1d1f]">{title}</span>
          {toolbar && <div className="flex shrink-0 items-center gap-3 text-[13px]">{toolbar}</div>}
        </div>

        <main className="mx-auto max-w-[1100px] px-5 pb-16 pt-8 sm:px-8">
          <header className="mb-6">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-[#6e6e73]">{subtitle}</p>}
          </header>
          <div className="space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
};
