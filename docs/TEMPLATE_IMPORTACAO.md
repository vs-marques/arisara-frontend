# Template de Importação CSV

Este documento descreve o formato CSV aceito pelo sistema de importação da plataforma.

## Estrutura do Arquivo

O arquivo CSV deve conter as seguintes colunas:

### Dados Pessoais (Obrigatórios)
- **name**: Nome completo da pessoa
- **email**: Endereço de e-mail (deve ser único)
- **document**: CPF (apenas números, 11 dígitos)
- **phone_number**: Telefone (apenas números)

### Dados Pessoais (Opcionais)
- **birth_date**: Data de nascimento (formato: YYYY-MM-DD)

### Dados de Endereço (Opcionais)
- **address**: Nome da rua/avenida
- **number**: Número do endereço
- **complement**: Complemento (apartamento, sala, etc.)
- **neighborhood**: Bairro
- **city**: Cidade
- **state**: Estado (sigla: SP, RJ, etc.)
- **zip_code**: CEP (formato: 00000-000)

### Dados Empresariais (Opcionais)
- **company_name**: Nome da empresa
- **company_document**: CNPJ da empresa (apenas números, 14 dígitos)

### Dados de Transação (Opcionais)
- **points**: Quantidade de pontos
- **value**: Valor monetário (formato: 0.00)
- **transaction_type**: Tipo de transação (credit/debit)
- **transaction_date**: Data da transação (formato: YYYY-MM-DD)
- **description**: Descrição da transação

## Exemplo de Uso

1. **Baixe o template**: `template_importacao.csv`
2. **Preencha os dados**: Mantenha o cabeçalho e adicione uma linha por registro
3. **Valide os dados**: Verifique se os CPFs e CNPJs estão corretos
4. **Faça upload**: Use a interface de importação para enviar o arquivo
5. **Valide**: Execute a validação para verificar erros
6. **Preview**: Visualize os dados antes do processamento
7. **Processe**: Execute a importação final

## Regras de Validação

### CPF
- Deve conter exatamente 11 dígitos
- Deve ser um CPF válido (algoritmo de validação)
- Deve ser único no sistema

### CNPJ
- Deve conter exatamente 14 dígitos
- Deve ser um CNPJ válido (algoritmo de validação)

### E-mail
- Deve ser um formato de e-mail válido
- Deve ser único no sistema

### Telefone
- Deve conter apenas números
- Recomendado: 11 dígitos (DDD + número)

### Datas
- Formato: YYYY-MM-DD
- Data de nascimento não pode ser futura
- Data de transação não pode ser futura

### Valores Monetários
- Formato: 0.00 (com ponto decimal)
- Não pode ser negativo

## Fluxo de Processamento

1. **Upload**: Arquivo é enviado para o servidor
2. **Validação**: Dados são validados contra regras de negócio
3. **Preview**: Visualização dos dados antes do processamento
4. **Processamento**: Criação/atualização de registros no banco
5. **Logs**: Registro de todas as operações para auditoria

## Criação de Entidades

O sistema criará automaticamente:

- **User**: Usuário da plataforma
- **PersonProfile**: Perfil pessoal
- **Consumer**: Consumidor (se aplicável)
- **ConsumerCompany**: Empresa do consumidor (se aplicável)
- **Address**: Endereço
- **PersonAddress**: Relacionamento pessoa-endereço
- **Points**: Pontos do usuário
- **Account**: Conta financeira
- **Transaction**: Transação financeira
- **PointMovement**: Movimentação de pontos

## Tratamento de Erros

- **Linhas com erro**: São marcadas como inválidas mas não impedem o processamento
- **Logs detalhados**: Cada erro é registrado com linha e coluna específica
- **Relatório final**: Resumo de sucessos e falhas

## Dicas

1. **Teste com poucos registros** antes de importar grandes volumes
2. **Use o preview** para verificar se os dados estão corretos
3. **Mantenha backup** dos dados originais
4. **Verifique os logs** após o processamento
5. **Valide CPFs e CNPJs** antes do upload

## Suporte

Em caso de dúvidas ou problemas:
- Verifique os logs de erro na interface
- Consulte a documentação da API
- Entre em contato com o suporte técnico 