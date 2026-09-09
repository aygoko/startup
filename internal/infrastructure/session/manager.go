package session

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/session"
)

const (
	keyAuthenticated = "authenticated"
	keyUserEmail     = "userEmail"
)

// Manager управляет сессиями пользователей
type Manager struct {
	store *session.Store
}

// NewManager создаёт менеджер сессий с настройками по умолчанию (in-memory)
// В продакшене сюда можно легко добавить session.Config{Storage: redis.New()}
func NewManager() *Manager {
	store := session.New()
	return &Manager{store: store}
}

// SetAuth сохраняет данные аутентификации в сессию
func (m *Manager) SetAuth(c *fiber.Ctx, email string) error {
	sess, err := m.store.Get(c)
	if err != nil {
		return err
	}

	sess.Set(keyAuthenticated, true)
	sess.Set(keyUserEmail, email)

	return sess.Save()
}

// ClearAuth удаляет данные аутентификации (logout)
func (m *Manager) ClearAuth(c *fiber.Ctx) error {
	sess, err := m.store.Get(c)
	if err != nil {
		return err
	}

	sess.Destroy()
	return nil
}

// GetEmail возвращает email пользователя из сессии, если он аутентифицирован
func (m *Manager) GetEmail(c *fiber.Ctx) (string, bool) {
	sess, err := m.store.Get(c)
	if err != nil {
		return "", false
	}

	authenticated, ok := sess.Get(keyAuthenticated).(bool)
	if !ok || !authenticated {
		return "", false
	}

	email, ok := sess.Get(keyUserEmail).(string)
	if !ok || email == "" {
		return "", false
	}

	return email, true
}

// IsAuthenticated проверяет, аутентифицирован ли пользователь
func (m *Manager) IsAuthenticated(c *fiber.Ctx) bool {
	_, ok := m.GetEmail(c)
	return ok
}
