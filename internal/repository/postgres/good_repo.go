package postgres

import (
	"context"
	"database/sql"

	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/repository"
)

type goodRepo struct {
	db *sql.DB
}

func NewGoodRepository(db *sql.DB) repository.GoodRepository {
	return &goodRepo{db: db}
}

func (r *goodRepo) GetAllBasic(ctx context.Context) ([]domain.Good, error) {
	query := `SELECT name, price, photo FROM goods`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goods []domain.Good
	for rows.Next() {
		var g domain.Good
		if err := rows.Scan(&g.Name, &g.Price, &g.Photo); err != nil {
			return nil, err
		}
		goods = append(goods, g)
	}
	return goods, rows.Err()
}

func (r *goodRepo) GetAllAdvanced(ctx context.Context) ([]domain.Good, error) {
	query := `SELECT name, price, photo, article, min_order_quantity, multiplicity, 
	                 description, need_maket, maket_format, color_profile 
	          FROM goods`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goods []domain.Good
	for rows.Next() {
		var g domain.Good
		var maketFormat, colorProfile sql.NullString

		if err := rows.Scan(
			&g.Name, &g.Price, &g.Photo, &g.Article,
			&g.MinOrderQuantity, &g.Multiplicity, &g.Description,
			&g.NeedMaket, &maketFormat, &colorProfile,
		); err != nil {
			return nil, err
		}

		// sql.NullString → *string (чтобы JSON отдавал null, а не "")
		if maketFormat.Valid {
			g.MaketFormat = &maketFormat.String
		}
		if colorProfile.Valid {
			g.ColorProfile = &colorProfile.String
		}

		goods = append(goods, g)
	}
	return goods, rows.Err()
}

func (r *goodRepo) GetByArticle(ctx context.Context, article string) (*domain.Good, error) {
	query := `SELECT name, price, description, photo FROM goods WHERE article = $1`
	var g domain.Good
	err := r.db.QueryRowContext(ctx, query, article).Scan(
		&g.Name, &g.Price, &g.Description, &g.Photo,
	)
	if err != nil {
		return nil, err
	}
	return &g, nil
}
