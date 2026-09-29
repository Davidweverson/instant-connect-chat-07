# Remix of FlashChat BETA

Crie um site de chat em tempo real para conversas entre amigos, focado em simplicidade, velocidade e visual moderno.

OBJETIVO

Desenvolver uma aplicação web de chat semelhante ao Discord, WhatsApp e Instagram, porém sem sistema de login, cadastro ou criação de conta. O usuário entra no site e já pode conversar imediatamente.

FUNCIONALIDADES PRINCIPAIS

- Chat em tempo real (WebSocket ou tecnologia equivalente)

- Entrada direta no chat sem cadastro

- Campo opcional para escolher um nome/apelido antes de entrar

- Mensagens aparecem instantaneamente para todos

- Diferenciação visual entre mensagens próprias e de outros usuários

- Exibição de horário das mensagens

- Scroll automático para a última mensagem

- Indicação visual quando alguém está digitando

- Sistema simples de salas (ex: “Sala Geral”, “Sala 2”, etc.)

INTERFACE E DESIGN

- Layout inspirado em Discord, WhatsApp e Instagram

- Interface limpa, amigável e moderna

- Tema escuro por padrão (dark mode)

- Cantos arredondados, sombras suaves e blur (glassmorphism leve)

- Animações suaves ao enviar/receber mensagens

- Ícones minimalistas e modernos

- Fonte legível e atual (ex: Inter, Poppins ou similar)

- Área de mensagens central

- Barra lateral opcional com salas ou usuários online

EXPERIÊNCIA DO USUÁRIO

- Interface responsiva (funciona bem em celular, tablet e PC)

- Entrada simples: escolher nome → entrar no chat

- Sem anúncios, sem distrações

- Feedback visual ao enviar mensagem

- Suporte a emojis básicos

- Mensagens com bolhas estilo apps de chat

TECNOLOGIA SUGERIDA

- Front-end: HTML, CSS, JavaScript (ou React/Vue)

- Back-end: Node.js com WebSocket (Socket.io ou similar)

- Sem banco de dados complexo (mensagens podem ser temporárias)

- Foco em performance e baixo consumo

RESTRIÇÕES

- Não exigir login, e-mail ou senha

- Não exigir criação de conta

- Não salvar dados pessoais

- Acesso imediato ao chat

OBJETIVO FINAL

Criar um site de chat simples, bonito e rápido para uso entre amigos da escola, com aparência profissional e experiência semelhante aos principais aplicativos de mensagens, mas sem burocracia.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://instant-connect-chat-07.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/eb74042e-ea3d-4bc8-9b34-bc8119e59848).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
