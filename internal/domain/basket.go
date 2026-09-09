package domain

// BasketItem представляет товар в корзине пользователя
type BasketItem struct {
	ID          int     `json:"id"`
	Article     string  `json:"article"`
	Quantity    int     `json:"quantity"`
	ImageData   []byte  `json:"image_data"` // Используем []byte для base64 кодирования при отдаче
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Photo       string  `json:"photo"`
}
