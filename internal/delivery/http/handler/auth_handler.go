package handler

import (
	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/infrastructure/session"
	"github.com/avelgar/sofa/internal/service"
	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService    *service.AuthService
	sessionManager *session.Manager
}

func NewAuthHandler(authService *service.AuthService, sessionManager *session.Manager) *AuthHandler {
	return &AuthHandler{
		authService:    authService,
		sessionManager: sessionManager,
	}
}

// SignUp — POST /SignUpUser
func (h *AuthHandler) SignUp(c *fiber.Ctx) error {
	var req domain.SignUpRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if err := h.authService.SignUp(c.Context(), req); err != nil {
		switch err {
		case service.ErrWeakPassword:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "password is too weak",
			})
		case service.ErrUserAlreadyExists:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "user already exists",
			})
		case service.ErrNicknameAlreadyExists:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "nickname already exists",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "user registered successfully",
	})
}

// Login — POST /LogIn
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	user, err := h.authService.Login(c.Context(), req)
	if err != nil {
		switch err {
		case service.ErrInvalidCredentials:
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid credentials",
			})
		case service.ErrUserBanned:
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "user is banned",
			})
		case service.ErrActiveTokenExists:
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "email not confirmed",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	// Сохраняем сессию
	if err := h.sessionManager.SetAuth(c, user.Email); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create session",
		})
	}

	return c.JSON(fiber.Map{
		"message": "login successful",
	})
}

// Logout — POST /api/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	if err := h.sessionManager.ClearAuth(c); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to logout",
		})
	}

	return c.JSON(fiber.Map{
		"message": "logout successful",
	})
}

// CheckToken — POST /api/checkToken
func (h *AuthHandler) CheckToken(c *fiber.Ctx) error {
	var req struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&req); err != nil || req.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "token is required",
		})
	}

	if err := h.authService.ConfirmSignUp(c.Context(), req.Token); err != nil {
		return c.JSON(fiber.Map{
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// Recovery — POST /Recovery
func (h *AuthHandler) Recovery(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "email is required",
		})
	}

	if err := h.authService.RequestPasswordRecovery(c.Context(), req.Email); err != nil {
		switch err {
		case service.ErrUserNotFound:
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "user not found",
			})
		case service.ErrUserBanned:
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "user is banned",
			})
		case service.ErrActiveTokenExists:
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "active token already exists",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	return c.JSON(fiber.Map{
		"message": "recovery email sent",
	})
}

// ConfirmRecoveryToken — POST /api/confirmRecoveryToken
func (h *AuthHandler) ConfirmRecoveryToken(c *fiber.Ctx) error {
	var req struct {
		RecoveryToken string `json:"recovery_token"`
	}
	if err := c.BodyParser(&req); err != nil || req.RecoveryToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "recovery token is required",
		})
	}

	if err := h.authService.ConfirmRecoveryToken(c.Context(), req.RecoveryToken); err != nil {
		return c.JSON(fiber.Map{
			"success": false,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}

// SubmitRecovery — POST /api/SubmitRecovery
func (h *AuthHandler) SubmitRecovery(c *fiber.Ctx) error {
	var req struct {
		RecoveryToken    string `json:"recovery_token"`
		RecoveryPassword string `json:"RecoveryPassword"`
	}
	if err := c.BodyParser(&req); err != nil || req.RecoveryToken == "" || req.RecoveryPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "recovery token and password are required",
		})
	}

	if err := h.authService.ResetPassword(c.Context(), req.RecoveryToken, req.RecoveryPassword); err != nil {
		switch err {
		case service.ErrWeakPassword:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "password is too weak",
			})
		case service.ErrTokenInvalid:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	return c.JSON(fiber.Map{
		"message": "password reset successful",
	})
}
