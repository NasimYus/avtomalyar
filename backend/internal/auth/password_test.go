package auth

import "testing"

func TestHashAndComparePassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if !ComparePassword(hash, "correct horse battery staple") {
		t.Error("ComparePassword() = false for the correct password, want true")
	}
	if ComparePassword(hash, "wrong password") {
		t.Error("ComparePassword() = true for a wrong password, want false")
	}
}

func TestGenerateRandomPassword(t *testing.T) {
	const length = 12

	a, err := GenerateRandomPassword(length)
	if err != nil {
		t.Fatalf("GenerateRandomPassword() error = %v", err)
	}
	if len(a) != length {
		t.Errorf("len(password) = %d, want %d", len(a), length)
	}

	b, err := GenerateRandomPassword(length)
	if err != nil {
		t.Fatalf("GenerateRandomPassword() error = %v", err)
	}
	if a == b {
		t.Error("GenerateRandomPassword() returned the same value twice in a row")
	}
}
