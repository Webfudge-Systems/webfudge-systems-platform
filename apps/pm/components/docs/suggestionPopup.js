/**
 * Small, dependency-free popup for TipTap suggestions (@mentions, #task links).
 * TipTap's examples use tippy.js; a fixed-position div is enough here and keeps the bundle lean.
 *
 * @param {(item: any) => { primary: string, secondary?: string }} describe
 * @param {(item: any) => { id: string, label: string }} toAttrs
 */
export function suggestionPopup(describe, toAttrs) {
  return () => {
    let el = null;
    let items = [];
    let selected = 0;
    let command = null;

    const choose = (index) => {
      const item = items[index];
      if (item && command) command(toAttrs(item));
    };

    const draw = () => {
      if (!el) return;
      el.replaceChildren();
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'px-3 py-2 text-xs text-gray-500';
        empty.textContent = 'No matches';
        el.appendChild(empty);
        return;
      }
      items.forEach((item, index) => {
        const { primary, secondary } = describe(item);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm ${
          index === selected ? 'bg-orange-50 text-orange-900' : 'text-gray-800 hover:bg-gray-50'
        }`;
        const a = document.createElement('span');
        a.className = 'truncate';
        a.textContent = primary;
        btn.appendChild(a);
        if (secondary) {
          const b = document.createElement('span');
          b.className = 'shrink-0 text-xs text-gray-400';
          b.textContent = secondary;
          btn.appendChild(b);
        }
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          choose(index);
        });
        el.appendChild(btn);
      });
    };

    const place = (clientRect) => {
      const rect = typeof clientRect === 'function' ? clientRect() : null;
      if (!el || !rect) return;
      const width = 280;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      el.style.left = `${left}px`;
      el.style.top = `${rect.bottom + 6}px`;
    };

    const sync = (props) => {
      items = props.items || [];
      command = props.command;
      if (selected >= items.length) selected = 0;
      draw();
      place(props.clientRect);
    };

    return {
      onStart(props) {
        el = document.createElement('div');
        el.setAttribute('role', 'listbox');
        el.className = 'fixed z-[1000] w-[280px] max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl';
        document.body.appendChild(el);
        selected = 0;
        sync(props);
      },
      onUpdate(props) {
        sync(props);
      },
      onKeyDown({ event }) {
        if (event.key === 'Escape') {
          el?.remove();
          el = null;
          return true;
        }
        if (!items.length) return false;
        if (event.key === 'ArrowDown') {
          selected = (selected + 1) % items.length;
          draw();
          return true;
        }
        if (event.key === 'ArrowUp') {
          selected = (selected + items.length - 1) % items.length;
          draw();
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          choose(selected);
          return true;
        }
        return false;
      },
      onExit() {
        el?.remove();
        el = null;
      },
    };
  };
}
