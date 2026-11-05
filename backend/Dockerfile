FROM node:24-slim

# Prisma cần openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy schema trước npm ci (postinstall có thể chạy prisma generate)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3001

# 1) tạo/cập nhật bảng  2) nhập dữ liệu mẫu (bỏ qua nếu lỗi)  3) chạy server
CMD ["sh", "-c", "npx prisma migrate deploy && (npx prisma db seed || echo 'Bo qua seed') && if [ -f dist/main.js ]; then node dist/main.js; else node dist/src/main.js; fi"]
