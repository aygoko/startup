# Этап 1: Сборка
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Собираем статический бинарный файл
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Этап 2: Финальный образ
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
# Копируем бинарник из этапа сборки
COPY --from=builder /app/main .
# Копируем папку public (если она нужна для статики, хотя лучше отдать это Nginx)
COPY --from=builder /app/public ./public
# Копируем .env (или передаем через docker-compose)
EXPOSE 8080
CMD ["./main"]