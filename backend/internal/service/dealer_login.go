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

// legalFormPrefixes are dropped from a login: «ООО "КрасТех"» should
// become krasteh, not ooo.krasteh — the legal form says nothing about
// which dealer this is, and every second dealer shares it.
var legalFormPrefixes = map[string]bool{
	"ооо": true, "зао": true, "оао": true, "ип": true, "чп": true,
	"ҷдмм": true, "ҷсдм": true, "ltd": true, "llc": true,
}

// slugify transforms a display name into a lowercase ASCII slug suitable
// for a login: drops the legal form, transliterates Cyrillic, and keeps
// only letters, digits, dots and hyphens.
func slugify(s string) string {
	words := make([]string, 0, 4)
	for _, word := range strings.Fields(strings.ToLower(s)) {
		cleaned := strings.Trim(word, `«»"'(),.`)
		if cleaned == "" || legalFormPrefixes[cleaned] {
			continue
		}
		words = append(words, cleaned)
	}

	var b strings.Builder
	for i, word := range words {
		if i > 0 {
			b.WriteByte('.')
		}
		for _, r := range word {
			switch {
			case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '.', r == '-':
				b.WriteRune(r)
			default:
				b.WriteString(cyrillicToLatin[r])
			}
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
