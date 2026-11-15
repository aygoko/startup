package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort    string
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	SessionSecret string

	// Старая SMTP-отправка (на вашем хостинге порты закрыты, оставлено только чтобы код компилировался,
	// пока main.go не переключён на Resend)
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string

	// Отправка писем через Resend (HTTPS)
	ResendAPIKey string
	EmailFrom    string

	FrontendURL string
	GeminiURL   string
}

func Load() *Config {
	// Пытаемся загрузить .env файл. Если его нет — используем значения по умолчанию
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ Файл .env не найден, используются переменные окружения или значения по умолчанию")
	}

	return &Config{
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBUser:        getEnv("DB_USER", "postgres"),
		DBPassword:    getEnv("DB_PASSWORD", "1488"), // TODO: смените пароль и задайте его в .env
		DBName:        getEnv("DB_NAME", "sofa"),
		SessionSecret: getEnv("SESSION_SECRET", "super-secret-key-change-in-prod-please"), // TODO: задайте свой в .env

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""), // пароль из кода убран

		ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		// onboarding@resend.dev работает без подтверждения домена, но шлёт письма
		// только на адрес владельца аккаунта Resend. Для всех — noreply@merchotsofy.ru после подтверждения домена.
		EmailFrom: getEnv("EMAIL_FROM", "onboarding@resend.dev"),

		// Ссылки в письмах (подтверждение почты, восстановление пароля) строятся от этого адреса
		FrontendURL: getEnv("FRONTEND_URL", "https://landing.merchotsofy.ru"),
		GeminiURL:   getEnv("GEMINI_URL", "http://blue.fnode.me:25534/generate"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
