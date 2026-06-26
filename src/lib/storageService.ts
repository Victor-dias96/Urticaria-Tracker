import { supabase } from '@/lib/supabase'

const BUCKET = 'urticaria-photos'

/**
 * Converte uma string Base64 (Data URL) em um Blob binário.
 * Necessário pois o canvas.toDataURL() retorna string, mas a API de Storage precisa de Blob.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/**
 * Faz upload de uma imagem Base64 para o bucket 'urticaria-photos' no Supabase Storage.
 *
 * @param dataUrl  - String Base64 (Data URL) gerada pelo canvas.toDataURL()
 * @param userId   - ID do usuário autenticado (para organizar o path no bucket)
 * @param date     - Data no formato YYYY-MM-DD (ex: "2026-06-26") a ser usada no nome do arquivo
 * @returns        - A URL pública da imagem salva no Storage
 * @throws         - Lança erro com mensagem descritiva em caso de falha
 */
export async function uploadUrticariaPhoto(
  dataUrl: string,
  userId: string,
  date: string
): Promise<string> {
  // 1. Converter Base64 → Blob para compatibilidade com a Storage API
  const blob = await dataUrlToBlob(dataUrl)

  // 2. Montar o file path organizado por usuário e timestamp para evitar colisões
  //    Exemplo: "abc-user-id/2026-06-26_1719432000000.png"
  const filePath = `${userId}/${date}_${Date.now()}.png`

  // 3. Upload para o bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert: false, // Cada captura gera um arquivo novo (timestamp garante unicidade)
    })

  if (uploadError) {
    throw new Error(`Erro no upload da foto: ${uploadError.message}`)
  }

  // 4. Obter a URL pública após upload bem-sucedido
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

  if (!urlData?.publicUrl) {
    throw new Error('Não foi possível obter a URL pública da imagem.')
  }

  return urlData.publicUrl
}
