package http

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// ipRateLimiter tracks one token-bucket limiter per client IP, used to
// slow down brute-force attempts against /auth/login.
type ipRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	r        rate.Limit
	burst    int
}

func newIPRateLimiter(r rate.Limit, burst int) *ipRateLimiter {
	return &ipRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		r:        r,
		burst:    burst,
	}
}

func (l *ipRateLimiter) allow(ip string) bool {
	l.mu.Lock()
	limiter, ok := l.limiters[ip]
	if !ok {
		limiter = rate.NewLimiter(l.r, l.burst)
		l.limiters[ip] = limiter
	}
	l.mu.Unlock()

	return limiter.Allow()
}

// rateLimitLogin allows `burst` requests per client IP and then refills at
// `r` requests/sec, rejecting the rest with 429 so a login form can't be
// used to brute-force passwords.
func rateLimitLogin(next http.Handler) http.Handler {
	limiter := newIPRateLimiter(rate.Every(12*time.Second), 5) // ~5 tries, then 1 every 12s

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		if !limiter.allow(ip) {
			writeJSONError(w, http.StatusTooManyRequests, "rate_limited", "too many login attempts, try again later", nil)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
