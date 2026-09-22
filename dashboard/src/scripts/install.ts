// Melhoria progressiva: sem JavaScript, os quatro comandos aparecem empilhados.
for (const section of document.querySelectorAll<HTMLElement>('[data-instalar]')) {
  const tabs = section.querySelector<HTMLElement>('[data-abas]');
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('[data-aba]')];
  const panels = [...section.querySelectorAll<HTMLElement>('[data-painel]')];
  const select = (id: string): void => {
    for (const button of buttons) {
      button.setAttribute('aria-selected', String(button.dataset.aba === id));
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.painel !== id;
    }
  };
  if (tabs) {
    tabs.hidden = false;
    for (const label of section.querySelectorAll<HTMLElement>('[data-rotulo]')) {
      label.hidden = true;
    }
    for (const button of buttons) {
      button.addEventListener('click', () => select(button.dataset.aba ?? ''));
    }
    select(buttons[0]?.dataset.aba ?? '');
  }
  for (const panel of panels) {
    const copy = panel.querySelector<HTMLButtonElement>('[data-copiar]');
    const command = panel.querySelector<HTMLElement>('[data-comando]');
    if (!copy || !command || !navigator.clipboard) {
      continue;
    }
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(command.textContent ?? '');
      copy.textContent = 'Copiado';
      setTimeout(() => {
        copy.textContent = 'Copiar';
      }, 2000);
    });
  }
}
