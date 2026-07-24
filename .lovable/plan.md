## Causa raiz

`src/routes/auth.tsx` chama `supabase.rpc("cpf_cnpj_exists", { _cnpj })` no cadastro. A função não existe em `public`, o RPC falha e o usuário vê "Erro ao autenticar" antes do `signUp`.

## Correção

Migration criando:

- `public.cpf_cnpj_exists(_cnpj text) returns boolean`
- `SECURITY DEFINER`, `STABLE`, `SET search_path = public`
- Normaliza dígitos e compara com `profiles.cnpj` normalizado
- `GRANT EXECUTE` para `anon` e `authenticated`

Sem alterações no frontend.

## Verificação

1. Cadastro com CPF inédito → envia e-mail.
2. Cadastro com CPF já existente → mensagem de duplicidade.
3. CPF inválido continua bloqueado antes do RPC.
