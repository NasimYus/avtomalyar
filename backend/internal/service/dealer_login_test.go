package service

import (
	"strings"
	"testing"
)

func TestSlugify(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "russian name", in: "Иван Петров", want: "ivan.petrov"},
		{name: "tajik letters", in: "Ғафуров Ҷамшед", want: "ghafurov.jamshed"},
		{name: "already latin", in: "John Smith LLC", want: "john.smith.llc"},
		{name: "empty", in: "", want: ""},
		{name: "only punctuation", in: "!!!", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := slugify(tt.in); got != tt.want {
				t.Errorf("slugify(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestGenerateDealerLogin(t *testing.T) {
	login, err := generateDealerLogin("Иван Петров")
	if err != nil {
		t.Fatalf("generateDealerLogin() error = %v", err)
	}
	if !strings.HasPrefix(login, "ivan.petrov.") {
		t.Errorf("generateDealerLogin() = %q, want prefix %q", login, "ivan.petrov.")
	}

	other, err := generateDealerLogin("Иван Петров")
	if err != nil {
		t.Fatalf("generateDealerLogin() error = %v", err)
	}
	if login == other {
		t.Error("generateDealerLogin() returned the same login twice in a row")
	}
}

func TestGenerateDealerLogin_BlankName(t *testing.T) {
	login, err := generateDealerLogin("!!!")
	if err != nil {
		t.Fatalf("generateDealerLogin() error = %v", err)
	}
	if !strings.HasPrefix(login, "dealer.") {
		t.Errorf("generateDealerLogin() = %q, want prefix %q", login, "dealer.")
	}
}
