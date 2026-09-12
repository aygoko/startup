package handler

import (
	"github.com/avelgar/sofa/internal/infrastructure/session"
	"github.com/avelgar/sofa/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	userRepo       repository.UserRepository
	sessionManager *session.Manager
}

func NewUserHandler(userRepo repository.UserRepository, sessionManager *session.Manager) *UserHandler {
	return &UserHandler{
		userRepo:       userRepo,
		sessionManager: sessionManager,
	}
}

// Authenticate — GET /api/authenticate
func (h *UserHandler) Authenticate(c *fiber.Ctx) error {
	email, ok := h.sessionManager.GetEmail(c)
	if !ok {
		return c.JSON(fiber.Map{
			"success": false,
		})
	}

	user, err := h.userRepo.GetByEmail(c.Context(), email)
	if err != nil {
		return c.JSON(fiber.Map{
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"login":   user.Login,
		"email":   user.Email,
	})
}

// CheckUserFields — GET /api/checkUserFields?login=...
func (h *UserHandler) CheckUserFields(c *fiber.Ctx) error {
	login := c.Query("login")
	if login == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "login is required",
		})
	}

	nickname, vk, err := h.userRepo.GetNicknameAndVK(c.Context(), login)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	return c.JSON(fiber.Map{
		"nickname": nickname,
		"vk":       vk,
	})
}

// ChangeLogin — POST /api/changeLogin
func (h *UserHandler) ChangeLogin(c *fiber.Ctx) error {
	email, _ := h.sessionManager.GetEmail(c)

	var req struct {
		Login string `json:"login"`
	}
	if err := c.BodyParser(&req); err != nil || req.Login == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "login is required",
		})
	}

	// Проверяем, не занят ли логин
	if existing, _ := h.userRepo.GetByLogin(c.Context(), req.Login); existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "login already exists",
		})
	}

	if err := h.userRepo.UpdateLogin(c.Context(), email, req.Login); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"newLogin": req.Login,
	})
}
