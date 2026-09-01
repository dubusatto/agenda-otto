#!/bin/bash
T1=$(gh issue create --title "1. Autenticação e Dashboard Inicial" --body "## Parent
#1

## What to build
Configuração do Next.js (App Router), Tailwind e NextAuth.js com o Google Provider (pedindo escopo de Calendar e Tasks). O usuário consegue fazer login e vê um painel vazio protegido.

## Acceptance criteria
- [ ] Next.js app running with Tailwind
- [ ] NextAuth.js configured with Google OAuth
- [ ] Unauthenticated users are redirected to login
- [ ] Authenticated users see an empty dashboard

## Blocked by
None (can start immediately)" --label "ready-for-agent" | awk -F'/' '{print $NF}')
echo "Created Ticket 1: #$T1"

T2=$(gh issue create --title "2. Visualizador do Calendário (Google Calendar + Grid)" --body "## Parent
#1

## What to build
Conecta à API do Google Calendar para buscar os eventos do usuário. Renderiza a interface do react-big-calendar (estilizada com Tailwind) e exibe os eventos reais do usuário na grade.

## Acceptance criteria
- [ ] Fetch events from Google Calendar API
- [ ] Render react-big-calendar grid
- [ ] Display Google Calendar events on the grid

## Blocked by
- #$T1" --label "ready-for-agent" | awk -F'/' '{print $NF}')
echo "Created Ticket 2: #$T2"

T3=$(gh issue create --title "3. Barra Lateral de Tarefas (Google Tasks)" --body "## Parent
#1

## What to build
Conecta à API do Google Tasks. Cria uma barra lateral (Sidebar) na mesma página do calendário exibindo as tarefas pendentes do usuário.

## Acceptance criteria
- [ ] Fetch tasks from Google Tasks API
- [ ] Render a sidebar alongside the calendar
- [ ] Display pending tasks in the sidebar

## Blocked by
- #$T1" --label "ready-for-agent" | awk -F'/' '{print $NF}')
echo "Created Ticket 3: #$T3"

T4=$(gh issue create --title "4. Persistência de Scheduled Tasks (Banco de Dados)" --body "## Parent
#1

## What to build
Configuração do Prisma/PostgreSQL. Criação do schema para a entidade ScheduledTask. Implementação das Server Actions (criar/ler) e um teste simples na interface (um botão mock) para provar que salva e lê do banco.

## Acceptance criteria
- [ ] Prisma configured with PostgreSQL
- [ ] ScheduledTask schema created
- [ ] Server actions for creating and reading ScheduledTasks
- [ ] UI mechanism to test creating a ScheduledTask

## Blocked by
- #$T1" --label "ready-for-agent" | awk -F'/' '{print $NF}')
echo "Created Ticket 4: #$T4"

T5=$(gh issue create --title "5. Drag and Drop Interativo (O Core do App)" --body "## Parent
#1

## What to build
Implementação do @dnd-kit/core. O usuário pode arrastar uma tarefa da barra lateral (Ticket 3) e soltá-la na grade do calendário (Ticket 2). Ao soltar, aciona a persistência (Ticket 4) e a tarefa aparece renderizada na grade como um bloco de 30 minutos.

## Acceptance criteria
- [ ] @dnd-kit/core implemented on Sidebar and Calendar
- [ ] Dragging a task to a time slot triggers the ScheduledTask creation server action
- [ ] Scheduled tasks appear on the calendar grid taking a 30-minute block

## Blocked by
- #$T2
- #$T3
- #$T4" --label "ready-for-agent" | awk -F'/' '{print $NF}')
echo "Created Ticket 5: #$T5"

T6=$(gh issue create --title "6. Sistema de Cores (Semantic Color-Coding)" --body "## Parent
#1

## What to build
Aplica o algoritmo de design opinionado. Eventos do Google e Scheduled Tasks ganham cores vibrantes automaticamente na grade com base em palavras-chave ou em qual agenda/lista pertencem.

## Acceptance criteria
- [ ] Color generation algorithm based on task/event context
- [ ] react-big-calendar event components are customized with Tailwind to use these colors

## Blocked by
- #$T5" --label "ready-for-agent" | awk -F'/' '{print $NF}')
echo "Created Ticket 6: #$T6"

