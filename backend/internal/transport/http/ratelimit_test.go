package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"golang.org/x/time/rate"
)

func limiterRequest(remote, realIP string) *http.Request {
	r := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/v1/auth/login", nil)
	r.RemoteAddr = remote
	if realIP != "" {
		r.Header.Set("X-Real-IP", realIP)
	}
	return r
}

// login answers 200 for "ok" and 401 otherwise, like a real sign-in.
func fakeLogin(ok bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if ok {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusUnauthorized)
	})
}

func TestLoginLimiterCountsOnlyFailures(t *testing.T) {
	limit := newLoginLimiter(rate.Every(time.Hour), 3)
	success := limit(fakeLogin(true))

	for i := range 10 {
		rec := httptest.NewRecorder()
		success.ServeHTTP(rec, limiterRequest("203.0.113.7:5000", ""))
		if rec.Code != http.StatusOK {
			t.Fatalf("successful login #%d got %d, want 200", i+1, rec.Code)
		}
	}
}

func TestLoginLimiterBlocksAfterRepeatedFailures(t *testing.T) {
	limit := newLoginLimiter(rate.Every(time.Hour), 3)
	failure := limit(fakeLogin(false))

	codes := make([]int, 0, 4)
	for range 4 {
		rec := httptest.NewRecorder()
		failure.ServeHTTP(rec, limiterRequest("203.0.113.7:5000", ""))
		codes = append(codes, rec.Code)
	}
	want := []int{401, 401, 401, 429}
	for i := range want {
		if codes[i] != want[i] {
			t.Fatalf("codes = %v, want %v", codes, want)
		}
	}
}

func TestLoginLimiterSeparatesClientsBehindTheProxy(t *testing.T) {
	limit := newLoginLimiter(rate.Every(time.Hour), 2)
	failure := limit(fakeLogin(false))

	// One dealer mistypes their password until blocked…
	for range 3 {
		failure.ServeHTTP(httptest.NewRecorder(), limiterRequest("172.18.0.5:40000", "198.51.100.1"))
	}
	// …and another dealer, coming through the same nginx, is not affected.
	rec := httptest.NewRecorder()
	failure.ServeHTTP(rec, limiterRequest("172.18.0.5:40001", "198.51.100.2"))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("second client got %d, want 401 (not rate limited)", rec.Code)
	}
}

func TestClientIPTrustsTheHeaderOnlyFromTheProxy(t *testing.T) {
	cases := []struct {
		remote, header, want string
	}{
		{"172.18.0.5:1234", "198.51.100.9", "198.51.100.9"},
		{"127.0.0.1:1234", "198.51.100.9", "198.51.100.9"},
		{"203.0.113.7:1234", "198.51.100.9", "203.0.113.7"}, // public peer: spoofing attempt ignored
		{"172.18.0.5:1234", "not-an-ip", "172.18.0.5"},
		{"172.18.0.5:1234", "", "172.18.0.5"},
	}
	for _, tc := range cases {
		if got := clientIP(limiterRequest(tc.remote, tc.header)); got != tc.want {
			t.Errorf("clientIP(%s, X-Real-IP=%q) = %s, want %s", tc.remote, tc.header, got, tc.want)
		}
	}
}
