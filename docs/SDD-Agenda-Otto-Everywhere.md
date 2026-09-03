# SDD: Agenda Otto "Everywhere" (Fase 4)

## Visão Geral
O objetivo desta fase é libertar o Agenda Otto do desktop, fazendo com que suas tarefas agendadas, rotinas e o rastreador de tempo (WIP) funcionem em "qualquer lugar". 

Para interpretar "qualquer lugar", este documento propõe atuar em duas frentes complementares: **Sincronização de Dados (Google Calendar)** e **Portabilidade da Interface (Mobile/PWA)**.

---

## Eixo 1: Sincronização Bidirecional (O motor de dados)
**O Problema Atual:** Hoje, quando você arrasta uma tarefa para o calendário, ela é salva apenas no nosso banco de dados local (Postgres). Ela não aparece no calendário nativo do seu celular ou no smartwatch.

**A Solução:** Fazer com que o Agenda Otto *escreva* no seu Google Calendar.
1. **Espelhamento:** Ao criar ou arrastar uma `ScheduledTask`, o Agenda Otto fará um `POST` na API do Google Calendar (`/calendars/primary/events`) criando um evento espelho.
2. **Vínculo:** O ID desse evento no Google será salvo na nossa tabela `ScheduledTask` (ex: nova coluna `googleEventId`).
3. **Atualização em Tempo Real:** Se você redimensionar o bloco no Otto, atualizamos o evento no Google.
4. **O que você ganha:** Sua agenda de blocos de tempo aparecerá no widget do seu celular, no Apple Watch, no painel do carro, etc.

---

## Eixo 2: Experiência Mobile & PWA (O aplicativo de bolso)
**O Problema Atual:** Nossa interface (Barra lateral + Grade de calendário) é maravilhosa para mouse e telas grandes (Desktop), mas se você abrir no Safari/Chrome do celular agora, a tela ficará espremida e o "arrastar e soltar" não funcionará bem com o toque (touch). Além disso, você precisa do Otto no celular para fazer *Check-ins* da academia ou de reuniões fora de casa.

**A Solução:** Transformar o Agenda Otto em um Progressive Web App (PWA) responsivo.
1. **Manifesto PWA:** Configurar o Next.js para permitir que o site seja "Instalado" na tela inicial do celular (com ícone de aplicativo, abrindo em tela cheia sem a barra de URL).
2. **Layout Responsivo:** 
   - No celular, a barra "Suas Listas" se transforma em uma aba inferior (Bottom Sheet) ou menu hambúrguer.
   - O calendário muda automaticamente para a visão de `Dia` (Day View) para caber na tela.
3. **Modal Touch-Friendly:** O modal de tarefas (TaskModal) será adaptado para ocupar a tela inteira no celular, facilitando o acionamento do botão gigante de "Iniciar Sessão" e a digitação dos Check-ins.

---

## Plano de Execução (Roadmap)

### Passo 1: O Espelho do Google (Backend)
- [ ] Alterar o Schema do Prisma para incluir `googleEventId` nas tarefas locais.
- [ ] Modificar a Server Action `createScheduledTask` para injetar o evento no Google Calendar do usuário.
- [ ] Modificar `updateScheduledTaskTime` para atualizar o horário lá no Google quando redimensionar.

### Passo 2: Responsividade Básica (Frontend)
- [ ] Ocultar a Sidebar (Suas Listas) em telas `< 768px` e transformá-la em um menu acessível por um botão (Drawer/Bottom Sheet).
- [ ] Forçar a visualização do React Big Calendar para "Dia" em telas pequenas.

### Passo 3: PWA (Instalação)
- [ ] Instalar e configurar o `next-pwa`.
- [ ] Gerar os ícones do aplicativo e o arquivo `manifest.json`.
- [ ] Testar a instalação na tela inicial de um smartphone.

---
## Perguntas para Validação
1. Quando você disse "funcionar em qualquer lugar", você pensou mais no **Eixo 1 (Aparecer no calendário do celular)** ou no **Eixo 2 (Abrir o Otto no celular para dar Start/Check-in)**? Ou ambos?
2. Concorda com a ordem de execução (Backend de Sync primeiro, UI Mobile depois)?
