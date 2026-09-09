package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// EmailSender — интерфейс для отправки писем.
// Определяется здесь, чтобы сервис не зависел от конкретной SMTP-реализации.
type EmailSender interface {
	Send(to, subject, body string) error
}

type AuthService struct {
	userRepo    repository.UserRepository
	emailSender EmailSender
	frontendURL string
}

func NewAuthService(userRepo repository.UserRepository, emailSender EmailSender, frontendURL string) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		emailSender: emailSender,
		frontendURL: frontendURL,
	}
}

// isPasswordStrong проверяет сложность пароля:
// минимум 8 символов, есть заглавная, строчная буква и цифра
func isPasswordStrong(password string) bool {
	if len(password) < 8 {
		return false
	}
	var hasUpper, hasLower, hasDigit bool
	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
}

// generateSecureToken создаёт криптографически стойкий токен
func generateSecureToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// hashPassword хеширует пароль с помощью bcrypt
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// checkPasswordHash сравнивает пароль с хэшем
func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// SignUp регистрирует нового пользователя
func (s *AuthService) SignUp(ctx context.Context, req domain.SignUpRequest) error {
	// 1. Валидация пароля
	if !isPasswordStrong(req.Password) {
		return ErrWeakPassword
	}

	// 2. Проверка уникальности email
	if _, err := s.userRepo.GetByEmail(ctx, req.Email); err == nil {
		return ErrUserAlreadyExists
	}

	// 3. Проверка уникальности логина
	if _, err := s.userRepo.GetByLogin(ctx, req.Login); err == nil {
		return ErrUserAlreadyExists
	}

	// 4. Проверка уникальности nickname (если указан)
	if req.Nickname != "" {
		if _, err := s.userRepo.GetByNickname(ctx, req.Nickname); err == nil {
			return ErrNicknameAlreadyExists
		}
	}

	// 5. Хешируем пароль
	hashedPassword, err := hashPassword(req.Password)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// 6. Генерируем токен подтверждения
	token, err := generateSecureToken()
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}
	delTime := time.Now().Add(time.Hour)

	// 7. Создаём пользователя
	user := &domain.User{
		Login:              req.Login,
		Email:              req.Email,
		Password:           hashedPassword,
		Nickname:           req.Nickname,
		VK:                 req.VK,
		IsBanned:           false,
		SignUpToken:        &token,
		SignUpTokenDelTime: &delTime,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// 8. Отправляем письмо с подтверждением (в горутине, чтобы не блокировать ответ)
	go func() {
		subject := "Подтверждение Регистрации"
		body := fmt.Sprintf(
			"Пожалуйста, подтвердите вашу регистрацию, перейдя по ссылке: %s/public/Sofa.html?token=%s",
			s.frontendURL, token,
		)
		if err := s.emailSender.Send(req.Email, subject, body); err != nil {
			// В реальном приложении здесь был бы логгер
			fmt.Printf("Ошибка отправки email: %v\n", err)
		}
	}()

	return nil
}

// ConfirmSignUp подтверждает регистрацию по токену
func (s *AuthService) ConfirmSignUp(ctx context.Context, token string) error {
	user, err := s.userRepo.GetBySignUpToken(ctx, token)
	if err != nil {
		return ErrTokenInvalid
	}
	// Обнуляем токен — пользователь подтверждён
	return s.userRepo.UpdateSignUpToken(ctx, user.Email, nil, nil)
}

// RequestPasswordRecovery запрашивает восстановление пароля
func (s *AuthService) RequestPasswordRecovery(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return ErrUserNotFound
	}

	if user.IsBanned {
		return ErrUserBanned
	}

	// Нельзя запрашивать восстановление, если есть активный токен регистрации
	if user.SignUpToken != nil && *user.SignUpToken != "" {
		return ErrActiveTokenExists
	}

	// Нельзя запрашивать, если уже есть активный токен восстановления
	if user.RecoveryToken != nil && *user.RecoveryToken != "" {
		return ErrActiveTokenExists
	}

	token, err := generateSecureToken()
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}
	delTime := time.Now().Add(time.Hour)

	if err := s.userRepo.UpdateRecoveryToken(ctx, user.Email, &token, &delTime); err != nil {
		return err
	}

	go func() {
		subject := "Восстановление пароля"
		body := fmt.Sprintf(
			"Пожалуйста, восстановите ваш пароль, перейдя по ссылке: %s/public/Recovery.html?recovery_token=%s",
			s.frontendURL, token,
		)
		if err := s.emailSender.Send(email, subject, body); err != nil {
			fmt.Printf("Ошибка отправки email: %v\n", err)
		}
	}()

	return nil
}

// ConfirmRecoveryToken проверяет валидность токена восстановления
func (s *AuthService) ConfirmRecoveryToken(ctx context.Context, token string) error {
	if _, err := s.userRepo.GetByRecoveryToken(ctx, token); err != nil {
		return ErrTokenInvalid
	}
	return nil
}

// ResetPassword сбрасывает пароль по токену восстановления
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if !isPasswordStrong(newPassword) {
		return ErrWeakPassword
	}

	user, err := s.userRepo.GetByRecoveryToken(ctx, token)
	if err != nil {
		return ErrTokenInvalid
	}

	hashedPassword, err := hashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	return s.userRepo.UpdatePassword(ctx, user.Email, hashedPassword)
}

// Login выполняет вход в систему
func (s *AuthService) Login(ctx context.Context, req domain.LoginRequest) (*domain.User, error) {
	// Определяем, что ввёл пользователь: email или логин
	var user *domain.User
	var err error

	if strings.Contains(req.LoginOrEmail, "@") {
		user, err = s.userRepo.GetByEmail(ctx, req.LoginOrEmail)
	} else {
		user, err = s.userRepo.GetByLogin(ctx, req.LoginOrEmail)
	}

	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if user.IsBanned {
		return nil, ErrUserBanned
	}

	// Нельзя войти, если email не подтверждён
	if user.SignUpToken != nil && *user.SignUpToken != "" {
		return nil, ErrActiveTokenExists
	}

	// Сравниваем пароль с хэшем
	if !checkPasswordHash(req.Password, user.Password) {
		return nil, ErrInvalidCredentials
	}

	// Не возвращаем хэш пароля наружу
	user.Password = ""
	return user, nil
}

// CleanupExpiredTokens удаляет/обнуляет протухшие токены (вызывается фоново)
func (s *AuthService) CleanupExpiredTokens(ctx context.Context) {
	_ = s.userRepo.DeleteExpiredSignUpTokens(ctx)
	_ = s.userRepo.NullifyExpiredRecoveryTokens(ctx)
}
