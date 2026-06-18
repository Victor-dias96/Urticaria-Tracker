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
  
  // cameraActive: Booleano auxiliar para saber se a câmera está rodando no momento.
  const [cameraActive, setCameraActive] = useState(false)
  
  // timestamp: Texto gerado no momento da captura para colocar no Canvas de forma fixa e não-recalculada a cada microsegundo.
  const [timestamp, setTimestamp] = useState('')

  // --- REFS ---
  // Refs são fundamentais aqui para acessar os elementos DOM reais (vídeo, canvas e input) sem causar re-renders desnecessários.
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função utilitária para formatar a data atual consistentemente. Memoizada com useCallback.
  const getFormattedDateTime = useCallback(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    return `${dateStr} às ${timeStr}`
  }, [])

  // Inicializar câmera quando o componente for montado e garantir limpeza no unmount.
  useEffect(() => {
    setTimestamp(getFormattedDateTime())
    startCamera()
    
    return () => {
      // Cleanup function: Sempre pare a câmera quando o componente for desmontado para evitar memory leaks!
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Dependências vazias para rodar apenas no mount

  // Real-time clock para a marca d'água
  useEffect(() => {
    // Só atualiza o relógio se a câmera estiver viva e nenhuma foto foi tirada
    if (!cameraActive || capturedImage) return

    const interval = setInterval(() => {
      setTimestamp(getFormattedDateTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [cameraActive, capturedImage, getFormattedDateTime])

  // --- 1. LÓGICA DE CÂMERA UNIVERSAL ---
  const startCamera = async () => {
    try {
      setCameraError(null)
      // Se já houver um stream ativo, pare-o antes de tentar abrir um novo.
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      // getUserMedia solicita permissão ao usuário. 
      // facingMode: 'environment' prioriza a câmera traseira de alta resolução em celulares.
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraActive(true)
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err)
      // Tratamento de erro resiliente: fornece feedback claro caso o usuário negue permissão ou use Desktop sem webcam.
      setCameraError('Permissão negada ou câmera não encontrada. Por favor, verifique as configurações.')
      setCameraActive(false)
    }
  }

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraActive(false)
  }, [stream])

  // --- 2. CAPTURA E PROCESSAMENTO (CANVAS) ---
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, customTime?: string) => {
    const timeText = customTime || getFormattedDateTime()
    const fullText = `Registro de Urticária | ${timeText}`

    // Posições da "moldura" (texto no rodapé da foto)
    const bannerHeight = 46
    const bannerY = height - bannerHeight - 20
    
    // Configurações do texto e moldura estrita conforme o design
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)' 
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
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Desenhamos exatamente no meio vertical e horizontal do banner overlay
    ctx.fillText(fullText, width / 2, bannerY + (bannerHeight / 2))
  }

  const handleCapture = () => {
    if (capturedImage) {
      // Toggle UX: Se já tirou a foto, clicar no botão principal reseta o estado e permite "Tirar Outra".
      setCapturedImage(null)
      startCamera()
      return
    }

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
    
    // Após capturar a imagem com sucesso, desligamos o stream de vídeo para economizar bateria e CPU.
    stopCamera()
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
            Fotografe e registre sua urticária do dia
          </p>
        </div>
      </div>

      {/* Viewfinder / Visor da Câmera responsivo */}
      <div className="relative flex-1 min-h-[260px] sm:min-h-[300px] bg-zinc-950 dark:bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center border border-zinc-800 shadow-inner group">
        
        {/* Renderizador de Imagens Invisível */}
        <canvas ref={canvasRef} className="hidden" />

        {/* FEED VIVO DA CÂMERA */}
        {cameraActive && !capturedImage && !cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline // Fundamental: Impede o Safari no iOS de forçar o player nativo em full screen indesejável
            muted
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
        {!cameraActive && !capturedImage && (
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
        {!capturedImage && !cameraError && cameraActive && (
             <div className="absolute bottom-4 px-3.5 py-1.5 rounded-lg bg-black/80 border border-wine-500/30 text-[#e5498a] text-[10px] sm:text-xs font-mono tracking-wider backdrop-blur-sm z-20 pointer-events-none">
               Registro de Urticária | {timestamp}
             </div>
        )}
      </div>

      {/* PAINEL DE CONTROLES INFERIORES */}
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

        {/* Botão Central: Disparador e Reset */}
        <button
          onClick={handleCapture}
          aria-label={capturedImage ? "Tirar outra foto" : "Capturar foto"}
          className={`
            relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-md z-30
            ${capturedImage
              ? 'bg-rose-600 ring-4 ring-rose-100 dark:ring-rose-950/60'
              : 'bg-wine-800 ring-4 ring-wine-100 dark:ring-wine-950/60'
            }
          `}
        >
          {capturedImage ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l8.172-3.268m0 0l-3.268 8.172m3.268-8.172L8.684 13.258m8.172-5.784L5.13 15.906c-.53.212-.767.82-.52 1.325.247.505.864.707 1.38.452l2.695-1.328m8.172-8.172l-2.694 1.328" />
          </svg>
          Enviar
        </button>
      </div>
    </div>
  )
}
