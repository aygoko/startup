package service

import "errors"

// Бизнес-ошибки сервисного слоя
var (
	ErrUserAlreadyExists     = errors.New("user already exists")
	ErrNicknameAlreadyExists = errors.New("nickname already exists")
	ErrInvalidCredentials    = errors.New("invalid credentials")
	ErrUserNotFound          = errors.New("user not found")
	ErrUserBanned            = errors.New("user is banned")
	ErrWeakPassword          = errors.New("password is too weak")
	ErrTokenInvalid          = errors.New("token is invalid or expired")
	ErrActiveTokenExists     = errors.New("active token already exists")
	ErrArticleNotFound       = errors.New("article not found")
)
