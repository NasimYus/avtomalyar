package service

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
	"github.com/avtomalyar/backend/internal/storage"
)

type prizeRepository interface {
	ListPrizes(ctx context.Context) ([]db.Prize, error)
	GetPrizeByID(ctx context.Context, id int64) (db.Prize, error)
	CreatePrize(ctx context.Context, arg db.CreatePrizeParams) (db.Prize, error)
	UpdatePrize(ctx context.Context, arg db.UpdatePrizeParams) (db.Prize, error)
	UpdatePrizePhoto(ctx context.Context, arg db.UpdatePrizePhotoParams) (db.Prize, error)
	DeletePrize(ctx context.Context, id int64) (int64, error)
}

// PrizeFields is the set of editable prize attributes, shared by Create
// and Update.
type PrizeFields struct {
	NameRu        string
	NameTg        string
	DescriptionRu *string
	DescriptionTg *string
	StockQuantity *int32
}

// PrizeService implements CRUD for prizes plus photo upload storage.
type PrizeService struct {
	repo  prizeRepository
	files *storage.FileStore
}

// NewPrizeService constructs a PrizeService backed by repo, storing photos
// under files.
func NewPrizeService(repo prizeRepository, files *storage.FileStore) *PrizeService {
	return &PrizeService{repo: repo, files: files}
}

// List returns all prizes ordered by Russian name.
func (s *PrizeService) List(ctx context.Context) ([]db.Prize, error) {
	prizes, err := s.repo.ListPrizes(ctx)
	if err != nil {
		return nil, fmt.Errorf("list prizes: %w", repository.TranslateError(err))
	}
	return prizes, nil
}

// Get returns the prize with the given id, or domain.ErrNotFound.
func (s *PrizeService) Get(ctx context.Context, id int64) (db.Prize, error) {
	prize, err := s.repo.GetPrizeByID(ctx, id)
	if err != nil {
		return db.Prize{}, fmt.Errorf("get prize: %w", repository.TranslateError(err))
	}
	return prize, nil
}

// Create adds a new prize (without a photo — use SetPhoto afterwards).
func (s *PrizeService) Create(ctx context.Context, fields PrizeFields) (db.Prize, error) {
	prize, err := s.repo.CreatePrize(ctx, db.CreatePrizeParams{
		NameRu:        fields.NameRu,
		NameTg:        fields.NameTg,
		DescriptionRu: textOrNull(fields.DescriptionRu),
		DescriptionTg: textOrNull(fields.DescriptionTg),
		StockQuantity: int4OrNull(fields.StockQuantity),
	})
	if err != nil {
		return db.Prize{}, fmt.Errorf("create prize: %w", repository.TranslateError(err))
	}
	return prize, nil
}

// Update overwrites a prize's fields, leaving its photo untouched.
func (s *PrizeService) Update(ctx context.Context, id int64, fields PrizeFields) (db.Prize, error) {
	prize, err := s.repo.UpdatePrize(ctx, db.UpdatePrizeParams{
		ID:            id,
		NameRu:        fields.NameRu,
		NameTg:        fields.NameTg,
		DescriptionRu: textOrNull(fields.DescriptionRu),
		DescriptionTg: textOrNull(fields.DescriptionTg),
		StockQuantity: int4OrNull(fields.StockQuantity),
	})
	if err != nil {
		return db.Prize{}, fmt.Errorf("update prize: %w", repository.TranslateError(err))
	}
	return prize, nil
}

// SetPhoto saves the given image bytes for the prize under filename and
// records its public path (served under /media/) on the prize row.
func (s *PrizeService) SetPhoto(ctx context.Context, id int64, filename string, data []byte) (db.Prize, error) {
	relPath, err := s.files.Save("prizes", filename, data)
	if err != nil {
		return db.Prize{}, fmt.Errorf("save prize photo: %w", err)
	}

	prize, err := s.repo.UpdatePrizePhoto(ctx, db.UpdatePrizePhotoParams{
		ID:        id,
		PhotoPath: pgtype.Text{String: "/media/" + relPath, Valid: true},
	})
	if err != nil {
		return db.Prize{}, fmt.Errorf("set prize photo: %w", repository.TranslateError(err))
	}
	return prize, nil
}

// Delete removes a prize.
func (s *PrizeService) Delete(ctx context.Context, id int64) error {
	rows, err := s.repo.DeletePrize(ctx, id)
	if err != nil {
		return fmt.Errorf("delete prize: %w", repository.TranslateError(err))
	}
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}
