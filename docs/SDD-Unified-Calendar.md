# Software Design Document (SDD): Unified Calendar & WIP Time Tracking

## 1. O Problema
O usuário deseja unir a visualização da **Intenção** (o que eu planejo fazer e em que horário, através do Calendário) com a **Realidade** (a execução real, através de Time Tracking e Check-ins). 
Atualmente, a conclusão de uma tarefa afeta todos os seus clones gerados por recorrência, impedindo o rastreamento individual de hábitos diários (ex: "ir à academia").

## 2. A Solução Proposta

Nós transformaremos os blocos de eventos do `react-big-calendar` em **Containers de Execução**.

### 2.1. Arquitetura de "Instâncias" para Tarefas Recorrentes
Para suportar marcar a "Academia de Quarta-feira" como concluída sem afetar a "Academia de Quinta-feira", precisamos materializar essas instâncias.

**Nova Tabela no Prisma:**
```prisma
model TaskInstance {
  id              String   @id @default(cuid())
  scheduledTaskId String
  scheduledTask   ScheduledTask @relation(fields: [scheduledTaskId], references: [id], onDelete: Cascade)
  
  instanceDate    DateTime // O dia/hora original deste clone específico
  completed       Boolean  @default(false)
  completedAt     DateTime?
  
  // O Time Tracking passa a ficar atrelado à Instância, não à Tarefa Base
  timeEntries     TimeEntry[]
}
```
* **Lógica:** A regra `RRULE` continuará gerando os blocos visualmente. Porém, ao clicar em um bloco para marcar "Concluído" ou dar "Start", o sistema criará (ou atualizará) um `TaskInstance` no banco de dados para aquela `instanceDate` específica.

### 2.2. A Jornada do "WIP" (Work In Progress)
O Modal de Tarefas (que abre ao clicar no bloco do calendário) será o painel de controle do WIP.
1. **Agendamento (Intenção):** O bloco existe no calendário das 14:00 às 16:00.
2. **Start (Realidade):** Às 14:15, o usuário abre o modal e clica em `▶️ Start`. Isso cria um `TimeEntry` no `TaskInstance` correspondente. O bloco no calendário passa a piscar laranja, indicando que está em andamento.
3. **Check-ins:** O usuário digita "Fase 1 concluída". O sistema registra o `CheckIn` e calcula o tempo do último check-in até o atual.
4. **Pause/Stop:** Ao encerrar, o tempo total é salvo. Opcionalmente, um log visual pode ser exibido no bloco.

### 2.3. Integração Analítica (Gráficos)
Com os `TaskInstances` materializados, torna-se trivial consultar a frequência de um hábito:
```sql
SELECT count(*) FROM TaskInstance WHERE scheduledTaskId = 'id-da-academia' AND completed = true;
```

## 3. Fases de Implementação (Roadmap para Validação)

Dividiremos a implementação para que possamos validar cada passo sem quebrar a aplicação.

- [ ] **Fase 1: Schema e Materialização de Instâncias**
  - Atualizar o `schema.prisma` com `TaskInstance`.
  - Atualizar as Server Actions para lidar com instâncias baseadas na data do clique.
- [ ] **Fase 2: UI do Hábito (Check-ins por Instância)**
  - Fazer com que o botão "Marcar Concluída" do Modal atualize apenas a Instância atual, deixando o resto da série intocada.
- [ ] **Fase 3: WIP Completo no Calendário**
  - Migrar os `timeEntries` para a Instância.
  - Atualizar o cálculo de "Tempo Acumulado" para exibir no bloco do calendário (sobreposição visual).

## 4. Próximos Passos
Se a visão estiver alinhada, começaremos pela **Fase 1**, modificando o banco de dados e preparando a camada de servidor para suportar instâncias independentes.
