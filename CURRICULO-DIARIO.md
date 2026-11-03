# Registro de Atividades do Diário (Agenda Edu)

> **Atualizado automaticamente em:** 03/11/2026 às 11:37  
> **Período registrado:** 04/09/2026 a 30/10/2026 (78 check-ins)

---

## 04/09/2026

- otto lead corrigido - otto portal implementado

## 09/09/2026

- finalizado o Otto Portal
- finalizada plataforma gestão de ti para fora do lovable

## 10/09/2026

- cadastro na openrouter. Aguardando cartão
- plataforma de gestão de TI funcionando fora do lovable
- IA finance_app aguardando

## 11/09/2026

- correção em RFI
- link tv atlas ainda entrando protetor de tela
- plataforma gestão ti: corrigido falta de on/offboarding
- automação para o cadastro de leads na sellbot
- Finalização dos cadastros sellbot

## 14/09/2026

- Correções Atlas: saude dos check-ins apenas projetos ativos, data de fim do projeto agora salva
- correções no RFI
- correção Atlas visualização tv
- corrigido em definitivo o painel tv

## 15/09/2026

- cadastro de Leads no CRM do sellbot
- criação do overview na Otto
- alteração do painel da tv
- overview em produção
- overview em Otto concluído
- key financials implementado
- finalizado overview

## 16/09/2026

- limpeza e melhora no desempenho do computador branco
- concluído modelagem na plataforma
- terminado erro de acesso otto arena otto portal
- todas as migrations para a produção realizadas e PRs abertos para deixar produção igual a staging
- estimativa de nova Otto Arena

## 17/09/2026

- zerar tarefas Polly
- colocar nome do responsável nas tarefas atrasadas
- poder escolher quem vai fazer check-in
- correção de usuários teste em produção

## 22/09/2026

- correção do layout do otto arena para a úlitma atualização
- novo layout otto arena
- corrigido situação da visualização dos arquivos
- correção do menu superior que não funcionava
- plataforma com nova identidade visual da otto
- CIAL, correção em P&L budget
- correções fluxo de caixa reembolso fornecedores.

## 24/09/2026

- reunião

## 29/09/2026

- corrigido OKR
- CIAL: enviado questões sobre vendas estarem vindo zeradas.
- -

## 30/09/2026

- correções CIAL
- novas implementações plataforma
- finalização de P&L
- correções na plataforma e PRs o mais atuais possíveis em produção

## 01/10/2026

- Sala: o entregável Modelagem sumiu em GTF/RTREES porque o item mod estava inativo no catálogo global. Reativado nos dois bancos.
- Catálogo: aviso na tela de que desativar um item afeta todos os clientes (staging).
- CPF/CNPJ: máscara no perfil do cliente (staging).
- Produção: rodou a migration pack e abriu os PRs.
- Job diário do Atlas: apontava para o ambiente errado. Corrigi o secret, que precisa do /api/v1. Agora roda na produção e atualizou o status dos 5 clientes vinculados.
- Keman: tinha organização duplicada no Atlas. Você excluiu a duplicada, e ele passou a sincronizar.
- GGV/Keman: contrato recorrente não tem fim, então os ciclos não nasciam. Implementei a régua mensal (staging, testada por você).
- Pendente: produção fica para segunda (05/10). Os analistas fazem o pente fino no Atlas, e 24 empresas ainda precisam de CNPJ para vincular.

## 05/10/2026

- produção atualizada com a main para regra mensal não bloquear adição de arquivos
- ici, melhorias e correções
- correções da corrida de leads
- correções plataforma

## 06/10/2026

- ici, print para a Thaisa das novas funcionalidades

## 13/10/2026

- atualização e finalização slides AI First
- landing page de Arena Otto

## 14/10/2026

- Plano da Otto segue o Atlas
- Uma entrega que estava parada passa para "em produção" quando o Atlas marca aquele mês.
- Os ciclos de quem tem Atlas cobrem uma janela de um ano.
- Relatório Atlas × Otto
- Card no Admin que compara o Atlas com a Otto em todos os clientes, com o botão "Sincronizar todos".
- A mesma conferência roda no job diário.
- Só o super admin vê.
- "Ciclos contratados" fora
- Para quem tem Atlas, esse campo não manda mais nos ciclos nem na Jornada, e saiu do Admin. Era ele que travava o Urso Polar em 3 ciclos.
- Atlas → Otto
- Todo entregável contratado no Atlas agora chega na Otto.
- O relatório aponta o que não chegou.
- Perfil psico-financeiro por pessoa
- Há um arquivo da empresa, que todos da empresa veem, e um arquivo de cada sócio, que só ele vê.
- Os arquivos da KingMar que vieram pelas Obrigações foram reaproveitados.
- Fechou o vazamento: o arquivo do sócio aparecia para toda a empresa.
- Arquétipo lido do HTML
- Ao subir o arquivo da empresa, o arquétipo sai da capa do relatório (a KingMar dá Hades).
- O Admin pode trocar o arquétipo ou pedir para ler do arquivo de novo.
- Boneco Raul
- Entrou na lista de personagens da sala, já com a jaqueta azul-marinho.
- PRs para produção abertos (sem merge): finance_app #48 e frontend_app2 #16.
- ⚠️  Antes do merge, rodar em produção add_catalog_pillar.sql e add_arena_report_user_id.sql.

## 15/10/2026

- Arena / Sala
- Sala passou a filtrar as entregas pelo escopo do Atlas, como o Admin já fazia (caso KingMar).
- Explicado por que o ciclo anterior (Set/26) aparece vazio na Sala. É desenho: o plano cria ciclo passado como standby.
- A TV agora mostra o logo da empresa mesmo sem índices cadastrados.
- Rótulo de dono nas versões do perfil psico no histórico.
- Bonecos novos: Andrei e Felipe. O Felipe usa a foto 2, espelhada.
- Fix da aba "Entregas da Otto" vazia para os analistas em produção. O backend bloqueava a leitura do catálogo para quem não era o dono.
- IA / OpenRouter
- Conferi que o id anthropic/claude-sonnet-5.5 existe no catálogo.
- O erro "formato inválido" no Roadmap vinha do JSON em cerca ```json. Corrigi o runner e ele agora loga o início da resposta inválida.
- Teste em staging: o crédito já funciona (custou US$0,02), e o resultado do reteste está pendente.
- Entrega
- PR #17 (frontend) já tinha sido mesclado em 14/10.
- PR #49 (backend) e PR #18 (frontend) abertos e aguardando a aprovação do Head de Delivery e o seu merge. Nenhum dos dois tem migration.
- Ticket 01, extrator de HTML para texto (html_text_extractor.py): testes escritos antes e vistos falhando. Descobri na hora um erro meu, que era perder o <title> quando ele estava
- dentro de <head>, e corrigi com teste.
- Ticket 02, teto de tamanho: o limite é de 60 mil caracteres (AI_FILE_MAX_CHARS, no .env.example). Ele corta em fronteira de linha e dá erro claro para HTML quase vazio, como os
- montados só por JavaScript.
- Ticket 03, leitor de entrega (delivery_file_reader.py): checa empresa, arquivo ativo e visibilidade do cliente antes de tocar o storage. Erros não revelam se o arquivo existe nem
- detalhes do storage. Nesse ticket não vi o teste falhar antes de implementar.

## 16/10/2026

- Leitura de HTML pela IA (fase 2): tickets 01 a 05 prontos, ou seja, extrator de texto, teto de tamanho, leitura com permissão, agente de resumo e endpoint por arquivo.
- Direção ajustada: o plano passa a mirar um relatório dos arquivos do cliente. A análise do cliente com decisões sugeridas ficou parqueada até a conversa com o Head de Delivery.
- Ticket 06: relatório dos arquivos HTML do cliente. O GET só lê o cache e não custa nada. O POST gera os resumos que faltam, até 5 por chamada. Commit 8c74e4c, 1095 testes verdes.
- Seletor da tela preta (Arena e Portal): agora lista só empresas Ativo ou Onboarding. Commit 1587f85 no frontend, 637 testes verdes.
- Docs e memória: spec, tickets, arena.md e status-projeto-cliente.md atualizados.
- Ticket 07 do assistente de IA (Fase 3) concluído e enviado para staging (commits 942864a e e264e25):
- Migration add_assistant_conversation_nullable_bu.sql e business_unit_id opcional no modelo AIConversation.
- Setting AI_ASSISTANT_RATE_LIMIT (padrão 30 perguntas por usuário por hora).
- AssistantMessageService: conversa, histórico das últimas 6 mensagens, limite por hora e auditoria.
- SqlAssistantStore, AssistantController, rota POST /assistant/message (só ADMIN) e schema da requisição.
- Cache de trechos compartilhado entre requisições no recuperador.
- Testes: 8 do serviço, 9 do endpoint e 1 do cache; tests/ai_orchestrator com 238 passando.
- Documentação no .env.example (AI_ASSISTANT_RATE_LIMIT e assistant_answer no mapa de modelos) e graphify update.
- Pendente do usuário: rodar a migration em staging (e em produção antes do merge) e incluir assistant_answer no OPENROUTER_AGENT_MODEL_MAP do Render de staging. Próximo: ticket 08 (widget flutuante no frontend).
- Assistente flutuante do analista (Fase 3), tudo em staging e testado em backend e frontend:
- Leitura de PDF, Excel, Word, CSV e TXT das entregas pela IA, com as mesmas regras de permissão do download (ticket 09).
- Chat antigo removido do frontend e documentação do assistente criada (ticket 10).
- Botão do assistente corrigido: voltou a aparecer na Arena (pílula verde "Assistente").
- Script de medição de corpus corrigido e com opção para medir todas as empresas.
- Medição em staging (35 empresas) e em produção (somente leitura): em produção a RTREES (125.444 caracteres) passava do teto de 120.000 e a Fermaplast (118.586) estava no limite.
- Teto do contexto direto subiu de 120.000 para 250.000 caracteres: todas as empresas atuais ficam no degrau 1. O degrau 2 (BM25) segue disponível para empresas maiores no futuro.
- Migration do assistente rodada em staging e deploy no ar.
- Pendente para segunda: checklist de produção (migration, chave e variáveis do OpenRouter, merge dos PRs #49 e #18), PR reativando a exigência da chave, e teste do assistente com a RTREES e as perguntas reais dos analistas.

## 19/10/2026

- Resumo de 19/10/2026 (finance_app + frontend_app2, tudo em staging):
- Nota lida do HTML do relatório alimentando os cards de Maturidade e Performance (prioridade sobre o cálculo legado; override manual via PATCH; migration add_arena_report_nota.sql rodada em staging, falta produção).
- Logo da plataforma/Arena/Portal em verde-limão #AEF23A, 76px.
- Cabeçalho padronizado (64px, logo a 12px da borda) entre plataforma, Arena e Portal, sem deslocamento ao trocar de tela.
- Empresa selecionada (ADMIN/CFO) persiste no F5, sem herança entre usuários.
- Seletor de empresas dentro de Arena/Portal só com Ativo/Onboarding (filtro completo só na tela inicial).
- Diagnóstico das falhas "Jornada sumiu/ciclos não puxam" em staging: causa foi migration pendente.
- Jornada (Arena e Portal): nova seção "O que precisamos de você" com as obrigações pedidas no Admin (Detalhes, prazo, enviar/retirar arquivo, status Pendente/Em análise), reaproveitando "Minhas obrigações"; atalho a partir de "Entregas do cliente" na matriz.
- Aviso in-app ao analista: sala.insumos.notificacao por papel (staff = em análise; cliente = a enviar) com badge na aba Jornada, zero migration; e-mail segue em standby.
- Equipe Otto baixa o arquivo enviado e usa "pedir de novo" direto na Jornada; nome do arquivo com ícone, sublinhado e dica para parecer clicável (também no Admin).
- Spec/tickets em .scratch/jornada-insumos-cliente, docs/modulos/arena.md atualizado, testes novos (backend na linha de base de 13 falhas antigas; frontend 657/657), commits e push em staging.
- Pendentes: rodar add_arena_report_nota.sql em produção antes do merge; checklist de produção; PRs só quando pedido.
- Desde o último check-in (19/10/2026):
- Assistente Otto: retrato da empresa corrigido (nome da empresa na primeira linha, status em texto humano, entregas entregues não aparecem mais como "pendente"). Em staging.
- Rodonaves (2 projetos, Sprints + Squads): diagnóstico completo. Faltava sincronizar com o Atlas e depois "Sincronizar ciclos" (ciclos em cache). Sem mudança de código.
- Fix: mesmo entregável em dois projetos agora soma os meses (Gestão de Liquidez sumia de Nov em diante). Corrigido no sync e no relatório Atlas × Otto. Testado e validado pelo usuário. Em staging.
- Relatório Atlas × Otto: não acusa mais divergência quando o mesmo entregável aparece em dois projetos. Em staging.
- Status da empresa com 2 projetos (Rodonaves aparece "Offboarding"): SQL ajustada (ativo > onboarding > standby > offboarding > encerrado > cancelado) e prompt Lovable pronto em docs/prompts-lovable/prompt-lovable-multiprojetos.md. A SQL roda na Edge Function do Atlas, então só vale após colar o prompt (aguardando acesso ao Atlas).
- MTF sem kickoff: o Atlas manda kickoff_date vazio mesmo com "Kickoff (início)" preenchido. Fallback para a data de início do projeto, em staging. Falta conferir via Buscar prévia.
- Zengo sem kickoff: hipótese de projeto escolhido sem kickoff (a confirmar após o prompt do Atlas).
- Todos os commits em staging, sem migration. Pendências: acesso ao Atlas, validar MTF e Zengo, migrations de produção antes do merge dos PRs #50 e #19.

## 20/10/2026

- Assistente Otto por perfil (analista x cliente) — finance_app, staging, 20/10/2026:
- Etapa 1: perfil vem da sessão (analista = alcance total na empresa selecionada; cliente só na própria empresa, com checagem de acesso e módulo Arena/Portal); cache de trechos e do agente separado por perfil; widget do cliente atrás da flag VITE_ASSISTANT_CLIENT.
- Etapa 2: prompt por perfil; escopo contratado (Atlas) e insumos pendentes calculados no backend, com respostas exatas ("analista ainda não anexou o arquivo" vs "fora do escopo contratado, pode ser contratado"); Maturidade/Performance tratados como escopo.
- Fix: assistente dizia "nenhum insumo pendente" porque o teto do retrato (2000) cortava os insumos; insumos primeiro, escopo compacto, teto 5000, lista TODOS os pendentes e em análise; cliente não vê mais a citação "Situação atual".
- Fix visual: bolhas do chat cortadas pelo ScrollArea do Radix (display:table); trocado por div com scroll.
- Conversa social sem chamar o modelo (saudação, agradecimento, despedida, com vocativos tipo "obrigado, meu querido") e perguntas fora de contexto com resposta cordial e bem-humorada fixa do backend.
- Triagem em 3 camadas (74dc35e): regra do backend (custo zero) → roteador barato que só devolve a rota social/fora_de_contexto/negocio, sem dado da empresa e falha-segura para "negocio" → modelo bom só para assuntos de negócio.
- Testes: 361 do orquestrador passando; suíte completa 2639 passando (13 falhas pré-existentes). Docs atualizadas em docs/modulos/assistente-ia.md. Tudo em origin/staging, sem migration.
- Pendente: configurar assistant_triage no OPENROUTER_AGENT_MODEL_MAP de staging (modelo barato, confirmar ID/preço/política de não treino) e testar; antes da produção, definir AI_ASSISTANT_RATE_LIMIT do cliente e conferir o limite da chave.
- Checkin completo do dia 20/10/2026 — Assistente Otto por perfil (finance_app + frontend_app2, tudo em staging, sem migration):
- BACKEND (finance_app)
- Etapa 1 (e536abf): perfil do assistente vem da sessão (analista/ADMIN com alcance total na empresa selecionada; cliente só na própria empresa, exigindo acesso à empresa e módulo Arena/Portal); cache de trechos e do agente separado por perfil; 403 com mensagem fixa e 401 para sessão inválida.
- Etapa 2 (f1eecdd): prompt por perfil; escopo contratado (Atlas) e insumos pendentes calculados no backend, com respostas exatas ("o analista ainda não anexou o arquivo" vs "fora do escopo contratado, pode ser contratado"); Maturidade/Performance tratados como escopo; cliente não vê notas internas.
- Fix (6357fb3 e 9bad00b): assistente dizia "nenhum insumo pendente" porque o teto do retrato (2000 caracteres) cortava os insumos; agora insumos e escopo vêm primeiro, escopo compacto, teto 5000, lista TODOS os pendentes e em análise; citação "Situação atual" removida da resposta do cliente.
- Conversa social e fora de contexto (a7fb961, 0229949): saudação, agradecimento e despedida respondidos pelo backend sem chamar o modelo (inclui vocativos como "obrigado, meu querido"); perguntas sem relação com a plataforma recebem resposta cordial e bem-humorada fixa; vale para analista e cliente.
- Triagem em 3 camadas (74dc35e): regra do backend (custo zero) → roteador barato que só devolve a rota social/fora_de_contexto/negocio, recebendo só o texto da mensagem e sem dado da empresa, com falha-segura para "negocio" → modelo bom só para assuntos de negócio. Desligada até configurar assistant_triage no OPENROUTER_AGENT_MODEL_MAP.
- FRONTEND (frontend_app2)
- Assistente visível ao cliente na Arena/Portal atrás da flag VITE_ASSISTANT_CLIENT (0c0b26b); o analista (ADMIN) segue sempre vendo.
- Ajuste visual das bolhas (771798c, b6ec535): o ScrollArea do Radix (display:table) cortava as laterais; trocado por div com scroll.
- QUALIDADE
- TDD/SDD em todas as etapas: 361 testes do orquestrador passando; suíte completa 2639 passando (13 falhas pré-existentes, as mesmas de antes); frontend 659 passando; docs em docs/modulos/assistente-ia.md; grafo atualizado.
- PENDENTE
- Configurar assistant_triage no OPENROUTER_AGENT_MODEL_MAP de staging (modelo barato; confirmar ID, preço e política de não treino) e testar.
- Teste manual em staging com a flag do cliente ligada (insumos do Kingmar, fora de contexto, visual das bolhas).
- Antes da produção: definir AI_ASSISTANT_RATE_LIMIT do cliente e conferir o limite da chave.

## 21/10/2026

- Checkin 2026-10-21 (finance_app, branch staging, tudo commitado e enviado)
- Assistente do cliente (prompt do Head) — 5/5 tickets, zero migration:
- Prompt do Head no assistente do cliente + verificador de números tolerante a formato
- Cálculos declarados (calculations) recalculados no backend
- "Fonte" montada pelo backend; cliente sem painel de trechos/sugestões
- Exemplos do Head como aceite, lint de estilo e docs
- Testes: zerei as 13 falhas crônicas da suíte.
- Plano de testes de integração reais (banco + Redis + API), tickets 01 a 09 de 11:
- 01: banco de teste descartável com trava anti-produção
- 02: schema do banco de teste montado por manifesto, com teste de drift e de cobertura de migrations
- 03: fixtures de app real, Redis de teste, factories e limpeza por módulo
- 04: fluxo de login, sessão e troca de senha obrigatória
- 05: isolamento por empresa, com inventário de rotas e mutação. Achou e corrigiu vazamento de dados entre empresas no feed (post por id e feed por empresa)
- 06: gate Arena x Portal (tabela verdade); a trava "portal sem permissão" é só do frontend
- 07: entregas, insumos e obrigações do cliente, com storage R2 em memória
- 08: testes de auditoria e Silver rodando no banco descartável (antes pulavam ou davam erro). Auditoria por HTTP (empresa, RBAC, troca de senha) sem session_id em texto puro. Suíte rápida: 2542 testes em 58 s
- 09: CI no GitHub com jobs unit, integration e slow (noturno). Repositório privado no plano Free não bloqueia merge, então o CI só avisa
- Pendências e próximos passos:
- Ticket 10 (opcional, RLS com papel otto_app) fica para amanhã cedo; o 11 (Playwright) segue adiado
- Conferir a 1ª execução real do CI no GitHub (meta: menos de 8 min)
- Dez rotas dão 500 em vez de 403 (achado do ticket 05); oferecer ticket próprio
- O fix do feed vai no próximo PR para a main (o vazamento existe em produção até o deploy). Nenhuma migration neste trabalho

## 22/10/2026

- RFI de Onboarding (api-onboarding-otto + otto-rfi-onboarding), sessão de 2026-10-16 a 2026-10-22:
- CSV amigável: 1 linha por pergunta (Pergunta/Resposta), separador ';', UTF-8 com BOM.
- Formulário: removido o slogan do rodapé e incluídos 3 itens no checklist de documentos (Organograma do financeiro, Políticas internas/financeiras, Ferramenta de fluxo de caixa).
- Reaproveitamento de respostas: o rascunho local fica 30 dias após o envio, com banner "Reaproveitar respostas / Começar do zero", seções já respondidas recolhidas e documentos já enviados sinalizados.
- Investigação do cliente Casa Lar Shop (envio de 21/10, attachments=0): causa não fechada pelos logs (só marcou os documentos ou o navegador não enviou). Analista vai perguntar ao cliente e os arquivos serão enviados por outro meio.
- Prevenção de novos casos: aviso (confirm) ao marcar documento sem anexar, verificação dos arquivos antes do envio, e logs com docs_marked e files_expected para distinguir "não anexou" de "arquivo perdido no caminho".
- Testes: pytest-cov instalado, mínimo de 70% exigido; cobertura do backend subiu de 92% para 95% (52 testes), com novos testes do upload em sessão do SharePoint (arquivos acima de 4 MB).
- Decisão registrada no README: testes automatizados do formulário (Playwright) adiados, sem data prevista.
- Tudo commitado e enviado nos dois repositórios.
- Check-in 2026-10-22 (finance_app, só backend; frontend_app2 não foi alterado):
- Ticket 10 do plano de testes de integração (RLS e papel otto_app no banco de teste) concluído e enviado para staging (3 commits):
- Bootstrap do banco de teste recria o papel de produção otto_app (login com senha fictícia local, GRANT USAGE e default privileges).
- Manifesto de schema passou a aplicar security_rls_policies, os add_*_rls_grants e fix_missing_otto_app_rls_grants.
- Novo teste test_rls_otto_app.py: toda tabela do modelo precisa de GRANT (SELECT/INSERT/UPDATE/DELETE) e de policy quando tem RLS. Sem achados reais hoje.
- Modo TEST_APP_ROLE=otto_app roda a API como otto_app: 246 testes passando em ~43 s (+16 s). Prova de mutação: sem os grants, 38 falhas e 189 erros.
- Passo novo no job integration do CI; documentação em docs/modulos/testes-integracao.md; ticket marcado como resolvido.
- CI do staging: o job unit falhava porque a fixture redis_client dava erro no teardown sem Redis. Corrigido (pula no setup, commit 08fb034). unit e integration verdes, integration em 3-4 min (meta <8 min).
- PR #51 (staging para main) mesclado manualmente pelo usuário.
- Fluxo git documentado em docs/agents/fluxo-git.md (e referenciado no CLAUDE.md): staging recebe commit e push direto, sem PR; PR só staging para main quando pedido; merge na main é sempre do usuário. Memória atualizada.
- Decisões: ticket 11 (Playwright) segue adiado; job slow roda só às 06:00 UTC na main e sob demanda.
- Pendências: 10 rotas dando 500 em vez de 403 (KNOWN_500, achado do ticket 05) para virar ticket próprio; fix do feed (24607ba) vai para produção no próximo PR; nenhuma migration neste plano.
- Check-in 2026-10-22 (tarde) — assistente de IA, finance_app, só backend, em staging, sem migration. Desde o último check-in:
- Pergunta financeira de empresa sem dados financeiros (d137da5): a resposta vinha cortada e virava erro 502 porque o limite de saída do modelo (max_tokens 1500) truncava o JSON. O limite subiu para 3000 e entrou uma regra de concisão (cerca de 150 palavras). Quando não há dados financeiros, o assistente agora explica isso e lista as entregas em produção do retrato. Validado pelo usuário em staging, com resposta bem embasada.
- Perfil admin com o mesmo estilo de resposta do cliente (c3589e4): o admin passou a usar o modelo do Head de Delivery (prompts/assistente_cliente_head.md), com o mesmo bloco de comportamento, a mesma verificação de números e o mesmo formato de cálculos. A "Fonte:" é montada pelo backend. O admin mantém citações e sugestões no painel e o cliente continua sem elas. PROMPT_VERSAO foi para head-2026-10-22.3.
- Diagnóstico por log na Hartbau (8bdda0c, e2df30b): o assistente passou a registrar o motivo de uma resposta descartada e o que a recuperação entregou ao modelo (perfil, empresa, estratégia, número de trechos e títulos).
- Regressão na Hartbau: depois do item 2, admin e cliente passaram a responder "Não encontrei isso nos dados da plataforma", mesmo com o DRE gerencial anexado. O log provou que a verificação de números descartou a resposta inteira por causa do valor "2,3" (provavelmente uma razão calculada pelo modelo e não declarada). A causa de ter começado a falhar não foi provada.
- Segunda tentativa (7cdd02f): quando a verificação descarta a resposta, o modelo ganha uma segunda chance, sabendo o que errou. O "não sei" do próprio modelo não repete. Está em staging aguardando teste.
- Cache do agente (análise, sem mudança de código): a mesma pergunta devolve a mesma resposta porque o cache fica no banco, sem prazo de validade, e a chave inclui perfil, versão do prompt, pergunta, histórico, trechos e retrato. Cache hit não chama o OpenRouter e não gasta nada. Achado: uma resposta descartada pela verificação fica gravada e se repete para aquela chave. Admin e cliente têm chaves e dados separados (o cliente só lê a biblioteca liberada e os diagnósticos), o que pode explicar a divergência entre perfis. Não é condição de corrida.
- Testes e docs: 429 testes de tests/ai_orchestrator passando; docs/modulos/assistente-ia.md e a memória do projeto atualizados.
- Decisão do usuário: nenhuma mudança nova por enquanto. Ficam como estão o cache, a temperatura e o cálculo de números.
- Pendências:
- Causa da divergência entre admin e cliente na Hartbau não provada: conferir no log do cliente o campo trechos= e se o DRE está liberado a ele.
- Respostas "Não encontrei" já gravadas no cache seguem valendo para as chaves em que ocorreram.
- Requisito do usuário: números e conclusões do assistente têm que ser determinísticos. Ideias discutidas, não aprovadas: indicadores calculados no backend, temperatura 0 e não cachear resposta descartada.
- Avisar o Head de Delivery das regras 9 e 10 do prompt.
- Nada foi para produção: o PR staging para main só sai quando o usuário pedir.

## 23/10/2026

- Check-in 2026-10-23 (finance_app, só backend, em staging, sem migration). Desde o último check-in (22/10, tarde):
- Assistente de IA: milhões em "MM" e milhares em "K" (commit f7d666b), para analista e cliente.
- Prompt do Head: a regra de unidades passou a mandar escrever "R$ 15 K" e "R$ 2,8 MM", e todos os exemplos do texto foram trocados. "R$ 15 mil" e "R$ 2,8 mi" agora são o que NÃO escrever.
- Verificador de números (numeros.py): passou a aceitar K e MM (maiúsculas ou minúsculas), mantendo mil, mi e bi para respostas antigas. Sem isso, a resposta com "R$ 2,8 MM" seria descartada como número não sustentado e viraria "Não encontrei". Número errado continua recusado (ex.: R$ 28 MM ou R$ 150 K), e "15 kg" não vira escala.
- Lint de estilo (estilo.py): o aviso se inverteu. Agora avisa quando sai "mil"/"mi" por extenso e não avisa para K/MM. O lint só avisa, nunca derruba a resposta.
- PROMPT_VERSAO subiu para head-2026-10-23.1, então o cache do agente é refeito com o novo padrão.
- Testes e docs: testes escritos antes (TDD) em test_numeros, test_estilo e test_assistant_prompt_perfil; 443 testes de tests/ai_orchestrator passando. Seção nova em docs/modulos/assistente-ia.md; grafo atualizado.
- Pendências:
- Testar na Hartbau (admin e cliente) que o assistente fala em MM e K. Não foi testado com o modelo real.
- Seguem como estavam, por decisão do usuário: o cache do agente (respostas "Não encontrei" já gravadas continuam valendo para as mesmas chaves) e a divergência admin x cliente na Hartbau, cuja causa não foi provada (conferir trechos= no log do cliente e se o DRE está liberado a ele).
- Avisar o Head de Delivery das regras 9 e 10 do prompt e da troca para K/MM.
- Nada foi para produção: o PR staging para main só sai quando o usuário pedir.
- Otto Atlas – hardening (22–23/10/2026)
- Plano SDD+TDD de hardening (docs/plano-hardening.md) com check-ins, linha de base medida e seção de retomada.
- F-02/F-03/F-05: CI no GitHub Actions (vitest+build bloqueantes; tsc/eslint informativos; Deno + SQL) e harness de testes SQL com replay das migrations. Corrigido o CI do Deno (--node-modules-dir=none).
- S-04: link público de proposta passa a ler pela RPC get_public_proposal; migration dividida em 0208 (função, já rodada no banco) e 0209 (corte do anon, a rodar após o merge).
- S-01/S-02/S-03 (parcial): helper _shared/requireUser com 6 testes Deno; 9 edge functions exigem usuário logado (marketing exige permissão); front de marketing envia o token da sessão.
- PR #3 aberto, CI verde, aguardando aprovação do Head de Delivery.
- Decisões registradas: PR único, CI mantido, bun, sem staging, não apagar branch do OpenRouter, Asana sem uso (remoção da P-03 a confirmar), TVs com aprovação obrigatória (a conferir em Config › Telas da TV).
- Pendentes: colunas de leads_list (S-01), notify-hour-request (S-03), limites nas funções de IA (S-02), testUtils (F-04), S-05 em diante, 0209 e OpenRouter ao final.

## 26/10/2026

- Resumo de 26/10/2026
- Segurança
- Rotas de dívidas, contratos, demonstrações, fluxo de caixa e chat passaram a responder 403 (antes 500/400) quando o usuário acessa outra empresa ou papel; teste de isolamento entre empresas cobrindo as rotas irmãs.
- Sanitizador de nomes de conta contra prompt injection antes de enviar à IA.
- Análise de segurança de junho reverificada gap a gap; decisões registradas em ADRs: CFO sem carteira (manter) e rate limit fail-open (manter).
- GET /jobs/{id} agora checa o dono do job (outra empresa recebe 403).
- Testes
- Testes E2E com Playwright (7 testes, 4 fluxos: troca de senha, Arena x Portal, status na Sala, logout) contra backend real, rodando no CI; secret FRONTEND_REPO_TOKEN cadastrado e os 4 jobs do CI (unit, integration, slow, e2e) verdes em staging.
- Suíte de integração: 254 testes verdes (também com o papel otto_app).
- Upload assíncrono
- Implementado com flag UPLOAD_ASSINCRONO (worker Celery no mesmo serviço, broker no Redis existente, polling transparente no frontend). Decidido não ligar: não sobem mais planilhas, só HTML e documentos. Código fica desligado e a flag foi removida do Render de staging.
- Silver/Gold registrado como fora de uso (entregas em HTML).
- Assistente de IA
- Assistente também no Portal (paridade com a Arena); perfil admin no mesmo estilo do cliente; milhões em MM e milhares em K; segunda tentativa quando a verificação descarta a resposta.
- Entrega
- PRs staging para main abertos: finance_app #52 e frontend_app2 #20. Backend sem migration. No merge: criar VITE_ASSISTANT_CLIENT=true no frontend de produção e fazer rebuild.
- Pendências: teste manual do Atlas (C.1) e merge dos PRs (do usuário).
- Otto Atlas – hardening (26/10/2026)
- Sincronizei a branch do PR #3 com a main (inclui a correção de recorrência de demandas e as migrations de QA 0208–0210), sem conflitos.
- Renumerei as migrations da S-04 para evitar colisão com a main: 0208→0211 (função get_public_proposal, já aplicada no banco) e 0209→0212 (corte do anon, a rodar após o merge). Atualizei plano, comentário no PR e memória do projeto.
- Revalidei: vitest 155 testes passando e suíte SQL ok.
- Orientei sobre o OpenRouter: chave própria do Atlas já cadastrada no Lovable; falta conferir créditos e fazer o Revert do PR #2, preferencialmente após o merge do PR #3.
- Alinhamento do deploy: merge do PR #3 → testar link público de proposta (leitura e aceite) → rodar 0212.
- Pendentes: aprovação do Head de Delivery; colunas de leads_list (S-01); confirmar remoção do painel Asana (P-03); notify-hour-request (S-03); limites nas funções de IA (S-02); testUtils (F-04); modelo das TVs (S-06); S-05 em diante.
- Desde o último check-in (26/10):
- Explicado o teste manual do Atlas (C.1): card Atlas × Otto "Sincronizar todos", entregáveis espelhando o Atlas e reteste do Brasil da Sorte.
- Análise de risco de hibernação dos bancos Supabase free (staging e produção): hoje nada no repositório protege; o /health não toca no banco. Proposta de keep-alive diário via /api/v1/health/ready fica em aberto, sem implementar.
- Descoberto risco no Render: o workspace tinha 740,93 de 750 horas free usadas no mês, com a produção ligada 24h por dia pelo ping do UptimeRobot. Esgotar suspenderia todos os serviços free, produção inclusa, até o dia 1º.
- Decisão e ação do usuário: produção (backend_app) migrada para plano pago Starter (0.5c-512mb, US$ 7/mês). Ela não dorme mais e não consome as horas free; o staging fica com as 750 h dos próximos meses.
- Staging pode ser suspenso até 01/11 se as horas acabarem; só ele é afetado. Não criar UptimeRobot para o staging.
- Registrado em memória. Nenhuma alteração de código.
- Pendentes do usuário: conferir que o plano pago continua após sincronizações do blueprint; mesclar os PRs #52 (backend) e #20 (frontend); teste manual C.1; decidir sobre o keep-alive do Supabase.

## 27/10/2026

- Desde o último check-in (27/10):
- Confirmada e consolidada a decisão do Render: só o backend de produção (backend_app) está no plano pago básico (0.5c-512mb). Ele não dorme mais e não consome as 750 h free mensais; o staging segue free, com cold start, e agora as 750 h sobram. Selo conferido pelo usuário, continua pago.
- Atualizada a lista de pendências: Render saiu das urgências. Ressalva de acompanhamento: o render.yaml do repositório ainda diz plan: free para o serviço mycfo-api, nome diferente de backend_app; não confirmado se algum blueprint pode reverter o plano.
- PRs #52 (backend) e #20 (frontend) aguardam aprovação do Head de Delivery. No merge (do usuário): criar VITE_ASSISTANT_CLIENT=true no frontend de produção + rebuild; não criar UPLOAD_ASSINCRONO.
- Aviso futuro registrado em memória: renovar o secret FRONTEND_REPO_TOKEN (CI e2e) antes de 2027-10-27; lembrar só perto da data.
- Nenhuma alteração de código.
- Pendentes: teste manual do Atlas (C.1) em staging; decidir sobre o keep-alive do Supabase (staging e produção); decidir o que fazer com o UptimeRobot da produção.
- Otto Atlas – hardening (27/10/2026)
- S-04 concluída e verificada no banco vivo: proposta pública agora só via RPC get_public_proposal (migrations 0211 e 0212 aplicadas; link testado em aba anônima). PR #3.
- F-01 (diagnóstico do banco vivo) concluída: require_approval ligado, buckets privados, nenhuma tabela sem RLS, mapeamento de policies anon sem gate de TV, funções definer executáveis por anon e verify_jwt=false nas edge functions. Resultados registrados no docs/plano-hardening.md.
- Correção de achado: command_vista_sales_pipeline() já filtrava por empresa (migration 0180); exposição era só dos deals abertos da Otto. Plano corrigido.
- S-05 e S-07a (SDD+TDD): spec no plano; testes SQL escritos antes e vistos falhar (S05_vista_pipeline_gate, S07_anon_tv_gate); migration 0213_anon_tv_gate.sql (guarda na função do pipeline + gate de TV em objectives, key_results, strategic_kpis, squads, projects, project_monthly_status, organizations, com rollback). Suíte SQL: 0 falhas.
- Front: hook useTvDevice (4 testes) extraído da /gestao-vista e aplicado na /command-vista, que agora se identifica como TV e exibe "Esta tela não está autorizada" quando necessário. Vitest: 161 testes ok.
- TV do CEO: orientado caminho Admin > Sistema > Telas da TV para autorizar.
- PR #4 aberta (chore/f01-banco-vivo). Pendente: merge, abrir /command-vista na TV do CEO, autorizar a tela e só então rodar a 0213 no banco vivo.
- Pendências decididas: /mobile-view (wip_items, wip_checkins, command_deliverables) e links legados de proposta ficam fora da 0213 até decisão; próximo: consulta de contagem das propostas legadas e S-01.
- Atlas – hardening (27/10), desde o último check-in:
- S-05/S-07a: migration 0213 (gate de TV) mergeada (PR #4) e aplicada no banco vivo; verificado que as policies anônimas abertas sumiram, aba anônima sem dados e TV do CEO autorizada.
- PR #5 (aberta): S-01 leads_list com colunas explícitas (sem select *) e S-03 notify-hour-request só notifica solicitante/alvo/aprovador (403 para os demais), com testes.
- PR #6 (aberta): CI com job que abre issue atribuída ao responsável (e-mail do GitHub) quando a main quebrar.
- PR #7 (aberta): S-02 nas funções de IA capacity-plan-ai, extract-wip-demands e market-intelligence: validação de corpo com zod (400), limite de payload (413), timeout de 90s (504); helper compartilhado aiGuard e 27 testes Deno; plano de hardening atualizado.
- PR #8 (aberta, empilhada sobre a #7): reaplicação da migração de IA para o OpenRouter com a chave de produção do Atlas; também migrado o callAI do Morning Brief, que a migração antiga não cobria; modelos conferidos no catálogo do OpenRouter.
- Análise da arquitetura do Agente Atlas: hoje usa o gateway Lovable (migração OpenRouter estava revertida), por isso não houve cobrança no OpenRouter; agente só propõe e a gravação ocorre após confirmação humana.
- Definida a meta de testes (>70% de cobertura, alerta por e-mail quando a main quebrar, sem bloquear o CEO) e a sequência seguinte: branch de testes, depois S-11/S-12.
- Aguardando leitura e aprovação do Head de Delivery das 4 PRs (#5, #6, #7, #8). Testes: Vitest 161, Deno 27, suíte SQL 0 falhas.
- Desde o último check-in (27/10, manhã):
- Arena (frontend_app2 + docs, tudo em staging, sem migration)
- Sponsor e Financeiro padrão: os bonecos spon e fin2 eram clientes reais de uma entrega pontual e foram removidos do catálogo. Sponsor agora usa um boneco genérico; o Financeiro só aparece quando há financeiro cadastrado.
- Cargo abaixo do nome na tag da sala para todas as figuras (antes só Cassiano e Camila): vale para quem tem pessoa real ou cargo escrito no Admin.
- Admin: a miniatura do card "Personagens da sala" agora mostra o mesmo boneco da sala (Kaio e Ronaldo apareciam com avatar diferente). Causa: a miniatura usava o boneco do lugar vago, e não o sprite real de cada assento.
- Tag de nome de Cassiano e Camila só aparece no hover, como as demais figuras.
- Removidas as bolinhas verde/amarela de pendência sobre as figuras; basta clicar no avatar para abrir o painel.
- Testes escritos antes (vitest 695/695, tsc limpo) e documentação em docs/modulos/arena.md.
- Infra e entrega
- Workflow de keep-alive dos bancos Supabase (staging + produção, diário às 12:00 BRT via /health/ready) com documentação.
- Abertos os PRs staging para main: frontend_app2 #21 e finance_app #53 (sem migration; CI do backend verde). O merge é do usuário. Depois do merge do backend, rodar "Run workflow" do keep-alive uma vez para conferir.
- Confirmado que os PRs #52 e #20 já estavam mesclados e que o botão Equipe Otto/Clientes em Usuários e Acessos já estava em produção (o print sem o botão era cache; resolveu com F5).
- Atlas (C.1, teste manual em staging)
- Urso Polar e Brasil da Sorte conferidos e batendo com o Atlas. Casa Lar Shop resolvida com "Sincronizar todos". Zengo Uniformes (cliente real) segue como sem_escopo, aguardando o analista; nada alterado.
- Combinado para amanhã
- Dívida técnica será a primeira frente: CI próprio do frontend, consulta de bonecos removidos salvos por empresa, sanitização de nomes de conta; Silver/Gold e upload assíncrono só serão desativados, sem apagar código.

## 28/10/2026

- Atlas – hardening e IA (28/10), desde o último check-in:
- PRs #5 (S-01 leads_list com colunas explícitas + S-03 notify-hour-request só para solicitante/alvo/aprovador), #6 (CI abre issue/e-mail quando a main quebrar) e #7 (S-02: validação de corpo com zod, limite de payload e timeout de 90s nas funções de IA) aprovadas e mergeadas.
- Detectado que a PR #8 (migração para o OpenRouter) foi mergeada na branch da S-02 e não na main (base não reapontada); preparada e mergeada a PR #9 como correção, já incluindo a função newsletter-daily, que a migração original não cobria (nenhuma função de IA aponta mais ao gateway Lovable; LOVABLE_API_KEY só resta para e-mail e Outlook).
- Deploy das edge functions solicitado ao Lovable em dois lotes (9 funções das PRs #5/#3/#7 e 14 funções da #9); horário de deploy conferido na tela.
- Migração validada em produção: o Agente Atlas já passa pelo OpenRouter (gasto visível no painel, ~US$ 0,061 na primeira consulta com o modelo GPT-6 Astra).
- Modelo do agente trocado para um econômico em Gestão do Atlas › Agente Atlas (Astra US$ 10/50 por 1M tokens → opção ~100x mais barata); modelos gratuitos descartados por privacidade, cota e instabilidade nas ferramentas.
- Esclarecido o custo antigo: a IA saía dos créditos do workspace do Lovable (invisível), agora tem conta e chave próprias no OpenRouter com gasto visível por requisição; fornecida consulta SQL para estimar o gasto histórico do agente.
- Mapeado onde estão as telas de teste no Atlas; constatado que TrafficDashboard (leads), CapacityPlanTab e o pedido de horas não estão ligados a nenhum menu hoje (site-analytics, capacity-plan-ai e notify-hour-request sem tela que as use).
- Plano de hardening: item de custo de IA registrado (branch local docs/custo-ia-e-deploys, ainda sem push); memória atualizada com o histórico do OpenRouter.
- Pendente: testar áudio/PDF do agente, Importar por IA e Morning brief; acompanhar custo de IA na 1ª semana; depois, branch de testes (cobertura >70%, catraca no CI, workspace_isolation no CI) e S-11/S-12.
- Check-in 2026-10-28:
- Confirmado que os PRs #21 (frontend_app2) e #53 (backend) foram aprovados e mesclados na main; staging e produção alinhadas.
- Dívida técnica, item 1: criado CI próprio do frontend_app2 (.github/workflows/ci.yml) com tsc -b, vitest run (695 testes) e vite build, rodando em PR para main e em push na staging/main. Commit abe9dbd no frontend.
- Documentado em docs/modulos/testes-e2e.md (commit 0fedd52 no backend). Ambos enviados para staging.
- Identificado e anotado como pendência: eslint 9 sem eslint.config.js (lint ficou fora do CI de propósito).
- Próximos itens da dívida técnica a confirmar: consulta read-only a config.personagens (fin2-*/spon-costas-dir), sanitização de nomes de conta, e desativar (sem apagar) Silver/Gold e upload assíncrono.
- Check-in 2026-10-28 (complemento, desde o último envio):
- Dívida técnica item 4: confirmado que o sanitizador de nomes de conta já era completo (invisíveis, Unicode, instruções, 80 caracteres); fechada a lacuna de defesa em camadas em _format_dre_payload (dre_analysis_pipeline.py), com teste.
- Dívida técnica item 2: Silver/Gold desativado sem apagar nada, via flag SILVER_GOLD_ATIVO (padrão false). O upload não enfileira mais a agregação para uma fila sem worker (mensagens órfãs no Redis). Testes novos e doc docs/modulos/silver-gold-desativado.md.
- Dívida técnica item 3: conferido que o upload assíncrono já estava desligado (UPLOAD_ASSINCRONO=false, fora do render.yaml); nenhuma mudança necessária.
- Dívida técnica item 5: consulta somente leitura no banco de staging por bonecos fin2-*/spon-costas-dir em config.personagens retornou zero linhas (produção não verificada).
- Lint do frontend: criado eslint.config.js (eslint 9) e limpos 15 erros sem efeito em comportamento (imports sem uso, comentários órfãos, interface vazia); erros 46 para 31. Pendências (30 any, 13 exhaustive-deps, 20 avisos de hot-reload) registradas em docs, sem mexer.
- CI próprio do frontend_app2 rodou e passou no GitHub nos 3 commits. Suíte unitária do backend: 2761 testes verdes; CI da staging (unit + integration) verde.
- Abertos os PRs staging para main: frontend_app2 #22 e finance_app #54 (sem migrations).
- Atlas – testes, segurança e desempenho (28/10), desde o último check-in:
- Nova passada geral de arquitetura, segurança e desempenho. Achados: cobertura de testes do front em 1,26% (lib 19%, hooks 1,7%, telas 0,4%), bundle inicial de 6,9 MB (1,98 MB gzip) sem lazy-load, função bootstrap-admin pública, funções SECURITY DEFINER executáveis por anon, consultas sem paginação (limite de 1.000 linhas), CORS aberto e 442 select('*').
- Spec SDD de cobertura (docs/spec-cobertura-testes.md): metas em camadas (lib e _shared 90%, hooks 75%, telas 60%, auth das edge functions 100%, RPCs públicas 100%), ondas 0–5 com critérios de aceite e TDD com prova de mutação. Gate: só falha PR da TI; na main só alerta por e-mail.
- Onda 0 (T-00/T-02): medição de cobertura por camada com catraca no CI e isolamento de workspace com dados sintéticos (I01) no lugar do script que dependia de dados reais.
- Onda 1 (T-01): harness de testes com Supabase falso (que corta em 1.000 linhas como o banco real), providers e builders.
- Segurança de edge functions (T-10/T-11/T-12): contrato de auth (toda função exige usuário ou está numa allowlist com o mecanismo) e remoção da bootstrap-admin, que criava admin sem login; função também excluída do deploy pelo Lovable. auth-email-hook confirmada como correta (assinatura validada pelo SDK).
- Desempenho (T-20/T-21): rotas com lazy-load, Suspense e recarga única quando o chunk falha após deploy; JS inicial de 1.979 kB para 229 kB gzip, com orçamento de 300 kB no CI.
- Superfície anon (T-13/T-14): teste S11 (RLS em todas as tabelas, snapshot das policies anon/public, funções SECURITY DEFINER classificadas). Achado: REVOKE só de anon não adiantava porque PUBLIC mantinha EXECUTE em 101 funções.
- S-12 (migration 0214): REVOKE de PUBLIC e anon em 18 funções, mantendo authenticated; TV, Gestão à Vista e RPCs públicas por token preservadas. Rodada no banco vivo.
- Paginação (T-23): fetchAllRows ganhou 8 testes; bug real corrigido em fetchReceivables (truncava em 1.000 linhas); catraca de consultas sem paginação com baseline 50.
- E-mail da issue #10 (main quebrada em 5ac90331): não veio do nosso trabalho; commit do Lovable que só mexeu em .lovable/plan.md; falha foi 404 do registry npm ao baixar o rollup, passageira; a main seguinte passou.
- PR #11 aberta (test/spec-cobertura → main), com merge da main, 238 testes, build, orçamento de bundle e suíte SQL 7/7 verdes; aguardando leitura e aprovação do Head de Delivery.
- Pendente: paginar as demais consultas (horas, contratos, WIP) um commit por consulta; depois T-15/16/17/22/24/25, T-30+ e Onda 4; fechar a issue #10.

## 29/10/2026

- Resumo de 29/10/2026:
- Diagnóstico do e-mail do keep-alive dos bancos (28/10): produção OK (5s); staging falhou com HTTP 503. A resposta veio do Render ("Service Suspended", x-render-routing: suspend), ou seja, o serviço de staging está suspenso. Não é defeito do código nem do banco; causa da suspensão não verificada (ver painel do Render). Registrado em memória.
- Dívida técnica, consulta fin2/spon em PRODUÇÃO (rodada pelo usuário): 1 linha, só na cena padrão (personagem otto3 com avatar fin2-sentado-dir). Nenhuma cena de cliente afetada. Após o merge do PR #22 o código ignora o avatar inexistente e o otto3 cai no boneco padrão (sem erro). Ponto fechado.
- CI completo (unit, integration, e2e, slow) rodado manualmente na branch staging: os 4 jobs verdes. Isso valida o e2e e o FRONTEND_REPO_TOKEN, que ficavam pulados nos PRs.
- PRs #22 (frontend_app2) e #54 (backend) prontos para merge pelo usuário, sem migrations.
- Avisos do GitHub Actions (Node 20 deprecado em checkout/setup-python/setup-node; ubuntu-latest migrando para Ubuntu 26): sem efeito no resultado; só viram dívida técnica se o usuário pedir.
- Pendências: decisão sobre o staging suspenso no Render; merge dos PRs #22/#54 e F5 em produção; lint do frontend (30 any, 1 require, 13 exhaustive-deps, 20 only-export-components) só quando mandado.
- Check-in 29/10/2026 (Otto Atlas):
- Paginação de consultas (branch perf/paginacao-consultas, local, sem push): catraca de consultas sem paginação reduzida de 50 para 30. Cobertas: horas/alocações/capacidade, contratos e renovações, financeiro (controle de faturamento e receita contratada), check-ins de WIP, negócios, repasses de hunters/parceiros/finders e Customer Success. Cada etapa com teste vermelho antes, verde depois e prova de mutação.
- Bugs reais encontrados: agenda de receita contratada truncava em 1.000 linhas (.range(0, 9999)); métricas de negócios contavam só 1.000; repasses de hunters subestimavam (20.810 vs 25.000).
- Novo helper fetchAllRowsResult (com testes) para substituir consultas dentro de Promise.all; consultas migradas agora lançam o erro do banco em vez de ignorar.
- PR #11 (test/spec-cobertura): conflito em src/App.tsx com a rota /cockpit da main resolvido (lazyRoute mantido, Cockpit carregado sob demanda). Validado com tsc, 255 testes, build e bundle em 229 kB (limite 300). Push feito, CI verde (test-build, quality-report, edge-and-db) e PR mergeada na main.
- Alinhado o momento do merge com o CEO mexendo no chat do Lovable (sem fila no GitHub; fazer o merge com o chat parado).
- Pendências: faltam 30 consultas na catraca (decisão: extrair para hooks vs testar componentes); depois T-15/T-16/T-17.
- Resumo desde o último check-in (28/10 → 29/10/2026)
- DÍVIDA TÉCNICA (28/10, após o check-in)
- Segurança: sanitização do nome de conta no _format_dre_payload (backend).
- Desativada a agregação Silver/Gold por flag (SILVER_GOLD_ATIVO), sem apagar código.
- Lint do frontend: criado eslint.config.js (eslint 9), removidos imports sem uso e eslint-disable órfãos (46 → 31 erros; restantes registrados, fora do CI).
- ARENA / PORTAL (29/10)
- Jornada: janela de 8 ciclos navegável com botões ◀ ▶ (Arena e Portal), lanes de um valor por mês sem linhas-guia, removida a linha "Perguntas"; linhas Maturidade/Performance mais baixas.
- Key financials: data-base mensal com máscara dd/mm/aaaa e aviso quando há números sem data-base; teste do Admin cobrindo data-base + 4 valores. Decisão: manter manual (opções de automação registradas em standby).
- Personagens: novos bonecos Ronaldo, Kaio e Andrei (suéter azul-marinho, substitui o anterior) no catálogo, com escalas ajustadas na sala.
- REVISÃO DE UX (plano SDD/TDD, 14 tickets) – implementados hoje
- 01: Painel usa a nota única de maturidade (HTML ou Otto Score com avaliação).
- 02: contagem única de entregas por ciclo vinda do backend; rótulos "neste ciclo" / "no contrato".
- 03: breadcrumb com a tela real; seletor de cliente só em telas de cliente.
- 04: Overview sem skeleton infinito; estado vazio da Arena sem texto colado.
- 05: removido "Administração" do menu do Portal.
- 06: EstadoVazio único (ok/aguardando/comece) e cor semântica.
- 07: Gestão de Carteiras e Customer Service escondidos do menu.
- 08: Portal com título em linha que rola, menu sem borda e contraste 4.5:1.
- 13: baixas do Portal e do Painel.
- Pendente: ticket 14 (fonte da resposta do assistente) e demais da faixa 2.
- Tudo em staging, documentação atualizada; nada enviado para produção.
- Check-in 29/10/2026 (tarde, Otto Atlas) - investigação de custo de IA e troca de chave:
- Investigado o consumo da chave OpenRouter atlas-prod (US$ 4,78 de US$ 5 em um dia, contra US$ 0,70 no dia anterior). Descartados: navegação na plataforma, créditos do Lovable (nenhuma função chama mais o gateway de IA do Lovable), newsletter (cron único às 09:30 UTC, edições publicadas de primeira, sem regeração) e o agente (só 2 mensagens em 2 dias, centavos).
- Análise do Activity: US$ 4,56 do dia foram no GPT-6 Astra (US$ 10/50 por M tokens), em 13 chamadas entre 15:28 e 16:19, todas com App "Unknown". Pelo código, só atlas-agent e newsletter-daily enviam o cabeçalho do Otto Atlas e podem usar o Astra, então essas chamadas não vieram do Atlas.
- Varredura do repositório (árvore, histórico git e arquivos locais): nenhuma chave OpenRouter versionada; .env só tem variáveis públicas do Supabase.
- Contenção feita: criada a chave atlas-prod-2, substituído OPENROUTER_API_KEY no Lovable Cloud e criado guardrail só para ela (limite de US$ 2 por dia, sem restrição de modelo, sem prompt injection/ZDR para não quebrar o Atlas).
- Pendências: testar o agente com a chave nova e conferir App = Otto Atlas no Activity; desativar a atlas-prod antiga; revisar as chaves otto-producao, otto-staging e Default key; PR com limites do agente (menos passos, resultados menores, teto de tokens por pergunta, registro de tokens por passo) e troca do modelo padrão do agente e da newsletter por um mais barato; bloqueio de alocação de demandas aos fins de semana; liberar o agente para toda a equipe só depois dos limites.

## 30/10/2026

- Check-in 2026-10-30 (tarde/noite) — Plataforma Otto (frontend + docs, tudo em staging)
- Jornada do Portal idêntica à da Arena (mesmas medidas, posição e tamanhos; componente único).
- Botão de tela cheia removido do cabeçalho da Arena.
- Seletor de empresa da Arena/Portal igual ao da tela inicial (mesmas medidas, borda verde, tokens).
- Paleta do Atlas aplicada na plataforma toda (Painel, Arena, Portal): fundo neutro quase-preto, bordas e cards do Atlas, lima #c1f35e, botão primário em pílula. Plano em .scratch/paleta-atlas.
- Busca global no cabeçalho (Ctrl/⌘+K): telas + empresas (v1 de navegação), com testes.
- Menu do usuário no canto do cabeçalho (nome + avatar lima, Alterar senha/Sair); saiu do rodapé da Sidebar e dos botões soltos da Arena/Portal. Fundo da barra de topo ajustado.
- Investigação do Monitor Auxiliar: nunca funcionou no frontend_app2 (item sem ação; Dashboard TV só existe no Lovable). Decisão pendente: remover / TV da Arena / portar.
- Documentação, ADR 0003 e memória do projeto atualizados. 804 testes passando.
- Pendências: teste manual em staging (suspenso até 1/11); decisão sobre o Monitor Auxiliar; busca em conteúdo e sino de notificações ficaram para depois.
- Check-in 2026-10-30 (Otto Atlas)
- Custo de IA / OpenRouter
- Conferi o gasto da chave nova atlas-prod-2 (~US$ 0,50 no dia): o Astra subiu de US$ 4,77 para US$ 5,28, compatível com a newsletter das 06:30 (~US$ 0,54/edição). Gasto esperado, sem sinal de uso externo.
- Orientei onde ver os logs (Activity › Explore, filtro por chave, View logs com coluna API Key e App).
- Chave antiga atlas-prod desativada (não excluída; excluir após uma semana sem erro 401). Chaves otto-producao, otto-staging e Default key são de outro projeto e ficam como estão.
- Proposta de redução de custo da newsletter: Astra (~US$ 11/mês) para Sonnet 5.5 (~US$ 2/mês).
- PR #12 (mergeada): card "Agente Newsletter" configurável
- Novo card em Atlas › Agentes, abaixo do Agente Atlas, com seletor de modelo e de raciocínio.
- newsletter-daily lê modelo e raciocínio de newsletter_settings (padrão Claude Sonnet 5.5 + médio; valor inválido ou :free cai no padrão).
- Migration 0219 (colunas model e reasoning_effort) rodada pelo usuário; lista de modelos compartilhada em src/lib/aiModels.ts; tipos do Supabase atualizados.
- TDD: teste vermelho antes, prova de mutação feita; suíte completa 285 testes e tsc ok.
- Função newsletter-daily publicada pelo Lovable; card visível com Sonnet pré-selecionado. Teste real fica para a edição de segunda 02/11 às 06:30.
- PR #13 (mergeada): main vermelha corrigida
- Investiguei o alerta alert-main-broken: edge-and-db falhava desde 261e6fec (S11_anon_surface: project_status_report_access executável por anon; a 0216 revogou só de PUBLIC).
- Migration 0220 (REVOKE EXECUTE FROM anon) rodada pelo usuário; função incluída na lista revogadas do S11. Reproduzi a falha localmente com a suíte SQL (vermelho antes, verde depois, mutação confirmada).
- Main voltou a ficar verde; alerta automático validado.
- Ordem de merge conduzida: #13, migration 0220, atualização da branch da #12, CI verde, merge da #12. Commits do Lovable após o botão de correção revisados (CORS compartilhado, versões fixadas do ai SDK) e CI verde.
- Outros
- Respondi sobre o campo de data ao criar demanda (Prazo; Início/Prazo/Dia alocado na Agenda v2, só em alocação direta). Possível ajuste de formulário junto da PR de bloqueio de fins de semana.
- Memória do projeto atualizada com o estado do incidente e as pendências.
- Pendências
- Conferir a newsletter de 02/11 (Sonnet 5.5, ~US$ 0,10 no Activity).
- PR de limites do agente (passos, histórico, teto de tokens, retentativas da newsletter, modelo padrão mais barato), aguardando aval.
- Bloqueio de alocação de demandas nos fins de semana; depois liberar o agente para toda a equipe.
- Branch perf/paginacao-consultas: merge com a main e aval para PR.
- Desde o último envio (30/10):
- PR #14: card "Agente Status Report" em Atlas › Agentes (modelo e raciocínio configuráveis em project_status_report_settings, migration 0221). A função project-status-report passou a ler a configuração, com padrão Gemini 3.8 Flash e raciocínio baixo, e a enviar HTTP-Referer/X-Title. Isso elimina o Astra fixo que causou o gasto de US$ 4,56 em 29/10. Mergeado, migration rodada, função publicada e já em uso (Sonnet 5.5 + baixo).
- Diagnóstico do incidente de custo: causa provável identificada (testes na função nova project-status-report), com correção do diagnóstico anterior.
- Varredura de modelos de IA hardcoded: 15 edge functions mapeadas (modelo, tamanho de entrada/saída, recursos como tool call, visão e JSON).
- Plano SDD/TDD de roteamento de modelos por tiers (docs/plano-roteamento-modelos-ia.md): tiers como listas aprovadas (Google, OpenAI, Anthropic), menor custo estimado dentro do degrau, subida só por validação objetiva, teto de US$ 0,25 por chamada, fases e ordem de 7 PRs.
- Implementação do núcleo do roteador (supabase/functions/_shared/ai: política, preços, validação, roteador, callAi) com TDD e prova de mutação; 329 testes passando, tsc limpo e deno check ok.
- Guarda de CI: falha se surgir função de IA fora do sistema de tiers ou modelo citado fora da política; falha na main dispara a issue main-quebrada por e-mail.
- PR #15 aberto (núcleo + guarda, sem mudança em produção), aguardando CI, aprovação e merge. Migração das 15 funções para o roteador fica para segunda (02/11), por causa do CEO no chat do Lovable.

