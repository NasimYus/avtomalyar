package service

import (
	"strings"

	"github.com/avtomalyar/backend/internal/auth"
)

// cyrillicToLatin covers the Russian alphabet plus the Tajik-specific
// letters (ғ, қ, ӣ, ӯ, ҳ, ҷ), lowercase only — input is lowercased first.
var cyrillicToLatin = map[rune]string{
	'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d", 'е': "e", 'ё': "yo",
	'ж': "zh", 'з': "z", 'и': "i", 'й': "y", 'к': "k", 'л': "l", 'м': "m",
	'н': "n", 'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t", 'у': "u",
	'ф': "f", 'х': "h", 'ц': "ts", 'ч': "ch", 'ш': "sh", 'щ': "sch",
	'ъ': "", 'ы': "y", 'ь': "", 'э': "e", 'ю': "yu", 'я': "ya",
	'ғ': "gh", 'қ': "q", 'ӣ': "i", 'ӯ': "u", 'ҳ': "h", 'ҷ': "j",
}

// slugify transforms a display name into a lowercase ASCII slug suitable
// for a login: transliterates Cyrillic, drops everything else that isn't
// a letter, digit, dot or hyphen.
func slugify(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '.', r == '-':
			b.WriteRune(r)
		case r == ' ':
			b.WriteByte('.')
		default:
			b.WriteString(cyrillicToLatin[r])
		}
	}
	return b.String()
}

// generateDealerLogin derives a login from a dealer's full name, per the
// ToR's "creating a dealer generates their login and password". A short
// random suffix keeps collisions unlikely; callers still retry on a unique
// constraint violation.
func generateDealerLogin(fullName string) (string, error) {
	slug := slugify(fullName)
	if slug == "" {
		slug = "dealer"
	}
	if len(slug) > 20 {
		slug = slug[:20]
	}

	suffix, err := auth.GenerateRandomPassword(4)
	if err != nil {
		return "", err
	}
	return slug + "." + strings.ToLower(suffix), nil
}
