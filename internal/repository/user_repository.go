package repository

import (
	"context"
	"time"

	"github.com/avelgar/sofa/internal/domain"
)

// UserRepository определяет контракт для работы с пользователями.
// Любой хранилище (Postgres, Mongo, in-memory) должно реализовать этот интерфейс.
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	GetByLogin(ctx context.Context, login string) (*domain.User, error)
	GetByLoginOrEmail(ctx context.Context, loginOrEmail string) (*domain.User, error)
	GetByNickname(ctx context.Context, nickname string) (*domain.User, error)
	GetBySignUpToken(ctx context.Context, token string) (*domain.User, error)
	GetByRecoveryToken(ctx context.Context, token string) (*domain.User, error)
	UpdateSignUpToken(ctx context.Context, email string, token *string, delTime *time.Time) error
	UpdateRecoveryToken(ctx context.Context, email string, token *string, delTime *time.Time) error
	UpdatePassword(ctx context.Context, email string, hashedPassword string) error
	UpdateLogin(ctx context.Context, email string, newLogin string) error
	GetNicknameAndVK(ctx context.Context, login string) (nickname string, vk string, err error)
	GetNicknameAndVKByEmail(ctx context.Context, email string) (nickname string, vk string, err error)
	DeleteExpiredSignUpTokens(ctx context.Context) error
	NullifyExpiredRecoveryTokens(ctx context.Context) error
}
