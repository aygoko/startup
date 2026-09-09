package postgres

import (
	"context"
	"database/sql"

	"github.com/avelgar/sofa/internal/domain"
	"github.com/avelgar/sofa/internal/repository"
)

type basketRepo struct {
	db *sql.DB
}

func NewBasketRepository(db *sql.DB) repository.BasketRepository {
	return &basketRepo{db: db}
}

func (r *basketRepo) Add(ctx context.Context, email string, article string, quantity int, imageData []byte) error {
	if imageData != nil {
		query := `INSERT INTO basket (email, article, quantity, image_data) VALUES ($1, $2, $3, $4)`
		_, err := r.db.ExecContext(ctx, query, email, article, quantity, imageData)
		return err
	}
	query := `INSERT INTO basket (email, article, quantity) VALUES ($1, $2, $3)`
	_, err := r.db.ExecContext(ctx, query, email, article, quantity)
	return err
}

func (r *basketRepo) GetByUser(ctx context.Context, email string) ([]domain.BasketItem, error) {
	// JOIN с таблицей goods, чтобы получить название, цену и описание товара
	query := `SELECT b.id, b.article, b.quantity, b.image_data, 
	                 g.name, g.price, g.description, g.photo 
	          FROM basket b 
	          JOIN goods g ON b.article = g.article 
	          WHERE b.email = $1`
	rows, err := r.db.QueryContext(ctx, query, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.BasketItem
	for rows.Next() {
		var item domain.BasketItem
		var imageData []byte

		if err := rows.Scan(
			&item.ID, &item.Article, &item.Quantity, &imageData,
			&item.Name, &item.Price, &item.Description, &item.Photo,
		); err != nil {
			return nil, err
		}

		item.ImageData = imageData
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *basketRepo) Remove(ctx context.Context, email string, itemID int) error {
	query := `DELETE FROM basket WHERE id = $1 AND email = $2`
	_, err := r.db.ExecContext(ctx, query, itemID, email)
	return err
}

func (r *basketRepo) Clear(ctx context.Context, email string) error {
	query := `DELETE FROM basket WHERE email = $1`
	_, err := r.db.ExecContext(ctx, query, email)
	return err
}
