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
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
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

	// 3. Инициализация инфраструктуры (Session, Email)
	sessionManager := session.NewManager()

	emailSender := email.NewSMTPSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword)

	// 4. Инициализация репозиториев (Слой данных)
	userRepo := postgres.NewUserRepository(db)
	goodRepo := postgres.NewGoodRepository(db)
	basketRepo := postgres.NewBasketRepository(db)

	// 5. Инициализация сервисов (Бизнес-логика)
	// Сервисы зависят только от интерфейсов репозиториев (Dependency Inversion)
	authService := service.NewAuthService(userRepo, emailSender, cfg.FrontendURL)
	goodsService := service.NewGoodsService(goodRepo, userRepo)
	basketService := service.NewBasketService(basketRepo, goodRepo)

	// 6. Инициализация HTTP-обработчиков (Delivery слой)
	authHandler := handler.NewAuthHandler(authService, sessionManager)
	goodsHandler := handler.NewGoodsHandler(goodsService, sessionManager)
	basketHandler := handler.NewBasketHandler(basketService, sessionManager)
	userHandler := handler.NewUserHandler(userRepo, sessionManager)
	geminiHandler := handler.NewGeminiHandler(cfg.GeminiURL)

	// 7. Фоновая задача для очистки протухших токенов (каждую минуту)
	go func() {
		for {
			time.Sleep(time.Minute)
			authService.CleanupExpiredTokens(context.Background())
		}
	}()

	// 8. Настройка Fiber приложения
	app := fiber.New(fiber.Config{
		// Возвращаем ошибки в виде JSON для удобства фронтенда
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Глобальные мидлвары
	app.Use(logger.New())

	// Статические файлы (фронтенд)
	app.Static("/public", "./public")

	// 9. Регистрация маршрутов (Routing)
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("/public/Sofa.html", fiber.StatusFound)
	})

	// Auth routes
	app.Post("/SignUpUser", authHandler.SignUp)
	app.Post("/LogIn", authHandler.Login)
	app.Post("/api/logout", authHandler.Logout)
	app.Post("/Recovery", authHandler.Recovery)
	app.Post("/api/SubmitRecovery", authHandler.SubmitRecovery)
	app.Post("/api/checkToken", authHandler.CheckToken)
	app.Post("/api/confirmRecoveryToken", authHandler.ConfirmRecoveryToken)

	// Защищенные маршруты (требуют аутентификации)
	protected := app.Group("", middleware.RequireAuth(sessionManager))

	protected.Get("/api/getgoods", goodsHandler.GetGoods)
	protected.Get("/api/checkCookie", userHandler.CheckCookie)
	protected.Get("/api/authenticate", userHandler.Authenticate)
	protected.Get("/api/checkUserFields", userHandler.CheckUserFields)
	protected.Post("/api/changeLogin", userHandler.ChangeLogin)

	protected.Post("/api/addToCart", basketHandler.AddToCart)
	protected.Get("/api/getBasketItems", basketHandler.GetBasketItems)
	protected.Delete("/api/removeFromBasket/:id", basketHandler.RemoveFromBasket)
	protected.Post("/api/payForItems", basketHandler.PayForItems)

	// Внешние API
	app.Post("/api/gemini", geminiHandler.Handle)

	// 10. Запуск сервера
	port := ":" + cfg.ServerPort
	fmt.Printf("🚀 Сервер запущен на http://localhost%s\n", port)
	log.Fatal(app.Listen(port))
}
