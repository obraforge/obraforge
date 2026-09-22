# Página: `/sobre`

**Objetivo:** explicar o projeto, a fronteira, a segurança e a privacidade. **Conversão:**
contribuir pelo GitHub.

**SEO:** title `Sobre — obraforge`; meta description `O que é o obraforge, o que ele não é, como
a instalação é conferida e como contribuir.` JSON-LD: `BreadcrumbList`.

## Seções

1. **O que é.** `O obraforge é o catálogo aberto de Agent Skills para arquitetura, engenharia e
   construção no Brasil. Uma skill é uma pasta com um arquivo SKILL.md: conhecimento de obra
   escrito como procedimento, que o seu agente de código carrega quando precisa. O obraforge
   guarda, valida, cataloga e distribui essas pastas.`
2. **O que não é.** Lista:
   - `Não executa nada: quem executa é o seu agente, na sua assinatura.`
   - `Não tem conta, login, cobrança nem memória.`
   - `Não entrega o resultado final de engenharia: a skill confere, estrutura, explica ou dá
     modelo. O entregável continua sendo de quem assina.`
   - `Não depende de um modelo de IA específico.`
3. **Como a instalação é conferida.** `A CLI vem do npm com procedência verificável (provenance).
   Antes de gravar, ela confere o hash de cada skill contra o catálogo da mesma versão e recusa se
   não bater. Ela não faz chamada de rede, não executa conteúdo da skill e só grava na pasta do seu
   agente.` Link para o `SECURITY.md` para relatar vulnerabilidade.
4. **Privacidade** (âncora `#privacidade`). `Este site não coleta dado pessoal, não usa cookie e
   não carrega script de terceiro. A hospedagem (Vercel) registra acessos no próprio servidor,
   como qualquer hospedagem.`
5. **Contribuir.** `As skills são escritas por quem conhece a obra. Proponha uma skill abrindo uma
   issue no GitHub; o fluxo completo está no CONTRIBUTING.md.` Links.
6. **Licença.** `Código e skills sob a licença MIT.`
