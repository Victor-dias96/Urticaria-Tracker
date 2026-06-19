# 🛑 Urticaria Tracker — UAS7 Control

> Aplicativo responsivo de monitoramento médico semanal de urticária crônica espontânea, baseado no protocolo clínico internacional UAS7.

---

## 🚀 Tecnologias Core

*   **Framework:** Next.js (App Router)
*   **Estilização:** Tailwind CSS (Dark Mode nativo)
*   **Back-end & Infra:** Supabase (PostgreSQL, Auth & Storage)
*   **Manipulação de Mídia:** WebRTC API (Acesso à Câmera/Webcam) & HTML5 Canvas API
*   **Exportação:** html2canvas & jsPDF

---

## 🛠️ Funcionalidades Implementadas

*   **Formulário UAS7 Reativo:** Interface dinâmica para registro diário de intensidade de Urticária e Coceira (Scores de 0 a 3).
*   **Lógica de Desmarcação (Toggle):** Permite reverter seleções e calcula de forma inteligente os dias pendentes na grade médica.
*   **Módulo Fotográfico Híbrido:**
    *   **Desktop:** Inicialização de stream de vídeo da Webcam com controle estrito de ciclo de vida de tracks de hardware (evitando memory leaks e congelamentos de vídeo).
    *   **Mobile:** Fallback otimizado para o seletor nativo do sistema operacional, unificando a captura de fotos e uploads da galeria sem gargalos de permissão WebRTC.
    *   **Canvas Watermark:** Estampagem dinâmica em tempo real de metadados clínicos (Data/Hora no formato `DD/MM/YYYY às HH:mm`) diretamente nos pixels da imagem gerada.
*   **Painel Multiações:** Geração automatizada de relatórios em formato PDF (A4 centralizado), download da viewport em PNG, e compartilhamento de relatórios formatados via WhatsApp e e-mail nativos.
