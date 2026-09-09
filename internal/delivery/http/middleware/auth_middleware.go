package middleware

import (
	"github.com/avelgar/sofa/internal/infrastructure/session"
	"github.com/gofiber/fiber/v2"
)

// RequireAuth — middleware для защиты маршрутов
func RequireAuth(sessionManager *session.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !sessionManager.IsAuthenticated(c) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "unauthorized",
			})
		}
		return c.Next()
	}
}
