package repository

import (
	"context"

	"github.com/avelgar/sofa/internal/domain"
)

// GoodRepository определяет контракт для работы с товарами.
type GoodRepository interface {
	// GetAllBasic возвращает только name, price, photo (для главной страницы)
	GetAllBasic(ctx context.Context) ([]domain.Good, error)
	// GetAllAdvanced возвращает все поля товара (для авторизованных пользователей)
	GetAllAdvanced(ctx context.Context) ([]domain.Good, error)
	// GetByArticle возвращает один товар по артикулу (для корзины)
	GetByArticle(ctx context.Context, article string) (*domain.Good, error)
}
