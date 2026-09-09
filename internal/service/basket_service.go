package service

import (
	"context"
	"fmt"

	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/repository"
)

type BasketService struct {
	basketRepo repository.BasketRepository
	goodRepo   repository.GoodRepository
}

func NewBasketService(basketRepo repository.BasketRepository, goodRepo repository.GoodRepository) *BasketService {
	return &BasketService{basketRepo: basketRepo, goodRepo: goodRepo}
}

// AddItem добавляет товар в корзину
func (s *BasketService) AddItem(ctx context.Context, email, article string, quantity int, imageData []byte) error {
	// Проверяем, что товар существует
	if _, err := s.goodRepo.GetByArticle(ctx, article); err != nil {
		return ErrArticleNotFound
	}

	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	return s.basketRepo.Add(ctx, email, article, quantity, imageData)
}

// GetItems возвращает все товары корзины пользователя
func (s *BasketService) GetItems(ctx context.Context, email string) ([]domain.BasketItem, error) {
	return s.basketRepo.GetByUser(ctx, email)
}

// RemoveItem удаляет товар из корзины
func (s *BasketService) RemoveItem(ctx context.Context, email string, itemID int) error {
	return s.basketRepo.Remove(ctx, email, itemID)
}

// Pay очищает корзину после успешной оплаты
func (s *BasketService) Pay(ctx context.Context, email string) error {
	return s.basketRepo.Clear(ctx, email)
}
