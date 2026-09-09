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
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPassword  string
	FrontendURL   string
	GeminiURL     string
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
		DBPassword:    getEnv("DB_PASSWORD", "1488"),
		DBName:        getEnv("DB_NAME", "sofa"),
		SessionSecret: getEnv("SESSION_SECRET", "super-secret-key-change-in-prod-please"),
		SMTPHost:      getEnv("SMTP_HOST", "smtp.yandex.ru"),
		SMTPPort:      getEnv("SMTP_PORT", "587"),
		SMTPUser:      getEnv("SMTP_USER", "s.polo2005@yandex.ru"),
		SMTPPassword:  getEnv("SMTP_PASSWORD", "sltsjawwlrauzcfh"),
		FrontendURL:   getEnv("FRONTEND_URL", "https://46k2wbxg-8080.euw.devtunnels.ms"),
		GeminiURL:     getEnv("GEMINI_URL", "http://blue.fnode.me:25534/generate"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
