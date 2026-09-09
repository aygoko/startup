package domain

import "time"

// User представляет сущность пользователя в системе
type User struct {
	ID                   int
	Login                string
	Email                string
	Password             string // Храним только хэш!
	Nickname             string
	VK                   string
	IsBanned             bool
	SignUpToken          *string
	SignUpTokenDelTime   *time.Time
	RecoveryToken        *string
	RecoveryTokenDelTime *time.Time
}

// SignUpRequest - DTO (Data Transfer Object) для регистрации
type SignUpRequest struct {
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
	VK       string `json:"vk"`
}

// LoginRequest - DTO для входа в систему
type LoginRequest struct {
	LoginOrEmail string `json:"login"` // Может быть и логином, и email
	Password     string `json:"password"`
}
