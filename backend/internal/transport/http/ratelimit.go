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

func (l *ipRateLimiter) limiter(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	limiter, ok := l.limiters[ip]
	if !ok {
		limiter = rate.NewLimiter(l.r, l.burst)
		l.limiters[ip] = limiter
	}
	return limiter
}

// blocked reports whether ip has used up its failed attempts.
func (l *ipRateLimiter) blocked(ip string) bool {
	return l.limiter(ip).Tokens() < 1
}

// fail records a failed attempt from ip.
func (l *ipRateLimiter) fail(ip string) {
	l.limiter(ip).Allow()
}

// rateLimitLogin allows `burst` failed login attempts per client IP, then
// one more every `r`, rejecting the rest with 429 so the login form can't
// be used to brute-force passwords. Only failures count: a dealer who
// signs in fine never gets closer to the limit, however often they do.
func rateLimitLogin(next http.Handler) http.Handler {
	return newLoginLimiter(rate.Every(12*time.Second), 5)(next) // ~5 misses, then 1 every 12s
}

func newLoginLimiter(r rate.Limit, burst int) func(http.Handler) http.Handler {
	limiter := newIPRateLimiter(r, burst)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			if limiter.blocked(ip) {
				writeJSONError(w, http.StatusTooManyRequests, "rate_limited", "too many login attempts, try again later", nil)
				return
			}
			recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(recorder, r)
			if recorder.status >= http.StatusBadRequest {
				limiter.fail(ip)
			}
		})
	}
}

// statusRecorder remembers the status code a handler wrote.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(status int) {
	s.status = status
	s.ResponseWriter.WriteHeader(status)
}

// clientIP is the address the request came from. Behind our own reverse
// proxy (nginx in the frontend container, reached over a private or
// loopback address) every request would otherwise share the proxy's IP —
// and one dealer's typos would lock everyone out — so the proxy's
// X-Real-IP is used instead. A request arriving from a public address is
// never trusted with that header, so it cannot be spoofed from outside.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}

	peer := net.ParseIP(host)
	if peer != nil && (peer.IsLoopback() || peer.IsPrivate()) {
		if forwarded := net.ParseIP(r.Header.Get("X-Real-IP")); forwarded != nil {
			return forwarded.String()
		}
	}
	return host
}
