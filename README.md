# 🛡️ Urticaria Tracker — Diário Clínico UAS7

O **Urticaria Tracker** é uma plataforma digital full-stack desenvolvida especificamente para pacientes diagnosticados com Urticária Crônica Espontânea (UCE). O sistema automatiza o monitoramento de crises seguindo rigorosamente o protocolo médico internacional **UAS7 (Urticaria Activity Score)**, transformando o registro diário de sintomas em relatórios precisos para suporte a decisões clínicas.

---

## 💻 Core Technologies (Stack Técnica Principal)

- **Framework:** Next.js (React) com App Router para renderização eficiente e roteamento híbrido.
- **Linguagem:** TypeScript para tipagem estática, reduzindo bugs em tempo de execução e garantindo consistência nos payloads de saúde.
- **Estilização:** Tailwind CSS utilizando conceitos de design mobile-first e componentes fluidos de alta fidelidade visual.
- **Banco de Dados Relacional:** PostgreSQL gerenciado via **Supabase**, com estruturação de integridade referencial via Foreign Keys.
- **Segurança de Dados:** **Row Level Security (RLS)** ativo em nível de banco de dados, blindando o acesso e garantindo que cada paciente acesse estritamente seus próprios registros médicos.
- **Autenticação:** Supabase Auth (Client & Server-side Session Management) acoplado a **Next.js Middlewares** para proteção de rotas nativa na camada de borda (Edge).
- **Deploy & Infraestrutura:** Vercel Cloud Platform com pipelines de Integração Contínua (CI/CD).

---

## 🚀 Funcionalidades Implementadas

### 🔒 Controle de Acesso e Autenticação Robusta
- Sistema de login e cadastro integrado ao provedor de identidade seguro do Supabase.
- Middleware customizado interceptando requisições HTTP para proteção de rotas privadas, mitigando acessos não autorizados antes mesmo da renderização do componente.

### 📈 Diário Clínico UAS7 Automatizado
- Painel interativo para inserção das métricas diárias de **Intensidade das Urticárias** e **Nível de Coceira** (escala clínica de 0 a 3).
- Mecanismo de **Upsert Inteligente**: O sistema identifica automaticamente se o usuário está criando um novo registro ou atualizando uma entrada do dia corrente, sincronizando os dados em tempo real no banco de dados.

### 🛡️ Resiliência de Dados e Tratamento de Constraints
- Camada de tradução de dados no Front-end que converte estados parciais e remoções de notas em valores nulos (`null`) aceitos pelo PostgreSQL, respeitando as *Check Constraints* de validação clínica e evitando erros de requisição (`400 Bad Request`).
- Inicialização de estado otimizada com `.maybeSingle()`, contornando falhas de processamento assíncrono caso o usuário acesse a plataforma pela primeira vez no dia.

### 🎨 Experiência de Usuário (UX/UI) Fluida
- Micro-interações dinâmicas ao selecionar notas, fornecendo feedback tátil e visual instantâneo para o paciente.
- Manutenção de estado resiliente a atualizações de página (*Fast Refresh* e gerenciamento de cache local).
