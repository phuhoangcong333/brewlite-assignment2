FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Biến NEXT_PUBLIC_* được "đóng gói" vào code lúc build nên phải truyền khi build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
