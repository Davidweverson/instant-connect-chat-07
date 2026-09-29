# Restaurar o FlashChat a partir do repositório do GitHub

O repositório `Davidweverson/flash-chat-amigos` é bem mais novo que este remix (chamadas, conquistas, menções, palavras proibidas, logo, partículas, etc.) e traz 42 alterações de banco.

## O que será feito
1. Substituir o código do app por completo pelo do repositório (mantendo só a conexão com o backend deste remix).
2. Aplicar no backend novo, em ordem, todas as 42 alterações de banco do repositório (tabelas, permissões, funções, armazenamento de arquivos).
3. Publicar as funções de servidor do repositório.
4. Pedir, de forma segura, qualquer chave de serviço externo que o código exigir.
5. Testar criação de conta, envio de mensagem e recarregamento da página (o loading infinito atual).
6. Te promover a admin depois que você criar sua conta.

## Limitação
O repositório guarda o código, não os dados: contas e mensagens antigas não voltam. Todos criam conta de novo.

## Detalhes técnicos
- Copiar `src/`, `public/`, `index.html`, `package.json`, configs e `supabase/functions` do clone; não copiar `.git`, `.env`, `supabase/config.toml`, nem `src/integrations/supabase/client.ts`.
- Migrations aplicadas byte a byte; tipos regenerados depois.
