// Busca e filtros da lista de skills. Sem JavaScript, a lista inteira continua visível.
const form = document.querySelector<HTMLFormElement>('[data-filtros]');
if (form) {
  form.hidden = false;
  const items = [...document.querySelectorAll<HTMLElement>('[data-skill]')];
  const empty = document.querySelector<HTMLElement>('[data-vazio]');
  const fold = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const apply = (): void => {
    const data = new FormData(form);
    const term = fold(String(data.get('busca') ?? '').trim());
    const area = String(data.get('area') ?? '');
    const phase = String(data.get('fase') ?? '');
    let shown = 0;
    for (const item of items) {
      const match = (term === '' || (item.dataset.texto ?? '').includes(term)) && (area === '' || item.dataset.area === area) && (phase === '' || item.dataset.fase === phase);
      item.hidden = !match;
      shown += match ? 1 : 0;
    }
    if (empty) {
      empty.hidden = shown > 0;
    }
  };
  form.addEventListener('input', apply);
  form.addEventListener('submit', (event) => event.preventDefault());
}
