package repository

import (
	"context"

	"github.com/avelgar/sofa/internal/domain"
)

// BasketRepository определяет контракт для работы с корзиной.
type BasketRepository interface {
	Add(ctx context.Context, email string, article string, quantity int, imageData []byte) error
	GetByUser(ctx context.Context, email string) ([]domain.BasketItem, error)
	Remove(ctx context.Context, email string, itemID int) error
	Clear(ctx context.Context, email string) error
}
