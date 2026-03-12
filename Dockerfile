FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

# Expor porta
EXPOSE 8081

# Comando para desenvolvimento (hot reload)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8081"]

