package email

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const resendEndpoint = "https://api.resend.com/emails"

// ResendSender реализует интерфейс service.EmailSender через HTTPS API Resend.
// Работает по порту 443, поэтому не зависит от блокировки SMTP-портов хостингом.
type ResendSender struct {
	apiKey string
	from   string
	client *http.Client
}

// NewResendSender создаёт отправитель. from — адрес отправителя,
// например "noreply@merchotsofy.ru" или "Коллекты от Софы <noreply@merchotsofy.ru>".
func NewResendSender(apiKey, from string) *ResendSender {
	return &ResendSender{
		apiKey: apiKey,
		from:   from,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

// Send отправляет текстовое письмо.
func (s *ResendSender) Send(to, subject, body string) error {
	if s.apiKey == "" {
		return errors.New("failed to send email: RESEND_API_KEY is not set")
	}

	payload, err := json.Marshal(resendRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Text:    body,
	})
	if err != nil {
		return fmt.Errorf("failed to send email to %s: %w", to, err)
	}

	req, err := http.NewRequest(http.MethodPost, resendEndpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("failed to send email to %s: %w", to, err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "sofa-app/1.0")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email to %s: %w", to, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// тело ответа Resend содержит причину (неверный ключ, домен не подтверждён и т.д.)
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("failed to send email to %s: resend returned %d: %s", to, resp.StatusCode, string(msg))
	}

	return nil
}
