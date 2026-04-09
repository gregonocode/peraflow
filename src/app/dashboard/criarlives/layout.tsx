'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { CircleChevronLeft } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { name: 'Criar Lives', href: '' },
  { name: 'Interações', href: 'interacoes' },
  { name: 'Links', href: 'links' },
];

export default function CriarLivesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const baseUrl = '/dashboard/criarlives';

  const getFullPath = (href: string) => {
    return href ? `${baseUrl}/${href}` : baseUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-lato">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <CircleChevronLeft className="h-5 w-5 mr-2" />
            <span>Voltar para Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Navegação */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <div className="flex space-x-8">
              {navItems.map((item) => {
                const fullPath = getFullPath(item.href);
                const isActive = pathname === fullPath;
                return (
                  <Link
                    key={item.name}
                    href={fullPath}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive
                        ? 'border-[#059669] text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Conteúdo */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}