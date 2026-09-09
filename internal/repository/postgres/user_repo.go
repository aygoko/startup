package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/repository"
)

type userRepo struct {
	db *sql.DB
}

// NewUserRepository создаёт реализацию UserRepository для PostgreSQL
func NewUserRepository(db *sql.DB) repository.UserRepository {
	return &userRepo{db: db}
}

// scanUser — вспомогательный метод для маппинга строки БД в доменную структуру
func (r *userRepo) scanUser(row *sql.Row) (*domain.User, error) {
	var u domain.User
	err := row.Scan(
		&u.ID, &u.Login, &u.Email, &u.Password,
		&u.IsBanned, &u.Nickname, &u.VK,
		&u.SignUpToken, &u.SignUpTokenDelTime,
		&u.RecoveryToken, &u.RecoveryTokenDelTime,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

const userColumns = `id, login, email, password, is_banned, nickname, vk, 
                       sign_up_token, sign_up_token_del_time, 
                       recovery_token, recovery_token_del_time`

func (r *userRepo) Create(ctx context.Context, user *domain.User) error {
	query := `INSERT INTO users 
		(login, email, password, is_banned, nickname, vk, 
		 sign_up_token, sign_up_token_del_time, recovery_token, recovery_token_del_time) 
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`
	_, err := r.db.ExecContext(ctx, query,
		user.Login, user.Email, user.Password, user.IsBanned,
		user.Nickname, user.VK,
		user.SignUpToken, user.SignUpTokenDelTime,
		user.RecoveryToken, user.RecoveryTokenDelTime,
	)
	return err
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE email = $1`
	return r.scanUser(r.db.QueryRowContext(ctx, query, email))
}

func (r *userRepo) GetByLogin(ctx context.Context, login string) (*domain.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE login = $1`
	return r.scanUser(r.db.QueryRowContext(ctx, query, login))
}

func (r *userRepo) GetByLoginOrEmail(ctx context.Context, loginOrEmail string) (*domain.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE email = $1 OR login = $1`
	return r.scanUser(r.db.QueryRowContext(ctx, query, loginOrEmail))
}

func (r *userRepo) GetByNickname(ctx context.Context, nickname string) (*domain.User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE nickname = $1`
	return r.scanUser(r.db.QueryRowContext(ctx, query, nickname))
}

func (r *userRepo) GetBySignUpToken(ctx context.Context, token string) (*domain.User, error) {
	query := `SELECT ` + userColumns + ` FROM users 
	          WHERE sign_up_token = $1 AND sign_up_token_del_time > NOW()`
	return r.scanUser(r.db.QueryRowContext(ctx, query, token))
}

func (r *userRepo) GetByRecoveryToken(ctx context.Context, token string) (*domain.User, error) {
	query := `SELECT ` + userColumns + ` FROM users 
	          WHERE recovery_token = $1 AND recovery_token_del_time > NOW()`
	return r.scanUser(r.db.QueryRowContext(ctx, query, token))
}

func (r *userRepo) UpdateSignUpToken(ctx context.Context, email string, token *string, delTime *time.Time) error {
	query := `UPDATE users SET sign_up_token = $1, sign_up_token_del_time = $2 WHERE email = $3`
	_, err := r.db.ExecContext(ctx, query, token, delTime, email)
	return err
}

func (r *userRepo) UpdateRecoveryToken(ctx context.Context, email string, token *string, delTime *time.Time) error {
	query := `UPDATE users SET recovery_token = $1, recovery_token_del_time = $2 WHERE email = $3`
	_, err := r.db.ExecContext(ctx, query, token, delTime, email)
	return err
}

func (r *userRepo) UpdatePassword(ctx context.Context, email string, hashedPassword string) error {
	query := `UPDATE users SET password = $1, recovery_token = NULL, recovery_token_del_time = NULL 
	          WHERE email = $2`
	_, err := r.db.ExecContext(ctx, query, hashedPassword, email)
	return err
}

func (r *userRepo) UpdateLogin(ctx context.Context, email string, newLogin string) error {
	query := `UPDATE users SET login = $1 WHERE email = $2`
	_, err := r.db.ExecContext(ctx, query, newLogin, email)
	return err
}

func (r *userRepo) GetNicknameAndVK(ctx context.Context, login string) (string, string, error) {
	var nickname, vk string
	query := `SELECT nickname, vk FROM users WHERE login = $1`
	err := r.db.QueryRowContext(ctx, query, login).Scan(&nickname, &vk)
	return nickname, vk, err
}

func (r *userRepo) GetNicknameAndVKByEmail(ctx context.Context, email string) (string, string, error) {
	var nickname, vk string
	query := `SELECT nickname, vk FROM users WHERE email = $1`
	err := r.db.QueryRowContext(ctx, query, email).Scan(&nickname, &vk)
	return nickname, vk, err
}

func (r *userRepo) DeleteExpiredSignUpTokens(ctx context.Context) error {
	query := `DELETE FROM users 
	          WHERE sign_up_token_del_time < NOW() 
	          AND sign_up_token IS NOT NULL AND sign_up_token <> ''`
	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *userRepo) NullifyExpiredRecoveryTokens(ctx context.Context) error {
	query := `UPDATE users SET recovery_token = NULL, recovery_token_del_time = NULL 
	          WHERE recovery_token_del_time < NOW() 
	          AND recovery_token IS NOT NULL AND recovery_token <> ''`
	_, err := r.db.ExecContext(ctx, query)
	return err
}
