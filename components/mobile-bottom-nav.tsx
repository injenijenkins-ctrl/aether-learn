'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Layers, Upload, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Add', href: '/ingestion', icon: Upload },
  { label: 'Tutor', href: '/tutor', icon: Wand2 },
  { label: 'Learn', href: '/lessons', icon: BookOpen },
  { label: 'Review', href: '/flashcards', icon: Layers },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:hidden"
      style={{
        background: 'rgba(8,11,17,0.92)',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors',
                active ? 'text-white' : 'text-[#8B9AB0]'
              )}
              style={
                active
                  ? { background: 'rgba(124,106,245,0.16)' }
                  : { background: 'transparent' }
              }
            >
              <item.icon className="h-4 w-4" style={{ color: active ? '#A99BFF' : '#8B9AB0' }} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
