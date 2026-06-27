'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadUrticariaPhoto } from '@/lib/storageService'
import { supabase } from '@/lib/supabase'

interface PhotoRecord {
  id: string
  url: string
}

interface PhotoCaptureProps {
  /** ID do usuário autenticado — necessário para montar o path no Storage */
  userId: string | null
  /** Data do registro no formato YYYY-MM-DD (sempre hoje, decisão do produto) */
  selectedDate: string
  /** Callback disparado após upload bem-sucedido: passa a URL pública e a data, e retorna o ID gerado */
  onPhotoSaved: (publicUrl: string, date: string) => Promise<string | null>
  /** Callback opcional disparado ao excluir uma foto */
  onPhotoDeleted?: (photoId: string, date: string) => void
  /** Registros de fotos já salvas no banco para essa data (para exibir miniaturas) */
  savedPhotos?: PhotoRecord[]
}

export default function PhotoCapture({
  userId,
  selectedDate,
  onPhotoSaved,
  onPhotoDeleted,
  savedPhotos = [],
}: PhotoCaptureProps) {
  // --- STATE MANAGEMENT ---
  // stream: Guarda a referência do MediaStream da câmera para podermos parar a gravação depois (economia de hardware).
  const [stream, setStream] = useState<MediaStream | null>(null)

  // capturedImage: Armazena a string Base64 (DataURL) da imagem gerada pelo Canvas.
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // cameraError: Gerencia mensagens de erro caso o usuário negue permissão ou falte hardware.
  const [cameraError, setCameraError] = useState<string | null>(null)

  // isCapturing: Booleano auxiliar para saber se a câmera está rodando no momento.
  const [isCapturing, setIsCapturing] = useState(false)

  // timestamp: Texto gerado no momento da captura para colocar no Canvas.
  const [timestamp, setTimestamp] = useState('')

  // isMobile: Detecta se o dispositivo é mobile para esconder visor de vídeo e botão de disparo.
  const [isMobile, setIsMobile] = useState(false)

  // isUploading: Controla o estado de "Enviando imagem..." durante o upload para o Storage.
  const [isUploading, setIsUploading] = useState(false)

  // uploadError: Mensagem de erro caso o upload para o Storage falhe.
  const [uploadError, setUploadError] = useState<string | null>(null)

  // confirmedPhotos: registros de fotos confirmadas após salvar no Storage (para histórico).
  const [confirmedPhotos, setConfirmedPhotos] = useState<PhotoRecord[]>(savedPhotos)

  // --- REFS ---
  // Refs são fundamentais aqui para acessar os elementos DOM reais sem causar re-renders desnecessários.
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Ref para guardar o stream atual sem depender do state (evita stale closures no cleanup)
  const streamRef = useRef<MediaStream | null>(null)
  // Ref para saber se o componente ainda está montado (evita setState após unmount)
  const isMountedRef = useRef(true)
  // Ref espelho de isMobile para uso dentro de closures e efeitos sem dependências
  const isMobileRef = useRef(isMobile)

  // Sincroniza a lista de miniaturas quando a prop externa muda
  useEffect(() => {
    setConfirmedPhotos(savedPhotos)
  }, [savedPhotos])

  // Marca desmontagem para guards assíncronos
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // --- DETECÇÃO MOBILE / DESKTOP ---
  useEffect(() => {
    const checkMobile = () => {
      // Verificação dupla: largura da tela + UserAgent para cobrir tablets e celulares
      const widthCheck = window.innerWidth < 768
      const uaCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      const result = widthCheck || uaCheck
      setIsMobile(result)
      isMobileRef.current = result
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

  // --- LÓGICA CENTRAL DE PARADA DA CÂMERA ---
  // Centralizada aqui para reutilização segura no cleanup e nas ações do usuário.
  const stopCamera = useCallback(() => {
    // Para todos os tracks e limpa a referência do vídeo completamente
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStream(null)
    setIsCapturing(false)
  }, [])

  // --- CLEANUP ROBUSTO AO DESMONTAR ---
  // Este useEffect é dedicado exclusivamente ao cleanup e NÃO inicia a câmera.
  // Separar o cleanup do início da câmera previne race conditions e double-fires do StrictMode.
  useEffect(() => {
    return () => {
      // Garante que todos os tracks são interrompidos ao desmontar o componente ou fechar o modal,
      // liberando o hardware da câmera e apagando o LED indicador do sistema operacional.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Inicializa timestamp na montagem
  useEffect(() => {
    setTimestamp(getFormattedDateTime())
  }, [getFormattedDateTime])

  // Real-time clock para a marca d'água
  useEffect(() => {
    // Só atualiza o relógio se a câmera estiver viva e nenhuma foto foi tirada
    if (!isCapturing || capturedImage) return

    const interval = setInterval(() => {
      setTimestamp(getFormattedDateTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [isCapturing, capturedImage, getFormattedDateTime])

  // --- INICIAR CÂMERA NO DESKTOP ---
  // Só dispara no Desktop e apenas na montagem inicial.
  // IMPORTANTE: NÃO usamos isMobile como dependência para evitar re-execução em resize.
  useEffect(() => {
    // Aguarda um microtick para garantir que o DOM do <video> está pronto antes de startCamera
    const timer = setTimeout(() => {
      if (!isMobileRef.current) {
        startCamera()
      }
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executa UMA ÚNICA VEZ na montagem

  // --- 1. LÓGICA DE CÂMERA UNIVERSAL ---
  const startCamera = async () => {
    if (!isMountedRef.current) return

    try {
      setCameraError(null)

      // PASSO 1: Se já houver um stream ativo, pare todos os tracks anteriores.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // PASSO 2: Limpe explicitamente a referência de vídeo para evitar tela preta residual.
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      let mediaStream: MediaStream | null = null

      // FIX TELA PRETA DESKTOP — Constraints flexíveis (ideal) em vez de exact/rígidas:
      // Constraints rígidas como { width: 1280 } causam rejeição silenciosa em muitas webcams
      // de Desktop, resultando em tela preta. O modo "ideal" permite que o browser negocie
      // com o hardware e obtenha o melhor resultado disponível.
      const flexibleConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',   // Câmera frontal / webcam padrão no Desktop
        },
        audio: false,
      }

      try {
        // Tenta primeiro com câmera traseira para Mobile (environment)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
      } catch {
        // Fallback robusto: sem facingMode forçado — funciona para Desktop e Mobile sem câmera traseira
        mediaStream = await navigator.mediaDevices.getUserMedia(flexibleConstraints)
      }

      if (!isMountedRef.current) {
        // Componente desmontado durante await — libera o stream imediatamente
        mediaStream.getTracks().forEach(track => track.stop())
        return
      }

      // PASSO 3: Associe o NOVO stream limpo ao elemento de vídeo.
      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsCapturing(true)

      // PASSO 4: Atribuição do srcObject.
      // O <video> agora está sempre no DOM (renderização incondicional), então
      // videoRef.current está disponível imediatamente — sem setTimeout necessário.
      // O setTimeout(0) apenas garante que o React já processou setIsCapturing(true).
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current
          videoRef.current.play().catch(e => console.error('Erro no autoPlay:', e))
        }
      }, 0)

    } catch (err: unknown) {
      if (!isMountedRef.current) return
      console.error('Erro ao acessar a câmera:', err)

      // Determina mensagem de erro amigável baseada no tipo de falha (DOMException)
      let errorMessage = 'Erro ao acessar webcam. Verifique as permissões do navegador.'
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permissão negada. Clique no cadeado da barra de endereços e permita o acesso à câmera.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada. Verifique se a webcam está conectada.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Câmera em uso por outro aplicativo. Feche outros programas e tente novamente.'
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Câmera não suporta a resolução solicitada. Tente novamente.'
        }
      }

      setCameraError(errorMessage)
      setIsCapturing(false)
    }
  }

  // Callback chamado quando os metadados do vídeo (dimensões, duração) são carregados.
  // Garante play() mesmo em navegadores que não disparam autoPlay automaticamente.
  const handleVideoReady = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.error('Erro no autoPlay (onLoadedMetadata):', e))
    }
  }

  // Callback adicional para quando o primeiro frame de dados estiver disponível.
  // Mais robusto que onLoadedMetadata em certas webcams e drivers de Desktop.
  const handleVideoData = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.error('Erro no autoPlay (onLoadedData):', e))
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

    // Passo Crítico 4: Converte o canvas finalizado para uma Data URL Base64.
    const dataUrl = canvas.toDataURL('image/png')
    setCapturedImage(dataUrl)
    setUploadError(null)
  }

  // Botão "Tirar outra foto": limpa o estado da imagem capturada e garante que a câmera está ligada
  const handleRetake = () => {
    // Redefine o estado da imagem capturada
    setCapturedImage(null)
    setTimestamp(getFormattedDateTime())
    setUploadError(null)

    // Se por algum motivo o stream foi parado, inicia de novo.
    // Caso contrário, o stream mantido em segundo plano continua transmitindo instantaneamente.
    if (!streamRef.current) {
      startCamera()
    }
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
        setUploadError(null)
        stopCamera() // Interrompe câmera se estiver ativa.
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)

    // Reset do input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  const triggerGallerySelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // --- 4. UPLOAD PARA O SUPABASE STORAGE ---
  const handleSaveToStorage = async () => {
    if (!capturedImage || !userId || !selectedDate) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // 1. Apenas faz o upload da imagem para o Storage (Bucket)
      const publicUrl = await uploadUrticariaPhoto(capturedImage, userId, selectedDate)

      // 2. Delega o salvamento no banco de dados INTEIRAMENTE para o componente pai.
      // Isso evita a duplicação de registos e resolve o bug da lixeira!
      const insertedId = await onPhotoSaved(publicUrl, selectedDate)

      if (insertedId) {
        // Adiciona a foto recém salva ao histórico de miniaturas local
        setConfirmedPhotos(prev => [...prev, { id: insertedId, url: publicUrl }])
      }

      // Limpa a imagem capturada do estado local
      setCapturedImage(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao salvar a foto.'
      console.error('Falha ao salvar foto no Storage:', err)
      setUploadError(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    const confirmed = window.confirm('Tem certeza que deseja excluir esta foto permanentemente?')
    if (!confirmed) return

    try {
      const marker = '/urticaria-photos/'
      const index = photoUrl.indexOf(marker)
      if (index === -1) {
        throw new Error('URL da foto inválida ou fora do bucket esperado.')
      }
      const filePath = decodeURIComponent(photoUrl.substring(index + marker.length))

      // 1. Remove o arquivo do Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('urticaria-photos')
        .remove([filePath])

      if (storageError) {
        throw storageError
      }

      // 2. Remove o registro do Banco de Dados
      const { error: dbError } = await supabase
        .from('urticaria_photos')
        .delete()
        .eq('id', photoId)

      if (dbError) {
        throw dbError
      }

      // 3. Atualiza UI local
      setConfirmedPhotos(prev => prev.filter(p => p.id !== photoId))

      // 4. Notifica o componente pai
      if (onPhotoDeleted) {
        onPhotoDeleted(photoId, selectedDate)
      }

      alert('Foto excluída com sucesso!')
    } catch (err: any) {
      console.error('Erro ao excluir foto:', err)
      alert(`Erro ao excluir foto: ${err.message || 'Erro desconhecido'}`)
    }
  }

  // --- 5. AÇÕES DE ENVIO E DOWNLOAD ---
  const handleSendPhoto = async () => {
    if (!capturedImage) return

    try {
      const res = await fetch(capturedImage)
      const blob = await res.blob()
      const file = new File([blob], `urticaria_${Date.now()}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Registro de Urticária',
          text: `Acompanhamento diário do Urticaria Tracker. Data: ${timestamp}`
        })
      } else {
        forceDownload(capturedImage, `urticaria_${Date.now()}.png`)
      }
    } catch (error) {
      console.error('Falha ao compartilhar imagem:', error)
      forceDownload(capturedImage, `urticaria_${Date.now()}.png`)
    }
  }

  const forceDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const canSaveToStorage = !!(capturedImage && userId && selectedDate && !isUploading)

  // --- 6. INTERFACE E ESTILIZAÇÃO ---
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-rose-100 dark:border-zinc-800 shadow-sm p-4 sm:p-5 transition-all duration-300 flex flex-col h-full">
      {/* Input de arquivo nativo escondido */}
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
      {/* MINIATURA CONFIRMADA — exibida quando a foto já foi salva no Storage */}
      {/* ============================================= */}
      {/* ============================================= */}
      {/* MINIATURAS CONFIRMADAS / HISTÓRICO DE FOTOS DO DIA */}
      {/* ============================================= */}
      {confirmedPhotos.length > 0 && !capturedImage && (
        <div className="mb-4 space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Fotos salvas hoje ({confirmedPhotos.length})
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-rose-100/50 dark:border-zinc-800 shadow-inner">
            {confirmedPhotos.map((photo, idx) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-emerald-400 dark:border-emerald-600 group">
                <img
                  src={photo.url}
                  alt={`Foto salva ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                />

                {/* Ícone de confirmação */}
                <div className="absolute top-1 left-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-sm animate-scale-in">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Botão de Excluir */}
                <button
                  onClick={() => handleDeletePhoto(photo.id, photo.url)}
                  title="Excluir foto"
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition-all duration-150 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            confirmedPhotos.length === 0 && (
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
            )
          )}

          {/* Feedback de erro de upload */}
          {uploadError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-medium">
              ⚠️ {uploadError}
            </div>
          )}

          {/* Spinner de upload */}
          {isUploading && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-wine-50 dark:bg-wine-950/30 border border-wine-200 dark:border-wine-800">
              <svg className="w-4 h-4 text-wine-600 dark:text-wine-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-wine-700 dark:text-wine-400 font-semibold">Enviando imagem...</span>
            </div>
          )}

          {/* Botões Mobile */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={triggerGallerySelector}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-wine-700 hover:bg-wine-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-150 shadow-md active:scale-95"
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
                  disabled={isUploading}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-150 shadow-md active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Enviar
                </button>
              )}
            </div>

            {/* Botão "Salvar no Diário" — Mobile */}
            {canSaveToStorage && (
              <button
                onClick={handleSaveToStorage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-all duration-150 shadow-md active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                </svg>
                Salvar no Diário
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

            {/*
              FIX TELA PRETA DESKTOP — Renderização Incondicional do <video>:

              PROBLEMA ANTERIOR: O <video> só era renderizado quando isCapturing=true.
              Isso criava um deadlock: startCamera() tentava acessar videoRef.current para
              atribuir o srcObject, mas como isCapturing era false, o <video> não estava no
              DOM e videoRef.current era null. O stream era criado mas nunca exibido → tela preta.

              SOLUÇÃO: O <video> é SEMPRE renderizado no DOM (independente de isCapturing).
              Ele fica invisível via opacity/pointer-events quando não em uso. Assim,
              videoRef.current está sempre disponível quando startCamera() precisar atribuir o srcObject.

              Atributos necessários para reprodução contínua sem travar:
              - autoPlay: inicia reprodução assim que srcObject é atribuído
              - playsInline: impede Safari iOS de forçar player nativo em tela cheia
              - muted: obrigatório para autoPlay funcionar na maioria dos navegadores modernos
            */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleVideoReady}
              onLoadedData={handleVideoData}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isCapturing && !capturedImage && !cameraError
                ? 'opacity-100 animate-fade-in'
                : 'opacity-0 pointer-events-none'
                }`}
            />

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
                  <div className="flex flex-col items-center gap-3 max-w-xs">
                    {/* Ícone de câmera com erro */}
                    <div className="text-rose-400 bg-rose-500/10 rounded-full p-3">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="px-4 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <p className="text-xs font-semibold text-rose-400 leading-relaxed">{cameraError}</p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="text-[11px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors border border-zinc-700 hover:border-zinc-600 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
                      </svg>
                      Tentar Novamente
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6 text-zinc-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-zinc-400">Acessando câmera nativa...</p>
                  </div>
                )}
              </div>
            )}

            {/* Dica da Watermark: só aparece durante o vídeo vivo */}
            {!capturedImage && !cameraError && isCapturing && (
              <div className="absolute bottom-4 px-3.5 py-1.5 rounded-lg bg-black/80 border border-wine-500/30 text-[#e5498a] text-[10px] sm:text-xs font-mono tracking-wider backdrop-blur-sm z-20 pointer-events-none">
                Registro de Urticária | {timestamp}
              </div>
            )}

            {/* OVERLAY de Upload em progresso */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 rounded-lg gap-3">
                <svg className="w-8 h-8 text-wine-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-white font-semibold">Enviando imagem...</p>
                <p className="text-xs text-zinc-400">Aguarde, salvando no diário.</p>
              </div>
            )}
          </div>

          {/* Feedback de erro de upload — Desktop */}
          {uploadError && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-medium">
              ⚠️ {uploadError}
            </div>
          )}

          {/* PAINEL DE CONTROLES INFERIORES — DESKTOP */}
          <div className="mt-4 flex items-center justify-between gap-4 px-2">
            {/* Botão de acessar Input de Galeria */}
            <button
              onClick={triggerGallerySelector}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all duration-150 hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={!isCapturing || isUploading}
                aria-label="Capturar foto"
                className={`
                  relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md z-30
                  ${isCapturing && !isUploading
                    ? 'bg-wine-700 hover:bg-wine-800 ring-4 ring-wine-100 dark:ring-wine-950/60 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-zinc-600 ring-4 ring-zinc-300 dark:ring-zinc-700 cursor-not-allowed opacity-50'
                  }
                `}
              >
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
                disabled={isUploading}
                className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md z-30 bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-100 dark:ring-rose-950/60 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Tirar outra foto"
                title="Tirar outra foto"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
                </svg>
              </button>
            )}

            {/* Ação de Enviar Nativo ou Download Fallback */}
            <button
              onClick={handleSendPhoto}
              disabled={!capturedImage || isUploading}
              className={`
                flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 border
                ${capturedImage && !isUploading
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
                disabled={isUploading}
                className="text-xs text-wine-600 dark:text-wine-400 hover:text-wine-800 dark:hover:text-wine-300 font-semibold underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↻ Tirar outra foto
              </button>
            </div>
          )}

          {/* Botão "Salvar no Diário" — Desktop */}
          {canSaveToStorage && (
            <div className="mt-3">
              <button
                onClick={handleSaveToStorage}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-all duration-150 shadow-md hover:scale-[1.01] active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3" />
                </svg>
                Salvar no Diário
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
