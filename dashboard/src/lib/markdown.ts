// Markdown de SKILL.md e esperado.md (texto de PR de terceiro) renderizado sem HTML cru e sem
// script (Dashboard §3; Segurança §7). HTML do autor sai escapado, imagem vira o texto alternativo
// (nenhuma requisição externa), e link só se for http(s), âncora ou caminho relativo da skill.
import { Marked, type Tokens } from 'marked';
import { REPO_URL } from './catalog.js';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Link relativo aponta para o arquivo da skill no GitHub; qualquer outro esquema some.
export function safeHref(href: string, skillPath: string): string | undefined {
  const value = href.trim();
  if (/^https?:\/\//i.test(value) || value.startsWith('#')) {
    return value;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('/') || value.startsWith('\\') || value === '') {
    return undefined;
  }
  return `${REPO_URL}/blob/main/${skillPath}/${value}`;
}

export function renderMarkdown(source: string, skillPath: string): string {
  const marked = new Marked({
    gfm: true,
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag): string {
        return escapeHtml(token.text);
      },
      image(token: Tokens.Image): string {
        return escapeHtml(token.text);
      },
      link(token: Tokens.Link): string {
        const text = this.parser.parseInline(token.tokens);
        const href = safeHref(token.href, skillPath);
        if (href === undefined) {
          return text;
        }
        const external = /^https?:\/\//i.test(href) ? ' rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(href)}"${external}>${text}</a>`;
      },
    },
  });
  return marked.parse(source, { async: false });
}
