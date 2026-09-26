package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/avtomalyar/backend/internal/domain"
)

func TestWriteErrorPassesTheReasonOn(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
		wantReason string
	}{
		{
			name:       "reasoned conflict",
			err:        fmt.Errorf("delete city: %w", domain.Reasoned(domain.ErrConflict, "city_in_use", "in use")),
			wantStatus: http.StatusConflict,
			wantCode:   "conflict",
			wantReason: "city_in_use",
		},
		{
			name:       "plain sentinel",
			err:        domain.ErrNotFound,
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:       "unexpected error hides its detail",
			err:        errors.New("boom"),
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			writeError(rec, logger, tc.err)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
			var body apiErrorBody
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body.Error.Code != tc.wantCode || body.Error.Reason != tc.wantReason {
				t.Fatalf("got code=%q reason=%q, want %q %q",
					body.Error.Code, body.Error.Reason, tc.wantCode, tc.wantReason)
			}
		})
	}
}
