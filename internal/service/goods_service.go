package service

import (
	"context"
	"fmt"

	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/repository"
)

type GoodsService struct {
	goodRepo repository.GoodRepository
	userRepo repository.UserRepository
}

func NewGoodsService(goodRepo repository.GoodRepository, userRepo repository.UserRepository) *GoodsService {
	return &GoodsService{goodRepo: goodRepo, userRepo: userRepo}
}

// GetBasicGoods возвращает товары для неавторизованных пользователей
func (s *GoodsService) GetBasicGoods(ctx context.Context) ([]domain.Good, error) {
	return s.goodRepo.GetAllBasic(ctx)
}

// GetAdvancedGoods возвращает полный список товаров, учитывая профиль пользователя
func (s *GoodsService) GetAdvancedGoods(ctx context.Context, email string) ([]domain.Good, error) {
	nickname, vk, err := s.userRepo.GetNicknameAndVKByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}

	// Если у пользователя нет nickname и VK — отдаём только базовые товары (без макетов)
	if nickname == "" && vk == "" {
		return s.goodRepo.GetAllBasic(ctx)
	}

	return s.goodRepo.GetAllAdvanced(ctx)
}

// GetGoodByArticle возвращает товар по артикулу (для корзины)
func (s *GoodsService) GetGoodByArticle(ctx context.Context, article string) (*domain.Good, error) {
	good, err := s.goodRepo.GetByArticle(ctx, article)
	if err != nil {
		return nil, ErrArticleNotFound
	}
	return good, nil
}
