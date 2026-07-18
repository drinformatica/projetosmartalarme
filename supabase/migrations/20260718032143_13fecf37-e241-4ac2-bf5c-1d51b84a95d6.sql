
-- ============ TABELA DE PRODUTOS ============
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  psd numeric(12,2) NOT NULL DEFAULT 0,
  descricao_orcamento text NOT NULL DEFAULT '',
  descricao_proposta text NOT NULL DEFAULT '',
  no_cnae_discount boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado LÊ produtos ativos (para montar orçamento)
CREATE POLICY "authenticated read active products"
  ON public.products FOR SELECT
  TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Admin / super_admin gerenciam tudo
CREATE POLICY "admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ SEED INICIAL ============
INSERT INTO public.products (codigo, nome, psd, descricao_orcamento, descricao_proposta, no_cnae_discount, sort_order) VALUES
('4543578','CENTRAL DE ALARME INTELBRAS AMT 2018 E SMART (C/ TECLADO)',515.60,'CENTRAL DE ALARME INTELBRAS AMT 2018 E SMART (C/ TECLADO)','Central de alarme inteligente com teclado integrado, controle via aplicativo',false,1),
('4540055','CENTRAL ALARME INTRUSAO AMT 1000 SMART (S/ TECLADO)',334.12,'CENTRAL ALARME INTRUSAO AMT 1000 SMART (S/ TECLADO)','Central de alarme inteligente, controle via aplicativo',false,2),
('4543582','MÓDULO P/CENTRAL ALARME INTRUSÃO XG 2G (AMT 1000, 2018 E SMART, LITE E PRO)',228.24,'MÓDULO P/CENTRAL XG 2G','Módulo de comunicação celular 2G para transmissão de eventos',false,3),
('4543584','MODULO GSM P/CENTRAL ALARME INTRUSÃO XG 4G (AMT 1000, 2018 E SMART, LITE E PRO)',314.23,'MÓDULO GSM XG 4G','Módulo de comunicação celular 4G para transmissão de eventos',false,4),
('4860010','BATERIA Elétrica VRLA CHUMBO 12V 4,5AH XB 12SEG',70.58,'BATERIA 12V 4,5AH XB 12SEG','Bateria de backup 12V para manter o sistema ativo durante quedas de energia',false,5),
('4821000','Bateria Elétrica VRLA CHUMBO 12V 7AH XB 1270',95.01,'BATERIA 12V 7AH XB 1270','Bateria de backup 12V de alta capacidade para autonomia estendida',false,6),
('4543545','Sirene 105 dB SIR 1000 - Preta ou Branca (Sem desconto de CNAE 10%)',25.47,'Sirene 105 dB SIR 1000','Sirene de alta potência (105 dB) para acionamento sonoro',true,7),
('4541024','TRANSMISSOR UNIVERSAL (SEM FIO) TX 4020 SMART',30.20,'TRANSMISSOR SEM FIO TX 4020 SMART','Transmissor universal sem fio para expansão do sistema',false,8),
('4541071','Sensor de Movimento COM FIO IVP 1000 PET',39.93,'Sensor Movimento c/ Fio IVP 1000 PET','Sensor de movimento com imunidade a animais de pequeno porte',false,9),
('4541073','Sensor Infravermelho Passivo SEM FIO IVP 1000 PET SMART',110.70,'Sensor Sem Fio IVP 1000 PET SMART','Sensor de movimento sem fio, imune a pets, integração via app',false,10),
('4540039','CONJUNTO SENSOR S/FIO IVP1000PET SMART - 5 Peças',525.80,'Conjunto 5x Sensor S/Fio IVP 1000 PET SMART','Kit com 5 sensores sem fio para proteção de múltiplos ambientes',false,11),
('4540029','CONJUNTO SENSOR COM FIO IVP1000PET PET-6PC',227.28,'Conjunto 6x Sensor c/ Fio IVP 1000 PET','Kit com 6 sensores com fio para proteção de múltiplos ambientes',false,12),
('4540083','SENSOR MOVIMENTO PASSIVO S/FIO IVP 5000 SMART LD',126.00,'SENSOR S/FIO IVP 5000 SMART LD','Sensor sem fio de longa distância, ideal para áreas externas',false,13),
('4541076','SENSOR INFRAVERMELHO PASSIVO COM FIO IVP 7000 EX',241.98,'SENSOR C/ FIO IVP 7000 EX','Sensor externo com fio, resistente ao tempo',false,14),
('4540097','SENSOR INFRAVERMELHO PASSIVO S/FIO IVP 7000 SMART EX (Sem desconto de CNAE 10%)',365.40,'SENSOR S/FIO IVP 7000 SMART EX','Sensor externo sem fio, resistente ao tempo, integração via app',true,15),
('4540015','SENSOR MOVIMENTO PASSIVO C/FIO IVP 9000 MW (Sensor HIGH END)',170.20,'SENSOR C/ FIO IVP 9000 MW','Sensor high-end com dupla tecnologia para máxima precisão',false,16),
('4541064','Sensor Infravermelho Passivo c/Fio IVP 9000 MW MASK (Sensor HIGH END)',248.24,'SENSOR c/Fio IVP 9000 MW MASK','Sensor high-end com detecção anti-mascaramento',false,17),
('4541054','Sensor Ativo IVA 9100 TRI (Sensor ativo com Fio)',485.82,'SENSOR ATIVO IVA 9100 TRI','Sensor ativo triplo feixe para proteção perimetral',false,18),
('4540020','TECLADO PARA CENTRAIS XAT 3000 LED (Sem desconto de CNAE 10%)',72.00,'TECLADO XAT 3000 LED','Teclado LED para operação da central',true,19),
('4540038','TECLADO PARA CENTRAIS XAT 4000 LCD (Sem desconto de CNAE 10%)',219.20,'TECLADO XAT 4000 LCD','Teclado LCD com display para operação da central',true,20),
('4540045','CONTROLE REMOTO XAC 4003 (Sem desconto de CNAE 10%)',22.00,'CONTROLE REMOTO XAC 4003','Controle remoto para ativação e desativação do sistema',true,21),
('4540050','CONTROLE REMOTO XAC 4004 (Sem desconto de CNAE 10%)',27.10,'CONTROLE REMOTO XAC 4004','Controle remoto para ativação e desativação do sistema',true,22),
('4541052','Sensor de Abertura Magnético Sem Fio XAS SMART - (Preta ou Branco)',48.10,'Sensor de Abertura XAS SMART','Sensor magnético sem fio para portas e janelas',false,23),
('4540040','Sensor magnético XAS 4010 SMART (Sem desconto de CNAE 10%)',37.50,'Sensor magnético XAS 4010 SMART','Sensor magnético inteligente para portas e janelas',true,24),
('4541056','Sensor magnético c/fio XAS porta de aço mini (Sem desconto de CNAE 10%)',52.89,'XAS Porta de Aço Mini','Sensor magnético com fio para portas de aço (versão mini)',true,25),
('4541043','Sensor Magnético c/ Fio XAS Porta de Aço c/ Suporte (Sem desconto de CNAE 10%)',88.87,'XAS Porta de Aço c/ Suporte','Sensor magnético com fio para portas de aço, com suporte',true,26),
('4541031','Sensor magnético c/ fio XAS porta de aço s/ suporte (Sem desconto de CNAE 10%)',62.57,'XAS Porta de Aço s/ Suporte','Sensor magnético com fio para portas de aço',true,27),
('4570057','CÂMERA WI-FI VIP W 1410 MINI',260.00,'CÂMERA WI-FI VIP W 1410 MINI','Câmera Wi-Fi compacta com visualização remota via app',false,28),
('4570059','CÂMERA WI-FI VIP W 1210 C',189.92,'CÂMERA WI-FI VIP W 1210 C','Câmera Wi-Fi com visualização remota via app',false,29),
('4820225','Fonte EFB 12 NET (Sem desconto de CNAE 10%)',139.90,'Fonte EFB 12 NET','Fonte de alimentação estabilizada 12V para sistemas de segurança',true,30),
('4820224','Fonte EFB 0501 (Para câmeras Wi-Fi 05v) (Sem desconto de CNAE 10%)',76.84,'Fonte EFB 0501 (5V)','Fonte de alimentação 5V para câmeras Wi-Fi',true,31),
('4820042','Fonte EFB 1201 (Para câmeras IP 12v) (Sem desconto de CNAE 10%)',126.90,'Fonte EFB 1201 (12V)','Fonte de alimentação 12V para câmeras IP',true,32);
