package domain

// Good представляет сущность товара
type Good struct {
	Name             string  `json:"name"`
	Price            float64 `json:"price"`
	Photo            string  `json:"photo"`
	Article          string  `json:"article"`
	MinOrderQuantity int     `json:"min_order_quantity"`
	Multiplicity     int     `json:"multiplicity"`
	Description      string  `json:"description"`
	OriginalLink     string  `json:"original_link"`
	Tipography       string  `json:"tipography"`
	NeedMaket        bool    `json:"need_maket"`
	MaketFormat      *string `json:"maket_format"`
	ColorProfile     *string `json:"color_profile"`
}
