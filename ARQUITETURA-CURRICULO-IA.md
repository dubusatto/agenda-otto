# Arquitetura Aprovada — Curadoria Inteligente de Currículo (Agenda Edu)

> **Status:** Arquitetura Aprovada (Pronta para implementação no notebook pessoal)  
> **Data da Especificação:** 03/11/2026  
> **Objetivo:** Avaliar diariamente (às 20:00 BRT) as novas entradas do Diário (`CheckIn`) contra o currículo oficial do usuário armazenado em Markdown no banco Neon, gerando sugestões inteligentes de **reescrita/atualização de tópicos existentes (`REWRITE`)** ou **adição de novos tópicos (`ADD`)** com foco em relevância para vagas de Engenharia de Software, mediante aprovação humana (*Human-in-the-Loop*) diretamente na interface da **Agenda Edu**.

---

## 1. Visão Geral do Fluxo

1. **Fonte da Verdade do Currículo (Neon DB):**
   - O currículo oficial em formato Markdown (`.md`) fica armazenado na tabela `CurriculumDocument` no banco PostgreSQL (Neon), permitindo acesso, leitura, edição, importação (colar/upload da versão do notebook de casa) e download (`📥 Baixar .md`) de qualquer dispositivo.
2. **Avaliação Diária Automática às 20:00 BRT (Dupla Garantia):**
   - **Gatilho Primário (Vercel Cron):** Configurado em `vercel.json` para rodar todos os dias às `23:00 UTC` (`20:00 BRT`) chamando `GET /api/curriculum/analyze`.
   - **Gatilho de Fallback (Ao abrir o app pela manhã):** Ao carregar a Agenda Edu no navegador, se existirem `CheckIn` criados em dias anteriores (ou antes das 20h do dia anterior) com `timestamp > lastAnalyzedAt`, o cliente dispara silenciosamente `/api/curriculum/analyze` em background.
   - **Economia de Tokens:** Se não houver nenhum `CheckIn` novo desde `lastAnalyzedAt`, a rota encerra imediatamente sem chamar a API do Gemini.
3. **Filtro de Relevância com Gemini Pro (Structured Outputs):**
   - Utiliza a chave `GEMINI_API_KEY` do usuário com o modelo Gemini Pro.
   - O prompt atua como um **Staff Software Engineer & Tech Recruiter**:
     - **Ignora** tarefas puramente operacionais/rotineiras (ex.: *"rodada migration"*, *"ajustado botão"*, *"corrigido teste flaky"*).
     - **Prioriza `REWRITE` (Reescrita/Enriquecimento):** Se o currículo já possui um bullet/tópico sobre aquele sistema ou competência, propõe reescrever o tópico existente para atualizar métricas (ex.: número de testes, redução de custo/bundle), mudar nomenclatura ou incorporar a nova entrega sem inflar o tamanho do currículo.
     - **Usa `ADD` (Novo Tópico):** Apenas quando a atividade representa uma arquitetura, tecnologia ou conquista relevante que ainda não possui tópico equivalente na seção correspondente.
4. **Aprovação na Interface (Pílula no Topo + Modal de Curadoria):**
   - Ao lado do botão `📝 Diário` no cabeçalho (`src/app/page.tsx`), fica o botão **`🎓 Currículo`**.
   - Quando existirem sugestões com `status = 'PENDING'`, o botão exibe uma pílula de notificação em destaque: **`🎓 Currículo (N)`**.
   - Ao clicar, abre o `CurriculumModal.tsx` com duas abas:
     - **Aba 1 — Sugestões Pendentes:** Exibe cada sugestão com a seção alvo, justificativa técnica (*"Por que tem peso em vagas"*), diff visual (**Como está hoje** em vermelho $\rightarrow$ **Como fica** em verde), campo editável caso o usuário queira ajustar o texto sugerido antes de aceitar, e botões **`✅ Aprovar`**, **`🗑️ Descartar`** e **`✅ Aprovar Selecionadas`**.
     - **Aba 2 — Meu Currículo (.md):** Visualização e editor Markdown completo para colar a versão inicial do notebook de casa, editar manualmente quando quiser ou exportar o `.md` atualizado.

---

## 2. Modelagem de Dados (`prisma/schema.prisma`)

Adicionar os dois modelos abaixo ao [`prisma/schema.prisma`](file:///home/user/Projetos/Agenda%20Otto/prisma/schema.prisma) e rodar `npx prisma db push`:

```prisma
model CurriculumDocument {
  id             String                 @id @default(cuid())
  userEmail      String                 @unique
  content        String                 @db.Text
  previousBackup String?                @db.Text // Guarda a versão imediatamente anterior para permitir "Desfazer"
  lastAnalyzedAt DateTime?              // Cursor de timestamp do último CheckIn avaliado pela IA
  updatedAt      DateTime               @updatedAt
  createdAt      DateTime               @default(now())
  suggestions    CurriculumSuggestion[]
}

model CurriculumSuggestion {
  id             String             @id @default(cuid())
  curriculumId   String
  curriculum     CurriculumDocument @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  type           String             // "REWRITE" | "ADD"
  sectionTitle   String             // Título da seção no currículo onde a mudança ocorre
  originalText   String?            @db.Text // Preenchido em REWRITE (trecho exato atual no currículo)
  suggestedText  String             @db.Text // Novo texto proposto (para substituir originalText ou inserir na seção)
  reasoning      String             @db.Text // Por que essa entrega é relevante para vagas de Engenharia de Software
  sourceDates    String             // Ex: "03/11/2026"
  status         String             @default("PENDING") // "PENDING" | "APPROVED" | "REJECTED"
  createdAt      DateTime           @default(now())
  resolvedAt     DateTime?
}
```

---

## 3. Contrato da IA (Gemini API + JSON Schema)

- **Variável de Ambiente (`.env` e Vercel):**
  - `GEMINI_API_KEY="..."`
  - `GEMINI_MODEL="gemini-2.5-pro"` (configurável via env, podendo usar o modelo Pro mais recente disponível na conta).
- **Schema de Saída Estruturada (`responseSchema`):**

```json
{
  "type": "OBJECT",
  "properties": {
    "suggestions": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "type": { "type": "STRING", "enum": ["REWRITE", "ADD"] },
          "sectionTitle": { "type": "STRING" },
          "originalText": { "type": "STRING", "nullable": true },
          "suggestedText": { "type": "STRING" },
          "reasoning": { "type": "STRING" },
          "sourceDates": { "type": "STRING" }
        },
        "required": ["type", "sectionTitle", "suggestedText", "reasoning", "sourceDates"]
      }
    }
  },
  "required": ["suggestions"]
}
```

- **Regras Críticas do Prompt de Sistema (`src/lib/curriculumAi.ts`):**
  1. Você é um Staff Software Engineer e Tech Recruiter avaliando o diário de engenharia do candidato contra o currículo atual dele em Markdown.
  2. Seja seletivo: se as atividades do período forem apenas correções rotineiras, reuniões ou manutenção comum já coberta pelo currículo, retorne `suggestions: []`.
  3. **Regra de Ouro (`REWRITE` vs `ADD`):** Sempre prefira `REWRITE` quando já existir um tópico correlato no currículo (atualizando métricas, adicionando tecnologias ou refinando o impacto). Em `REWRITE`, o campo `originalText` **deve ser uma cópia exata (caractere por caractere)** da linha/bloco atual do currículo para permitir substituição determinística.
  4. Escreva `suggestedText` em linguagem de alto impacto para Engenharia de Software (Ação + Arquitetura/Tecnologia + Resultado/Métrica).

---

## 4. Algoritmo de Aplicação das Sugestões Aprovadas (`applySuggestion`)

Quando o usuário aprova uma sugestão (ou um lote de sugestões selecionadas):
1. Salva o `content` atual em `previousBackup` (permitindo 1-click Undo caso queira reverter).
2. Se `type === 'REWRITE'` e `originalText` existir dentro de `content`:
   - Substitui `originalText` por `suggestedText` (usando o texto eventualmente editado pelo usuário no modal).
   - Fallback seguro: se `originalText` não for encontrado literalmente (por exemplo, se o usuário editou manualmente aquela linha antes), insere `suggestedText` logo abaixo do cabeçalho `sectionTitle`.
3. Se `type === 'ADD'`:
   - Localiza o cabeçalho `sectionTitle` no Markdown e insere `suggestedText` ao final da lista de itens daquela seção (ou ao final do documento se a seção for nova).
4. Marca a `CurriculumSuggestion` como `status = 'APPROVED'` e `resolvedAt = new Date()`.
5. Atualiza também uma cópia local se estiver rodando localmente.

---

## 5. Arquivos a Criar / Modificar na Implementação

1. **`prisma/schema.prisma`**: Adicionar `CurriculumDocument` e `CurriculumSuggestion`.
2. **`src/lib/curriculumAi.ts`**: Lógica pura de chamada ao Gemini Pro, montagem de prompt, validação do JSON e função pura `applyCurriculumPatch(markdown, suggestion)` (com testes unitários em `src/lib/curriculumAi.test.ts`).
3. **`src/app/api/curriculum/analyze/route.ts`**: Endpoint `GET`/`POST` acionado pelo Cron das 20h (`vercel.json`) ou pelo botão `"🔄 Analisar agora"` / fallback matinal.
4. **`src/lib/actions.ts`**: Server Actions:
   - `getCurriculumData()`
   - `saveCurriculumContent(content: string)` (para colar/editar o currículo do notebook de casa)
   - `reviewCurriculumSuggestions(decisions: { id: string; action: 'APPROVE' | 'REJECT'; editedText?: string }[])`
   - `triggerCurriculumAnalysisNow()`
   - `undoLastCurriculumChange()`
5. **`src/components/CurriculumModal.tsx`**: Botão no cabeçalho (`🎓 Currículo` com badge de sugestões pendentes) + Modal completo com as abas **Sugestões Pendentes** (diff visual + checkboxes + edição inline) e **Meu Currículo (.md)** (editor + importar/colar + exportar `.md`), totalmente compatível com o **Modo Claro e Modo Escuro**.
6. **`vercel.json`**: Configurar o Cron Job diário às 20:00 BRT (`0 23 * * *`).

---

## 6. Como Retomar no Notebook de Casa

Ao clonar/atualizar o repositório no notebook pessoal:
1. Abra o chat com o agente e diga:
   > *"Leia o arquivo `ARQUITETURA-CURRICULO-IA.md` e vamos implementar essa arquitetura usando o meu currículo atual."*
2. Forneça a sua `GEMINI_API_KEY` no `.env` (e na Vercel) e cole o texto do seu currículo atual na aba **Meu Currículo (.md)** (ou peça para o agente já importar direto do arquivo do seu notebook para o banco Neon).
