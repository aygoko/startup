package handler

import (
	"io"
	"strconv"

	"github.com/avelgar/sofa/internal/infrastructure/session"
	"github.com/avelgar/sofa/internal/service"
	"github.com/gofiber/fiber/v2"
)

type BasketHandler struct {
	basketService  *service.BasketService
	sessionManager *session.Manager
}

func NewBasketHandler(basketService *service.BasketService, sessionManager *session.Manager) *BasketHandler {
	return &BasketHandler{
		basketService:  basketService,
		sessionManager: sessionManager,
	}
}

// AddToCart — POST /api/addToCart
func (h *BasketHandler) AddToCart(c *fiber.Ctx) error {
	email, _ := h.sessionManager.GetEmail(c)

	article := c.FormValue("article")
	quantityStr := c.FormValue("quantity")
	quantity, err := strconv.Atoi(quantityStr)
	if err != nil || quantity <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid quantity",
		})
	}

	// Получаем файл изображения (если он есть в запросе)
	var imageData []byte
	file, err := c.FormFile("file")
	if err == nil {
		// 1. Открываем файл
		f, err := file.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to open file",
			})
		}

		// 2. Гарантируем закрытие файла после выхода из функции (защита от утечки ресурсов)
		defer f.Close()

		// 3. Читаем содержимое файла в срез байтов []byte
		imageData, err = io.ReadAll(f)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to read file",
			})
		}
	}

	// Передаем байты (или nil, если файла не было) в сервис
	if err := h.basketService.AddItem(c.Context(), email, article, quantity, imageData); err != nil {
		switch err {
		case service.ErrArticleNotFound:
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "article not found",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	return c.JSON(fiber.Map{
		"message": "item added to cart",
	})
}

// GetBasketItems — GET /api/getBasketItems
func (h *BasketHandler) GetBasketItems(c *fiber.Ctx) error {
	email, _ := h.sessionManager.GetEmail(c)

	items, err := h.basketService.GetItems(c.Context(), email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(items)
}

// RemoveFromBasket — DELETE /api/removeFromBasket/:id
func (h *BasketHandler) RemoveFromBasket(c *fiber.Ctx) error {
	email, _ := h.sessionManager.GetEmail(c)

	itemIDStr := c.Params("id")
	itemID, err := strconv.Atoi(itemIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid item id",
		})
	}

	if err := h.basketService.RemoveItem(c.Context(), email, itemID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// PayForItems — POST /api/payForItems
func (h *BasketHandler) PayForItems(c *fiber.Ctx) error {
	email, _ := h.sessionManager.GetEmail(c)

	if err := h.basketService.Pay(c.Context(), email); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "payment successful",
	})
}
