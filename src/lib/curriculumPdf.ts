/**
 * Converte o Markdown do currículo oficial para HTML estilizado fielmente ao layout
 * original do PDF (título principal em azul #1f4e79, texto justificado, bullets com recuo
 * e links clicáveis) e dispara a geração de PDF A4.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineMarkdown(raw: string): string {
  let text = escapeHtml(raw);

  // Markdown links: [label](url)
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold: **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Auto-link email if not already inside an anchor
  text = text.replace(
    /(^|[\s|])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=$|[\s|])/g,
    '$1<a href="mailto:$2">$2</a>'
  );

  // Highlight LinkedIn / GitHub on contact line if plain text
  text = text.replace(
    /(^|\|\s*)(LinkedIn)(?=\s*\||$)/g,
    '$1<a href="https://www.linkedin.com/in/eduardo-busatto" target="_blank" rel="noopener noreferrer">LinkedIn</a>'
  );
  text = text.replace(
    /(^|\|\s*)(GitHub)(?=\s*\||$)/g,
    '$1<a href="https://github.com/dubusatto" target="_blank" rel="noopener noreferrer">GitHub</a>'
  );

  return text;
}

export function renderCurriculumBodyHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];

  let inList = false;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const joined = paragraphBuffer.join(" ").trim();
      if (joined) {
        // Detect contact line (contains pipe separators and phone/email)
        const isContactLine =
          joined.includes("|") &&
          (joined.includes("@") || /\(\d{2}\)/.test(joined));
        const cls = isContactLine ? "cv-contact" : "cv-paragraph";
        htmlParts.push(`<p class="${cls}">${formatInlineMarkdown(joined)}</p>`);
      }
      paragraphBuffer = [];
    }
  };

  const closeList = () => {
    if (inList) {
      htmlParts.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    if (line === "---") {
      flushParagraph();
      closeList();
      continue;
    }

    // H1: # Nome
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushParagraph();
      closeList();
      htmlParts.push(
        `<h1 class="cv-name">${formatInlineMarkdown(h1Match[1].trim())}</h1>`
      );
      continue;
    }

    // H2: ## Seção
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushParagraph();
      closeList();
      htmlParts.push(
        `<h2 class="cv-section">${formatInlineMarkdown(h2Match[1].trim())}</h2>`
      );
      continue;
    }

    // H3: ### Subseção (ex: Empresa / Universidade)
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushParagraph();
      closeList();
      htmlParts.push(
        `<h3 class="cv-subsection">${formatInlineMarkdown(
          h3Match[1].trim()
        )}</h3>`
      );
      continue;
    }

    // Bullet item: - texto ou * texto ou • texto
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!inList) {
        htmlParts.push('<ul class="cv-list">');
        inList = true;
      }
      htmlParts.push(
        `<li class="cv-list-item">${formatInlineMarkdown(
          bulletMatch[1].trim()
        )}</li>`
      );
      continue;
    }

    // Standalone bold role line right after H3 (e.g. **Desenvolvedor / Assistente de Tecnologia Full Stack**)
    if (/^\*\*[^*|]+\*\*$/.test(line) && paragraphBuffer.length === 0) {
      closeList();
      htmlParts.push(`<p class="cv-role">${formatInlineMarkdown(line)}</p>`);
      continue;
    }

    closeList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  closeList();

  return htmlParts.join("\n");
}

export const CURRICULUM_PDF_STYLES = `
  .cv-preview-root,
  html.dark .cv-preview-root {
    font-family: Calibri, "Segoe UI", Candara, Arial, sans-serif;
    color: #000000 !important;
    background-color: #ffffff !important;
    line-height: 1.42;
    font-size: 11pt;
  }
  .cv-preview-root .cv-name {
    font-size: 21pt;
    font-weight: 700;
    color: #1f4e79;
    margin: 0 0 8px 0;
    line-height: 1.2;
  }
  .cv-preview-root .cv-contact {
    font-size: 10.5pt;
    margin: 0 0 14px 0;
    color: #000000;
  }
  .cv-preview-root .cv-contact a,
  .cv-preview-root a {
    color: #0563c1;
    text-decoration: underline;
  }
  .cv-preview-root .cv-section {
    font-size: 12pt;
    font-weight: 700;
    color: #000000;
    margin: 14px 0 6px 0;
  }
  .cv-preview-root .cv-subsection {
    font-size: 11pt;
    font-weight: 700;
    color: #000000;
    margin: 10px 0 2px 0;
  }
  .cv-preview-root .cv-role {
    font-size: 11pt;
    font-weight: 700;
    color: #000000;
    margin: 0 0 6px 0;
  }
  .cv-preview-root .cv-paragraph {
    font-size: 11pt;
    text-align: justify;
    margin: 0 0 10px 0;
  }
  .cv-preview-root .cv-list {
    margin: 0 0 10px 0;
    padding-left: 28px;
    list-style-type: disc;
  }
  .cv-preview-root .cv-list-item {
    font-size: 11pt;
    text-align: justify;
    margin-bottom: 5px;
    padding-left: 8px;
  }
`;

export function exportCurriculumToPdf(markdown: string): void {
  if (!markdown || !markdown.trim()) return;

  const bodyHtml = renderCurriculumBodyHtml(markdown);
  const printWindow = window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert(
      "O navegador bloqueou a janela de exportação. Permita pop-ups para este site e tente novamente."
    );
    return;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Curriculo-Eduardo-Busatto-Atualizado</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 20mm 18mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
    }
    body {
      padding: 0;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 24px;
      }
      .cv-sheet {
        max-width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        padding: 18mm 20mm;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
      }
    }
    ${CURRICULUM_PDF_STYLES}
  </style>
</head>
<body>
  <div class="cv-sheet cv-preview-root">
    ${bodyHtml}
  </div>
  <script>
    window.addEventListener("load", function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
