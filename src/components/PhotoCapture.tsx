'use client'
import { useState } from 'react'

export default function PhotoCapture() {
  const [photoAdded, setPhotoAdded] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleCapture = () => {
    // Simulate taking a photo or upload
    if (photoAdded) {
      setPhotoAdded(false)
      setPreviewUrl(null)
    } else {
      setPhotoAdded(true)
      // Use a placeholder/mock image or draw a simulator
      setPreviewUrl('/api/placeholder/400/320')
    }
  }

  const handleGalleryClick = () => {
    alert('Abrindo Galeria de Fotos...')
  }

  const handleSendPhoto = () => {
    if (!photoAdded) {
      alert('Tire uma foto ou selecione da galeria primeiro!')
      return
    }
    alert('Foto enviada com sucesso para o relatório!')
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 transition-all duration-300 flex flex-col h-full">
      {/* Header Info */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-wine-50 dark:bg-wine-950/70 flex items-center justify-center text-wine-600 dark:text-wine-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Registro Fotográfico
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500">
            Fotografe e registre sua urticária do dia
          </p>
        </div>
      </div>

      {/* Visor / Viewfinder Area */}
      <div className="relative flex-1 min-h-[240px] sm:min-h-[280px] bg-gray-950 dark:bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center border border-gray-800 shadow-inner group">
        
        {/* Decorative corner brackets inside viewfinder */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-wine-500/80 rounded-tl-sm pointer-events-none transition-all duration-300 group-hover:scale-110" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-wine-500/80 rounded-tr-sm pointer-events-none transition-all duration-300 group-hover:scale-110" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-wine-500/80 rounded-bl-sm pointer-events-none transition-all duration-300 group-hover:scale-110" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-wine-500/80 rounded-br-sm pointer-events-none transition-all duration-300 group-hover:scale-110" />

        {photoAdded ? (
          /* Simulated image capture state */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center p-3 animate-scale-in">
            {/* Viewfinder outer ring grid overlay */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black" />
            <div className="w-full h-full border-2 border-dashed border-wine-500/40 rounded-lg flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm relative overflow-hidden">
              {/* Center icon / preview state */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-wine-500/20 flex items-center justify-center text-wine-400">
                  <svg className="w-6 h-6 animate-pulse-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs text-wine-300 font-semibold uppercase tracking-wider">
                  Foto Capturada
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  urticaria_06072026_1432.jpg
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Idle camera simulator state */
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 select-none">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-gray-500 border border-gray-800 transition-transform duration-300 group-hover:scale-105">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Nenhuma foto selecionada</p>
              <p className="text-[10px] text-gray-650 mt-1 max-w-[200px]">
                Toque no botão disparador abaixo para simular a captura de uma imagem da lesão.
              </p>
            </div>
          </div>
        )}

        {/* Floating timestamp badge Overlay */}
        <div className="absolute bottom-4 px-3.5 py-1.5 rounded-lg bg-black/70 border border-wine-500/30 text-wine-400 text-[10px] sm:text-xs font-mono tracking-wider backdrop-blur-sm z-20">
          Registro de Urticária | 06/07/2026 às 14:32
        </div>
      </div>

      {/* Shutter / Bottom Controls Panel */}
      <div className="mt-4 flex items-center justify-between gap-4 px-2">
        {/* Gallery */}
        <button
          onClick={handleGalleryClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-850 text-gray-600 dark:text-gray-400 text-xs font-semibold transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Galeria
        </button>

        {/* Main Disparo Shutter Button */}
        <button
          onClick={handleCapture}
          aria-label="Disparador da câmera"
          className={`
            relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-md
            ${photoAdded
              ? 'bg-rose-600 ring-4 ring-rose-200 dark:ring-rose-950'
              : 'bg-wine-800 ring-4 ring-wine-100 dark:ring-wine-950'
            }
          `}
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Send Action */}
        <button
          onClick={handleSendPhoto}
          disabled={!photoAdded}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 border
            ${photoAdded
              ? 'bg-wine-50 border-wine-200 text-wine-700 hover:bg-wine-100 dark:bg-wine-950/40 dark:border-wine-800 dark:text-wine-300 cursor-pointer'
              : 'bg-gray-50 border-gray-200 text-gray-350 dark:bg-gray-900 dark:border-gray-850 dark:text-gray-650 cursor-not-allowed'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Enviar
        </button>
      </div>
    </div>
  )
}
