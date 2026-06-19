'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

export default function PhotoCapture() {
  // --- STATE MANAGEMENT ---
  // stream: Guarda a referência do MediaStream da câmera para podermos parar a gravação depois (economia de hardware).
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  // capturedImage: Armazena a string Base64 (DataURL) da imagem gerada pelo Canvas.
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  
  // cameraError: Gerencia mensagens de erro caso o usuário negue permissão ou falte hardware.
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  // isCapturing: Booleano auxiliar para saber se a câmera está rodando no momento (substitui antigo cameraActive).
  const [isCapturing, setIsCapturing] = useState(false)
  
  // timestamp: Texto gerado no momento da captura para colocar no Canvas de forma fixa e não-recalculada a cada microsegundo.
  const [timestamp, setTimestamp] = useState('')

  // isMobile: Detecta se o dispositivo é mobile para esconder visor de vídeo e botão de disparo.
  const [isMobile, setIsMobile] = useState(false)

  // --- REFS ---
  // Refs são fundamentais aqui para acessar os elementos DOM reais (vídeo, canvas e input) sem causar re-renders desnecessários.
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Ref para guardar o stream atual sem depender do state (evita stale closures no cleanup)
  const streamRef = useRef<MediaStream | null>(null)

  // --- DETECÇÃO MOBILE / DESKTOP ---
  useEffect(() => {
    const checkMobile = () => {
      // Verificação dupla: largura da tela + UserAgent para cobrir tablets e celulares
      const widthCheck = window.innerWidth < 768
      const uaCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      setIsMobile(widthCheck || uaCheck)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Função utilitária para formatar a data atual consistentemente. Memoizada com useCallback.
  const getFormattedDateTime = useCallback(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    return `${dateStr} às ${timeStr}`
  }, [])

  // Inicializar câmera apenas no Desktop quando o componente for montado.
  useEffect(() => {
    setTimestamp(getFormattedDateTime())

    // Só inicia câmera automaticamente no Desktop
    if (!isMobile) {
      startCamera()
    }
    
    return () => {
      // Cleanup function: Sempre pare a câmera quando o componente for desmontado para evitar memory leaks!
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // Real-time clock para a marca d'água
  useEffect(() => {
    // Só atualiza o relógio se a câmera estiver viva e nenhuma foto foi tirada
    if (!isCapturing || capturedImage) return

    const interval = setInterval(() => {
      setTimestamp(getFormattedDateTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [isCapturing, capturedImage, getFormattedDateTime])

  // --- 1. LÓGICA DE CÂMERA UNIVERSAL ---
  const startCamera = async () => {
    try {
      setCameraError(null)
      // Se já houver um stream ativo, pare-o antes de tentar abrir um novo.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      let mediaStream: MediaStream
      try {
        // Tenta forçar a câmera traseira primeiro (Mobile)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
      } catch {
        // Fallback robusto para Desktop ou dispositivos sem câmera mapeada como 'environment'
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
      }
      
      streamRef.current = mediaStream
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsCapturing(true)
    } catch (err: unknown) {
      console.error('Erro ao acessar a câmera:', err)
      // Tratamento de erro resiliente: fornece feedback claro caso o usuário negue permissão ou use Desktop sem webcam.
      setCameraError('Permissão negada ou câmera não encontrada. Por favor, verifique as configurações.')
      setIsCapturing(false)
    }
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsCapturing(false)
  }, [])

  const handleVideoReady = () => {
    if (videoRef.current) {
      // Força o ajuste de resolução (resize) e o play para contornar tela preta no iOS
      videoRef.current.play().catch(e => console.error('Erro no autoPlay:', e))
    }
  }

  // --- 2. CAPTURA E PROCESSAMENTO (CANVAS) ---
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, customTime?: string) => {
    const timeText = customTime || getFormattedDateTime()
    const fullText = `Registro de Urticária | ${timeText}`

    // Posições da "moldura" (texto no rodapé da foto)
    const bannerHeight = 46
    const bannerY = height - bannerHeight - 20
    
    // Configurações do texto e moldura estrita conforme o design
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)' 
    ctx.font = 'bold 16px Inter, sans-serif'
    const bannerWidth = ctx.measureText(fullText).width + 100 // Margem extra para o background
    const bannerX = (width - bannerWidth) / 2
    
    // Desenha o bloco semitransparente para dar contraste ao texto
    ctx.beginPath()
    if (ctx.roundRect) {
        ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8)
    } else {
        ctx.rect(bannerX, bannerY, bannerWidth, bannerHeight)
    }
    ctx.fill()

    // Renderização do texto no Canvas com a cor especificada (#e5498a)
    ctx.fillStyle = '#e5498a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Desenhamos exatamente no meio vertical e horizontal do banner overlay
    ctx.fillText(fullText, width / 2, bannerY + (bannerHeight / 2))
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Passo Crítico 1: Igualamos as dimensões do <canvas> invisível à resolução real do <video>.
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    // Passo Crítico 2: Copia o frame atual do elemento <video> de fato "pinta" no <canvas>.
    ctx.drawImage(video, 0, 0, width, height)

    // Passo Crítico 3: Aplica o overlay do timestamp no frame desenhado no canvas.
    const captureTime = getFormattedDateTime()
    setTimestamp(captureTime)
    drawWatermark(ctx, width, height, captureTime)

    // Passo Crítico 4: Converte o canvas finalizado para uma Data URL Base64 que pode ser exibida no <img> ou baixada.
    const dataUrl = canvas.toDataURL('image/png')
    setCapturedImage(dataUrl)
    
    // CORREÇÃO DO BUG: Desliga IMEDIATAMENTE o stream da webcam após captura.
    // Isso impede o congelamento porque liberamos o hardware da câmera.
    stopCamera()
  }

  // Botão "Tirar outra foto": limpa o estado e reinicia a câmera do zero
  const handleRetake = () => {
    setCapturedImage(null)
    setTimestamp(getFormattedDateTime())
    startCamera()
  }

  // --- 3. INTEGRAÇÃO COM GALERIA ---
  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Lemos a imagem nativa selecionada de forma assíncrona
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        if (!canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Fallback e Resize: Mantemos um limite de tamanho (ex: 1024px) para evitar DataUrls imensas de fotos 4K
        const maxDim = 1024
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        // Reutilizamos a pipeline de canvas: desenhamos a foto upada e em seguida o watermark.
        ctx.drawImage(img, 0, 0, width, height)

        const uploadTime = getFormattedDateTime()
        setTimestamp(uploadTime)
        drawWatermark(ctx, width, height, uploadTime)

        // Salva e reflete na UI a foto processada.
        const dataUrl = canvas.toDataURL('image/png')
        setCapturedImage(dataUrl)
        stopCamera() // Interrompe câmera se estiver ativa.
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)

    // Reset do input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  const triggerGallerySelector = () => {
    // Interação programática: Dispara clique invisível no input file quando usuário clica no botão bonito.
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // --- 4. AÇÕES DE ENVIO E DOWNLOAD ---
  const handleSendPhoto = async () => {
    if (!capturedImage) return

    try {
      // Precisamos converter a string Base64 (DataURL) de volta para um Blob/File binário para usar na API de compartilhamento nativa.
      const res = await fetch(capturedImage)
      const blob = await res.blob()
      const file = new File([blob], `urticaria_${Date.now()}.png`, { type: 'image/png' })

      // Progressively Enhancement: Detecta se a Web Share API é suportada no navegador atual (comum em Mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Registro de Urticária',
          text: `Acompanhamento diário do Urticaria Tracker. Data: ${timestamp}`
        })
      } else {
        // Fallback: Desktop comum ou browser que não suporta Share.
        // Simulamos o clique em uma âncora escondida para disparar download nativo do arquivo .png.
        forceDownload(capturedImage, `urticaria_${Date.now()}.png`)
      }
    } catch (error) {
      console.error('Falha ao compartilhar imagem:', error)
      // Safety net: em caso de cancelamento da share tray ou outro erro imprevisto, fazemos o fallback de download seguro.
      forceDownload(capturedImage, `urticaria_${Date.now()}.png`)
    }
  }

  // Utilitário simples para disparar downloads locais via browser
  const forceDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- 5. INTERFACE E ESTILIZAÇÃO (TAILWIND) ---
  return (
    // Componente wrapper com as lógicas responsivas de altura cheia flex-col. Consistente com cores do app e classes explícitas (rounded-lg, border-zinc-800)
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-rose-100 dark:border-zinc-800 shadow-sm p-4 sm:p-5 transition-all duration-300 flex flex-col h-full">
      {/* Input de arquivo nativo escondido por debaixo do tapete (Integration with Gallery) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleGalleryFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header e títulos informativos */}
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
            {isMobile
              ? 'Tire uma foto ou escolha da galeria'
              : 'Fotografe e registre sua urticária do dia'}
          </p>
        </div>
      </div>

      {/* ============================================= */}
      {/* LAYOUT MOBILE: Apenas botão Galeria, sem visor */}
      {/* ============================================= */}
      {isMobile && (
        <div className="flex-1 flex flex-col">
          {/* Renderizador de Imagens Invisível (Canvas) — necessário para watermark */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Preview da foto capturada/selecionada */}
          {capturedImage ? (
            <div className="relative flex-1 min-h-[260px] bg-zinc-950 dark:bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center border border-zinc-800 shadow-inner mb-4">
              <img
                src={capturedImage}
                alt="Registro de Urticária Capturado"
                className="absolute inset-0 w-full h-full object-cover animate-scale-in"
              />
            </div>
          ) : (
            <div className="flex-1 min-h-[200px] bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center mb-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-wine-50 dark:bg-wine-950/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-wine-500 dark:text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center px-4">
                Toque no botão abaixo para tirar uma foto<br />ou escolher da sua galeria
              </p>
            </div>
          )}

          {/* Botões Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={triggerGallerySelector}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-wine-700 hover:bg-wine-800 text-white text-sm font-bold transition-all duration-150 shadow-md active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {capturedImage ? 'Trocar foto' : 'Tirar foto / Galeria'}
            </button>

            {capturedImage && (
              <button
                onClick={handleSendPhoto}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all duration-150 shadow-md active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Enviar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* LAYOUT DESKTOP: Visor de câmera + controles    */}
      {/* ============================================== */}
      {!isMobile && (
        <>
          {/* Viewfinder / Visor da Câmera responsivo */}
          <div className="relative flex-1 min-h-[260px] sm:min-h-[300px] bg-zinc-950 dark:bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center border border-zinc-800 shadow-inner group">
            
            {/* Renderizador de Imagens Invisível */}
            <canvas ref={canvasRef} className="hidden" />

            {/* FEED VIVO DA CÂMERA */}
            {isCapturing && !capturedImage && !cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline // Fundamental: Impede o Safari no iOS de forçar o player nativo em full screen indesejável
                muted
                onLoadedMetadata={handleVideoReady}
                className="absolute inset-0 w-full h-full object-cover animate-fade-in"
              />
            )}

            {/* FOTO CAPTURADA FINALIZADA (Base64 Overlay) */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Registro de Urticária Capturado"
                className="absolute inset-0 w-full h-full object-cover animate-scale-in z-10"
              />
            )}

            {/* ESTADO DE ERRO & UI DE RECARREGAMENTO */}
            {!isCapturing && !capturedImage && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                {cameraError ? (
                  <div className="flex flex-col items-center">
                    <div className="text-rose-500 bg-rose-500/10 p-3 rounded-lg mb-3">
                      <p className="text-xs font-semibold">{cameraError}</p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="text-[11px] px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md font-medium transition-colors border border-zinc-700"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                ) : (
                   <div className="flex flex-col items-center">
                     <p className="text-xs text-zinc-400 animate-pulse">Acessando câmera nativa...</p>
                   </div>
                )}
              </div>
            )}
            
            {/* Dica da Watermark: só aparece para o usuário enxergar e se posicionar durante o vídeo vivo */}
            {!capturedImage && !cameraError && isCapturing && (
                 <div className="absolute bottom-4 px-3.5 py-1.5 rounded-lg bg-black/80 border border-wine-500/30 text-[#e5498a] text-[10px] sm:text-xs font-mono tracking-wider backdrop-blur-sm z-20 pointer-events-none">
                   Registro de Urticária | {timestamp}
                 </div>
            )}
          </div>

          {/* PAINEL DE CONTROLES INFERIORES — DESKTOP */}
          <div className="mt-4 flex items-center justify-between gap-4 px-2">
            {/* Botão de acessar Input de Galeria */}
            <button
              onClick={triggerGallerySelector}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all duration-150 hover:scale-[1.03]"
            >
              <svg className="w-4 h-4 text-wine-600 dark:text-wine-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Galeria
            </button>

            {/* Botão Central: Disparador (apenas quando câmera ativa, sem foto capturada) */}
            {!capturedImage && (
              <button
                onClick={handleCapture}
                disabled={!isCapturing}
                aria-label="Capturar foto"
                className={`
                  relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md z-30
                  ${isCapturing
                    ? 'bg-wine-700 hover:bg-wine-800 ring-4 ring-wine-100 dark:ring-wine-950/60 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-zinc-600 ring-4 ring-zinc-300 dark:ring-zinc-700 cursor-not-allowed opacity-50'
                  }
                `}
              >
                {/* Ícone de câmera SVG limpo e centralizado */}
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}

            {/* Botão "Tirar outra foto" — aparece SOMENTE quando já existe uma foto capturada */}
            {capturedImage && (
              <button
                onClick={handleRetake}
                className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md z-30 bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-100 dark:ring-rose-950/60 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Tirar outra foto"
                title="Tirar outra foto"
              >
                {/* Ícone de refresh/retry */}
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
                </svg>
              </button>
            )}

            {/* Ação de Enviar Nativo ou Download Fallback */}
            <button
              onClick={handleSendPhoto}
              disabled={!capturedImage}
              className={`
                flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 border
                ${capturedImage
                  ? 'bg-wine-700 hover:bg-wine-800 text-white border-wine-600 shadow-md cursor-pointer hover:scale-[1.03]'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-750 dark:text-zinc-650 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Enviar
            </button>
          </div>

          {/* Label textual "Tirar outra foto" abaixo dos controles quando há foto */}
          {capturedImage && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={handleRetake}
                className="text-xs text-wine-600 dark:text-wine-400 hover:text-wine-800 dark:hover:text-wine-300 font-semibold underline underline-offset-2 transition-colors"
              >
                ↻ Tirar outra foto
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
