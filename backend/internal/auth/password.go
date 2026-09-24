// Package auth implements password hashing and JWT session tokens.
package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a plaintext password for storage.
func HashPassword(plaintext string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

// ComparePassword reports whether plaintext matches the given bcrypt hash.
func ComparePassword(hash, plaintext string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plaintext)) == nil
}

const passwordAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

// GenerateRandomPassword returns a cryptographically random password built
// from an alphabet that excludes visually ambiguous characters (0/O, 1/l/I),
// suitable for displaying to an admin to hand to a dealer.
func GenerateRandomPassword(length int) (string, error) {
	result := make([]byte, length)
	alphabetLen := big.NewInt(int64(len(passwordAlphabet)))

	for i := range result {
		n, err := rand.Int(rand.Reader, alphabetLen)
		if err != nil {
			return "", fmt.Errorf("generate random password: %w", err)
		}
		result[i] = passwordAlphabet[n.Int64()]
	}

	return string(result), nil
}
