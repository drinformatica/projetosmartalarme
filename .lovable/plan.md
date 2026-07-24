## Causa raiz (confirmada)

A tela de cadastro em `src/routes/auth.tsx` chama `supabase.rpc("cpf_cnpj_exists", { _cnpj })` antes de criar a conta. Verifiquei o banco: **essa função não existe** em `public` (consulta em `pg_proc` retornou vazio). Resultado: o RPC falha, o `throw` cai no `catch` e o usuário vê "Erro ao autenticar" mesmo antes do `signUp` rodar.

O trigger `on_auth_user_created` em `auth.users` existe normalmente — o bloqueio está só na validação prévia.

## Correção

Criar a função RPC via migration:

- `public.cpf_cnpj_exists(_cnpj text) returns boolean`
- `SECURITY DEFINER`, `STABLE`, `SET search_path = public`
- Normaliza para dígitos (`regexp_replace(_cnpj, '\D', '', 'g')`) e compara contra `profiles.cnpj` também normalizado
- `GRANT EXECUTE` para `anon` e `authenticated` (cadastro roda sem sessão)

Nenhuma alteração no frontend necessária — `auth.tsx` já consome esse RPC.

## Verificação

1. Cadastro com CPF inédito → prossegue para `signUp` e envia e-mail.
2. Cadastro com CPF de profile existente → mostra "Este CPF/CNPJ já está cadastrado…".
3. CPF inválido continua bloqueado pelo `isValidCpfCnpj` antes do RPC.
