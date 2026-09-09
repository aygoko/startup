package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type GeminiHandler struct {
	geminiURL string
}

func NewGeminiHandler(geminiURL string) *GeminiHandler {
	return &GeminiHandler{
		geminiURL: geminiURL,
	}
}

// Handle — POST /api/gemini
func (h *GeminiHandler) Handle(c *fiber.Ctx) error {
	var req struct {
		Input   string   `json:"input"`
		History []string `json:"history"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	instructions := "Ты бот-помощник на сайте интернет магазина, давай краткие, но четкие ответы, не используй выделения текста," +
		"постарайся решить проблему пользователя не говоря что ты не можешь или не знаешь чего-то, делай выборы за пользователя " +
		"если ты не можешь подсказать пользователю, то в крайнем случае дай ему мой контакт " +
		"почты kirill.tsyganov@gmail.com."

	prompt := fmt.Sprintf(
		"%s\nВот запрос от пользователя: %s\nВот история сообщений: %s",
		instructions,
		req.Input,
		strings.Join(req.History, "\n"),
	)

	requestData := map[string]interface{}{
		"prompt": prompt,
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to marshal request",
		})
	}

	resp, err := http.Post(h.geminiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to contact gemini server",
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to read response",
		})
	}

	if resp.StatusCode != http.StatusOK {
		var geminiResp struct {
			Error string `json:"error"`
		}
		json.Unmarshal(body, &geminiResp)
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error": geminiResp.Error,
		})
	}

	c.Set("Content-Type", "application/json")
	return c.Send(body)
}
