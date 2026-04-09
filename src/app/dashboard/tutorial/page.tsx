'use client';

import { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';

export default function TutorialPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="font-lato min-h-screen bg-[#F3F4F8] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1e1e1e] mb-4 text-center">
          Aprenda a Criar Lives de Impacto para Mais Resultados
        </h1>
        <p className="text-lg text-gray-600 mb-12 text-center">
          Domine a arte de criar Call lives  e impulsione suas vendas no mercado digital com nossos tutoriais práticos!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <div
            className="bg-white p-6 rounded-lg shadow-md relative overflow-hidden transition-transform transform hover:scale-105"
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-40 bg-gray-200 rounded-md mb-4 overflow-hidden">
              {hoveredCard === 1 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#059669]/80 transition-opacity">
                  <PlayIcon className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-[#1e1e1e] mb-2">Tutorial 1</h3>
            <p className="text-gray-600 text-sm">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="bg-white p-6 rounded-lg shadow-md relative overflow-hidden transition-transform transform hover:scale-105"
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-40 bg-gray-200 rounded-md mb-4 overflow-hidden">
              {hoveredCard === 2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#059669]/80 transition-opacity">
                  <PlayIcon className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-[#1e1e1e] mb-2">Tutorial 2</h3>
            <p className="text-gray-600 text-sm">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="bg-white p-6 rounded-lg shadow-md relative overflow-hidden transition-transform transform hover:scale-105"
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-40 bg-gray-200 rounded-md mb-4 overflow-hidden">
              {hoveredCard === 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#059669]/80 transition-opacity">
                  <PlayIcon className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-[#1e1e1e] mb-2">Tutorial 3</h3>
            <p className="text-gray-600 text-sm">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </div>

        <div className="text-center">
          <a
            href="#"
            className="inline-block px-6 py-3 bg-[#059669] text-white rounded-md text-sm font-medium hover:bg-[#065F46] transition-colors"
          >
            Veja Mais Tutoriais
          </a>
        </div>
      </div>
    </div>
  );
}