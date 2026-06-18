'use client'

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function ActionButtons() {
  const handleExportPDF = async () => {
    try {
      const element = document.getElementById('uas7-form-capture')
      if (!element) {
        alert('Erro: Formulário não encontrado para exportação.')
        return
      }
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      
      const dateStr = new Date().toLocaleDateString('pt-BR')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text(`Relatório UAS7 - ${dateStr}`, pdfWidth / 2, 15, { align: 'center' })
      
      // A margem lateral será 10mm, então a largura da imagem é pdfWidth - 20.
      // Altura proporcional: (canvasHeight * imageWidth) / canvasWidth
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 25, imgWidth, imgHeight)
      pdf.save(`Relatorio_UAS7_${dateStr.replace(/\//g, '-')}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Falha ao gerar o arquivo PDF. Verifique as permissões ou tente novamente.')
    }
  }

  const handleSaveImage = () => {
    alert('Salvando como Imagem...')
  }

  const handleShareWhatsApp = () => {
    const url = 'https://api.whatsapp.com/send?text=Confira meu score UAS7 semanal do Urticaria Tracker!'
    window.open(url, '_blank')
  }

  const handleSendEmail = () => {
    window.location.href = 'mailto:medico@exemplo.com?subject=Relatorio UAS7 - Urticaria Tracker&body=Ola, segue o meu score UAS7 desta semana...'
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        Ações
      </h3>
      
      {/* Exportar PDF (Vermelho/Vinho Médio) */}
      <button
        onClick={handleExportPDF}
        className="w-full py-3.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exportar PDF
      </button>
      
      {/* Salvar como Imagem (Vinho escuro) */}
      <button
        onClick={handleSaveImage}
        className="w-full py-3.5 px-5 bg-wine-900 hover:bg-wine-950 dark:bg-wine-800 dark:hover:bg-wine-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Salvar como Imagem
      </button>

      {/* Compartilhar via WhatsApp (Verde vibrante com ícone) */}
      <button
        onClick={handleShareWhatsApp}
        className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Compartilhar via WhatsApp
      </button>

      {/* Enviar por E-mail (Branco/Cinza muito claro) */}
      <button
        onClick={handleSendEmail}
        className="w-full py-3.5 px-5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold rounded-xl border-2 border-gray-200 dark:border-gray-750 shadow-sm flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Enviar por E-mail
      </button>
    </div>
  )
}
