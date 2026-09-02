# Agenda Otto - Design System

Este documento define a linguagem visual (Design System) da **Agenda Otto**, guiando o agente de IA na criação e manutenção de componentes. 
Foi inspirado no conceito de `DESIGN.md` do projeto *OpenDesign*.

## Princípios Core
- **Vibrante e Alegre:** O aplicativo é para uso pessoal, deve passar uma sensação de energia e produtividade.
- **Clean e Espaçado:** Uso abundante de espaços em branco (margins/paddings) para não sufocar a informação.
- **Bordas Suaves:** Preferência por cantos arredondados (`rounded-xl` a `rounded-2xl` para containers, `rounded-lg` para botões e tarefas).

## Paleta de Cores (Tailwind)
- **Fundo da Aplicação:** Cinza super claro (`bg-gray-50`)
- **Superfícies (Cards, Modais):** Branco (`bg-white`) com sombras suaves (`shadow-sm` ou `shadow-2xl` para modais).
- **Texto Principal:** Cinza escuro/Quase preto (`text-gray-800`, `text-gray-900`).
- **Texto Secundário:** Cinza médio (`text-gray-500`, `text-gray-600`).
- **Cores Semânticas (Tarefas):** 
  - Usamos a paleta vibrante do Tailwind (Rose, Pink, Fuchsia, Purple, Violet, Indigo, Blue, Sky, Cyan, Teal, Emerald, Green, Lime, Yellow, Amber, Orange) nas intensidades `500` a `600`.
  - As tarefas na barra lateral recebem `border-l-4` com a cor vibrante gerada pelo ID.
  - Eventos no calendário usam a cor vibrante como fundo (opacity 100%) com letras brancas.

## Tipografia
- Fonte primária: Sans-serif (padrão do Tailwind).
- Títulos de componentes (ex: "Tarefas", Título do Modal): `font-bold` ou `font-semibold`.
- Textos interativos/Editáveis: Mudança suave de cor no hover (`hover:text-blue-600`).

## Interatividade
- **Hover States:** Todo elemento clicável deve ter feedback visual (ex: `hover:bg-gray-50`, `hover:border-blue-400`).
- **Transições:** Uso de `transition-all` ou `transition-colors` para suavizar estados.
- **Drag & Drop:** Elementos "arrastáveis" (como o handle) devem usar `cursor-grab` e reduzir opacidade (`opacity-30` para `opacity-100` no hover). Quando estão sendo movidos, a opacidade cai para `0.4`.

## Estrutura de Modais
- Fundo escurecido (`bg-black/40 backdrop-blur-sm`).
- Modal centralizado (`flex items-center justify-center`).
- Card interno com `rounded-2xl` e `shadow-2xl`, muitas vezes com um detalhe visual de cor (ex: barra superior colorida).
- Botões de ação bem delineados: Secundários (bordas), Primários (fundo escuro/azul), Destrutivos (texto/fundo vermelho).
