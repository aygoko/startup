package email

import (
	"encoding/base64"
	"fmt"
	"net/smtp"
)

// SMTPSender реализует интерфейс service.EmailSender через SMTP-протокол
type SMTPSender struct {
	host     string
	port     string
	username string
	password string
}

// NewSMTPSender создаёт новый SMTP-клиент
func NewSMTPSender(host, port, username, password string) *SMTPSender {
	return &SMTPSender{
		host:     host,
		port:     port,
		username: username,
		password: password,
	}
}

// Send отправляет email через SMTP
func (s *SMTPSender) Send(to, subject, body string) error {
	// Кодируем тему в UTF-8 Base64 (чтобы русские символы отображались корректно)
	encodedSubject := "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(subject)) + "?="

	// Формируем сообщение по стандарту RFC 5322
	msg := []byte(
		"From: " + s.username + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + encodedSubject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	err := smtp.SendMail(s.host+":"+s.port, auth, s.username, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email to %s: %w", to, err)
	}

	return nil
}
