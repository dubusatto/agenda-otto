# SDD: Testes Automatizados & Fluxo TDD no Agenda Otto

## 1. Visão Geral e Filosofia
O objetivo deste documento é estruturar a suíte de testes automatizados do **Agenda Otto** seguindo as diretrizes das skills de [TDD](file:///home/user/Projetos/Agenda%20Otto/.agents/skills/tdd/SKILL.md) e [Codebase Design](file:///home/user/Projetos/Agenda%20Otto/.agents/skills/codebase-design/SKILL.md) presentes no repositório.

> [!IMPORTANT]
> **Regras de Ouro do nosso TDD:**
> 1. **Testar Comportamento em Costuras Públicas (Seams):** Testamos *o que* o módulo faz através de sua interface pública, nunca detalhes internos de implementação.
> 2. **Módulos Profundos (Deep Modules):** Regras de negócio complexas que hoje estão embutidas dentro de componentes visuais React serão extraídas para módulos puros com interfaces pequenas e fáceis de testar.
> 3. **Fatiamento Vertical (Red → Green):** Um teste falhando por vez → implementação mínima para passar → próximo ciclo.
> 4. **Mocking Apenas nas Fronteiras do Sistema:** Banco de dados (Prisma) e APIs externas (Google/Next Cache) são isolados na fronteira; nossos próprios módulos de domínio nunca são mockados entre si.

---

## 2. Arquitetura de Costuras (Seams) sob Teste

### Seam 1: Motor de Tempo, Check-ins e Desconto de Almoço (`src/lib/timetracking.ts`)
**Problema Atual:** A matemática que calcula o tempo de cada check-in, aplica o desconto de `-1h` do almoço e soma o tempo acumulado está duplicada dentro do JSX de `TaskModal.tsx` e `DailySummaryModal.tsx`.

**Interface Proposta:**
- `calculateCheckInIntervals(entry)`: Recebe uma sessão (`startTime` + lista de `checkins`) e retorna os check-ins ordenados cronologicamente com a duração exata (`durationMs`) de cada um.
- `calculateTaskAccumulatedTime(timeEntries, now?)`: Calcula o tempo total trabalhado na tarefa (sessões encerradas + sessão aberta - desconto de almoço).
- `canApplyLunchDiscount(timeEntries, targetCheckInId)`: Valida a regra de exclusividade (apenas 1 check-in por tarefa pode ter o almoço descontado).

**Comportamentos Verificados pelos Testes:**
- [x] O primeiro check-in calcula a duração a partir do `startTime` da sessão; os seguintes calculam a partir do `timestamp` do check-in anterior, mesmo se vierem fora de ordem do banco.
- [x] Quando `hasLunchDiscount` está ativo em um check-in de `2h10min`, a duração retornada passa a ser `1h10min`.
- [x] Quando `hasLunchDiscount` está ativo em um check-in menor que 1 hora (ex: `40min`), a duração trava em `0ms` (nunca gera tempo negativo).
- [x] A regra de exclusividade bloqueia a ativação do almoço em um segundo check-in quando a tarefa já possui um check-in com almoço descontado.

---

### Seam 2: Integração Claude Code MCP (`src/app/api/checkin/route.ts`)
**O que é:** A porta de entrada HTTP (`POST /api/checkin`) que recebe os resumos enviados pelo Claude Code direto do terminal.

**Comportamentos Verificados pelos Testes:**
- [x] **Segurança:** Requisições sem header `Authorization` ou com token diferente de `AGENDA_API_TOKEN` retornam `401 Unauthorized`.
- [x] **Validação:** Requisições com corpo vazio ou sem o campo `resumo` retornam `400 Bad Request`.
- [x] **Sem Tarefa Ativa:** Se não houver nenhuma `TimeEntry` com `endTime: null` no banco, retorna `404 Not Found` com mensagem clara.
- [x] **Caminho Feliz:** Existindo uma sessão ativa, cria o registro de `CheckIn` vinculado ao `timeEntryId` correto, invalida o cache da rota principal (`revalidatePath('/')`) e retorna `200 OK`.

---

### Seam 3: Motor de Recorrência e Janela de Calendário (`src/lib/recurrence.ts`)
**Problema Atual:** A lógica de expansão de `rrule`, filtro de `exdates` e vínculo com `TaskInstance` está embutida diretamente dentro do componente de servidor `src/app/page.tsx`.

**Interface Proposta:**
- `expandScheduledTaskOccurrences(scheduledTask, timeMin, timeMax)`: Retorna a lista de `CalendarEvent` prontos para a grade.

**Comportamentos Verificados pelos Testes:**
- [x] Tarefa sem `rrule` retorna um único evento com seus respectivos `timeEntries`.
- [x] Tarefa recorrente (`FREQ=WEEKLY;BYDAY=MO,WE,FR`) gera todas as ocorrências dentro da janela `[timeMin, timeMax]` preservando a duração (ex: 30 min).
- [x] **Regressão de Fronteira de Mês:** Uma tarefa criada no último dia do mês (ex: 30 de setembro) com recorrência não desaparece e gera corretamente as ocorrências no mês seguinte.
- [x] Datas presentes em `exdates` (instâncias excluídas individualmente) são omitidas do resultado.
- [x] Cada ocorrência recorrente herda corretamente o status `completed` e os `timeEntries` apenas da sua `TaskInstance` correspondente àquele dia.

---

### Seam 4: Cores Semânticas e Distribuição de Paleta (`src/lib/colors.ts`)
**Comportamentos Verificados pelos Testes:**
- [x] `getSemanticColor(seed)` retorna sempre a mesma cor hexadecimal para o mesmo ID de tarefa (determinismo) e sempre pertence à `VIBRANT_PALETTE`.
- [x] `getLeastUsedColor(usedColors)` seleciona uma cor inédita quando há cores livres na paleta, ou a cor com menor número de repetições quando todas já foram usadas.

---

## 3. Ferramental e Estrutura

- **Test Runner:** **Vitest** (nativo para TypeScript/ESM, execução em milissegundos, compatível com a sintaxe de caminhos `@/*` do Next.js).
- **Comandos no `package.json`:**
  - `npm test`: Roda todos os testes uma vez (ideal para CI e validação rápida).
  - `npm run test:watch`: Modo interativo para o loop **Red → Green** do TDD.
- **Localização dos arquivos:** Colocados ao lado do módulo que testam (`src/lib/timetracking.test.ts`, `src/lib/recurrence.test.ts`, `src/lib/colors.test.ts`, `src/app/api/checkin/route.test.ts`).

---

## 4. Roadmap de Execução (Passo a Passo)

1. **Passo 1 — Infraestrutura:** Instalar `vitest` e configurar `vitest.config.ts` com suporte ao alias `@/`.
2. **Passo 2 — Seam 4 (`colors.test.ts`):** Primeiros testes rápidos no módulo puro já existente para validar a engrenagem do Vitest.
3. **Passo 3 — Seam 1 (`timetracking.ts` + `timetracking.test.ts`):** Ciclo TDD (um teste por vez) para o cálculo de check-ins e desconto de almoço, plugando o módulo em `TaskModal.tsx` e `DailySummaryModal.tsx`.
4. **Passo 4 — Seam 2 (`route.test.ts`):** Testes de integração da rota `/api/checkin` do Claude Code.
5. **Passo 5 — Seam 3 (`recurrence.ts` + `recurrence.test.ts`):** Ciclo TDD para a expansão de tarefas recorrentes e vínculo de instâncias, plugando em `page.tsx`.
