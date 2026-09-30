# Corrigir tela em branco causada pelos hooks de autenticação

## Implementação
- Transformar `useAuth` em um contexto único compartilhado por toda a aplicação, mantendo a mesma interface usada pelas telas atuais.
- Montar o provedor no topo do aplicativo para impedir múltiplos listeners e estados concorrentes de sessão.
- Manter o fluxo atual de login, cadastro, perfil, banimento e logout sem alterações visuais.
- Validar login público em recarregamentos repetidos e conferir erros do navegador e da compilação.

## Detalhes técnicos
- Separar `AuthProvider` e `useAuth`, com uma instância estável do estado e dos hooks do React.
- Registrar a decisão estrutural em `AGENTS.md` para evitar regressões.
