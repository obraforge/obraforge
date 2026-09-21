# Política de Segurança

## Canal de relato

O obraforge é uma **cadeia de suprimento de instruções para agentes de código**: skills instaladas no projeto de quem confia no catálogo. Se você encontrar uma vulnerabilidade — numa skill, na CLI, no pipeline de publicação ou no pacote publicado — reporte pelo **GitHub Private Vulnerability Reporting**:

**https://github.com/obraforge/obraforge/security/advisories/new**

**Não abra uma issue pública** para relatar uma vulnerabilidade. O canal privado existe justamente para que o relato não vire um roteiro de ataque antes de existir correção.

## Prazos

* **Confirmação do recebimento:** até 7 dias.
* **Avaliação inicial:** até 30 dias.

Esses prazos são viáveis com a equipe de manutenção atual (um mantenedor). Se o escopo do relato for maior, o andamento é comunicado dentro do próprio canal privado.

## Escopo

* As skills do catálogo (`skills/`).
* A CLI `obraforge` (`cli/`).
* O pipeline de publicação (workflows em `.github/workflows/`).
* O pacote `obraforge` publicado no npm.

## Versões suportadas

Só a **release mais recente** publicada no npm recebe correção de segurança. Não há suporte a versões anteriores.

## O que acontece depois do relato

Uma vulnerabilidade confirmada numa skill publicada leva à retirada imediata dela na próxima release de correção, com aviso no changelog. Uma vulnerabilidade na CLI, no pipeline ou no pacote segue o mesmo canal privado até a correção ser publicada.
