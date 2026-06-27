# 🩺 Urticaria Tracker — UAS7 PWA

Um Progressive Web App (PWA) moderno desenvolvido para ajudar pacientes com Urticária Crônica a rastrearem seus sintomas diários usando o protocolo médico **UAS7** (Urticaria Activity Score over 7 days).

🔗 **[Acesse o App Ao Vivo Aqui] (coloque_seu_link_aqui)**

> **Credenciais para teste rápido (Recrutadores):**
> E-mail: `teste@teste.com`
> Senha: `123456`

## ✨ Funcionalidades

- **Cálculo Automático UAS7:** Seleção intuitiva da severidade de Urticária e Coceira, com somatório dinâmico da semana.
- **Galeria de Crises (Storage):** Registro fotográfico diário associado à severidade da crise.
- **Instalável (PWA):** Suporte completo a Service Workers, permitindo a instalação nativa no Android e iOS.
- **Exportação de Relatório (PDF):** Captura do diário e conversão para PDF responsivo de alta qualidade (via `html2canvas`).
- **Dark Mode Avançado:** Sincronização perfeita de tema (Light/Dark) persistida localmente sem *FOUC* (Flash of Unstyled Content).
- **Autenticação Segura:** Criação de conta e login gerenciados via Supabase Auth.

## 🛠️ Tecnologias Utilizadas

- **[Next.js 14 (App Router)](https://nextjs.org/)** - Framework React
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilização e Dark Mode
- **[Supabase](https://supabase.com/)** - PostgreSQL, Auth e Cloud Storage
- **[Next PWA](https://github.com/ducanh2912/next-pwa)** - Geração de Service Workers e Manifest

