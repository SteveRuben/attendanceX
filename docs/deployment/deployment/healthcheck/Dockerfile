# Dockerfile pour le service de health check
FROM node:18-alpine

WORKDIR /app

# Installation des dépendances système
RUN apk add --no-cache curl netcat-openbsd

# Copie des fichiers de configuration
COPY package*.json ./
RUN npm ci --only=production

# Copie du code source
COPY . .

# Exposition du port
EXPOSE 8080

# Utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S healthcheck -u 1001
USER healthcheck

# Commande de démarrage
CMD ["node", "index.js"]