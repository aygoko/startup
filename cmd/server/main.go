package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/avelgar/sofa/config"
	"github.com/avelgar/sofa/internal/delivery/http/handler"
	"github.com/avelgar/sofa/internal/delivery/http/middleware"
	"github.com/avelgar/sofa/internal/infrastructure/email"
	"github.com/avelgar/sofa/internal/infrastructure/session"
	"github.com/avelgar/sofa/internal/repository/postgres"
	"github.com/avelgar/sofa/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	_ "github.com/lib/pq"
)

func main() {
	// 1. Загрузка конфигурации
	cfg := config.Load()

	// 2. Инициализация базы данных
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable&client_encoding=UTF8",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Ошибка подключения к БД:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Ошибка проверки соединения с БД:", err)
	}
	fmt.Println("✅ База данных успешно подключена")

	// 3. Инициализация инфраструктуры
	sessionManager := session.NewManager()
	emailSender := email.NewSMTPSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword)

	// 4. Инициализация репозиториев
	userRepo := postgres.NewUserRepository(db)
	goodRepo := postgres.NewGoodRepository(db)
	basketRepo := postgres.NewBasketRepository(db)

	// 5. Инициализация сервисов
	authService := service.NewAuthService(userRepo, emailSender, cfg.FrontendURL)
	goodsService := service.NewGoodsService(goodRepo, userRepo)
	basketService := service.NewBasketService(basketRepo, goodRepo)

	// 6. Инициализация HTTP-обработчиков
	authHandler := handler.NewAuthHandler(authService, sessionManager)
	goodsHandler := handler.NewGoodsHandler(goodsService, sessionManager)
	basketHandler := handler.NewBasketHandler(basketService, sessionManager)
	userHandler := handler.NewUserHandler(userRepo, sessionManager)
	geminiHandler := handler.NewGeminiHandler(cfg.GeminiURL)

	// 7. Фоновая задача для очистки протухших токенов
	go func() {
		for {
			time.Sleep(time.Minute)
			authService.CleanupExpiredTokens(context.Background())
		}
	}()

	// 8. Настройка Fiber приложения
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Логгируем ошибку для отладки
			fmt.Printf("❌ Ошибка сервера: %v\n", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(func(c *fiber.Ctx) error {
		c.Set("Content-Type", "application/json; charset=utf-8")
		return c.Next()
	})

	// Глобальные мидлвары
	app.Use(logger.New())

	// Статические файлы (фронтенд: HTML, CSS, JS, картинки)
	app.Static("/public", "./public")

	// ==========================================
	// 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ 1: Редирект с корня
	// ==========================================
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("/public/Sofa.html", fiber.StatusFound)
	})

	// Заглушка для favicon (чтобы браузер не спамил ошибками 404/401)
	app.Get("/favicon.ico", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	// === ПУБЛИЧНЫЕ МАРШРУТЫ (без авторизации) ===

	// 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ 2: Маршрут для проверки куки, который ждет ваш Sofa.js
	// Если в authHandler нет метода CheckCookie, используйте Authenticate или создайте его по аналогии со старым кодом.
	//app.Get("/api/checkCookie", authHandler.CheckCookie)

	app.Get("/sofa/getgoods", goodsHandler.GetBasicGoods) // Важно для главной страницы

	app.Post("/SignUpUser", authHandler.SignUp)
	app.Post("/LogIn", authHandler.Login)
	app.Post("/api/logout", authHandler.Logout)
	app.Post("/Recovery", authHandler.Recovery)
	app.Post("/api/SubmitRecovery", authHandler.SubmitRecovery)
	app.Post("/api/checkToken", authHandler.CheckToken)
	app.Post("/api/confirmRecoveryToken", authHandler.ConfirmRecoveryToken)
	app.Post("/api/gemini", geminiHandler.Handle)

	// === ЗАЩИЩЕННЫЕ МАРШРУТЫ (требуют авторизации) ===
	protected := app.Group("", middleware.RequireAuth(sessionManager))

	protected.Get("/api/getgoods", goodsHandler.GetGoods)
	protected.Get("/api/authenticate", userHandler.Authenticate)
	protected.Get("/api/checkUserFields", userHandler.CheckUserFields)
	protected.Post("/api/changeLogin", userHandler.ChangeLogin)

	protected.Post("/api/addToCart", basketHandler.AddToCart)
	protected.Get("/api/getBasketItems", basketHandler.GetBasketItems)
	protected.Delete("/api/removeFromBasket/:id", basketHandler.RemoveFromBasket)
	protected.Post("/api/payForItems", basketHandler.PayForItems)

	// 10. Запуск сервера
	port := ":" + cfg.ServerPort
	fmt.Printf("🚀 Сервер успешно запущен на http://localhost%s\n", port)
	log.Fatal(app.Listen(port))
}
