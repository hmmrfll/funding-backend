FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g sequelize-cli
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npm start"]
