package handler

import (
	"github.com/avelgar/sofa/internal/infrastructure/session"
	"github.com/avelgar/sofa/internal/service"
	"github.com/gofiber/fiber/v2"
)

type GoodsHandler struct {
	goodsService   *service.GoodsService
	sessionManager *session.Manager
}

func NewGoodsHandler(goodsService *service.GoodsService, sessionManager *session.Manager) *GoodsHandler {
	return &GoodsHandler{
		goodsService:   goodsService,
		sessionManager: sessionManager,
	}
}

// GetGoods — GET /api/getgoods
func (h *GoodsHandler) GetGoods(c *fiber.Ctx) error {
	email, _ := h.sessionManager.GetEmail(c)

	goods, err := h.goodsService.GetAdvancedGoods(c.Context(), email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(goods)
}

// GetBasicGoods — GET /sofa/getgoods (публичный эндпоинт для главной страницы)
func (h *GoodsHandler) GetBasicGoods(c *fiber.Ctx) error {
	goods, err := h.goodsService.GetBasicGoods(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(goods)
}
