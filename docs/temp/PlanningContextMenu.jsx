import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

function MenuItems({ items, onClose }) {
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState(null);

  return items.map((item, index) => {
    if (item.separator) {
      return <div key={index} className="my-1 border-t border-slate-200" />;
    }

    const hasSubmenu = item.items?.length > 0;

    return (
      <div
        key={index}
        className="relative"
        onMouseEnter={() => setOpenSubmenuIndex(hasSubmenu ? index : null)}
      >
        <button
          type="button"
          onClick={() => {
            if (hasSubmenu) {
              setOpenSubmenuIndex((current) => current === index ? null : index);
              return;
            }
            item.onSelect?.();
            onClose();
          }}
          className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between gap-6 hover:bg-slate-100 transition-colors ${
            item.danger ? 'text-red-600 font-medium' : 'text-slate-700'
          }`}
        >
          <span>{item.label}</span>
          {hasSubmenu ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          {item.badge && !hasSubmenu ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {item.badge}
            </span>
          ) : null}
        </button>

        {hasSubmenu && openSubmenuIndex === index ? (
          <div className="absolute left-full top-[-5px] z-10 min-w-[220px] max-h-[calc(100vh-16px)] overflow-y-auto whitespace-nowrap border border-slate-300 bg-white py-1 text-xs shadow-lg">
            <MenuItems items={item.items} onClose={onClose} />
          </div>
        ) : null}
      </div>
    );
  });
}

export default function PlanningContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ top: y, left: x, visibility: 'hidden' });

  useEffect(() => {
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    setStyle({
      top: Math.max(8, top),
      left: Math.max(8, left),
      visibility: 'visible',
    });
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={style}
      className="fixed z-50 min-w-[170px] whitespace-nowrap bg-white rounded-xs shadow-lg border border-slate-300 py-1 text-xs select-none"
    >
      <MenuItems items={items} onClose={onClose} />
    </div>
  );
}
