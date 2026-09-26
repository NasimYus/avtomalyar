package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

type cityRepository interface {
	ListCities(ctx context.Context) ([]db.City, error)
	GetCityByID(ctx context.Context, id int64) (db.City, error)
	CreateCity(ctx context.Context, arg db.CreateCityParams) (db.City, error)
	UpdateCity(ctx context.Context, arg db.UpdateCityParams) (db.City, error)
	DeleteCity(ctx context.Context, id int64) (int64, error)
}

// CityService implements CRUD for the city reference list, translating
// storage errors (not found, FK conflict on delete) into domain errors.
type CityService struct {
	repo cityRepository
}

// NewCityService constructs a CityService backed by repo.
func NewCityService(repo cityRepository) *CityService {
	return &CityService{repo: repo}
}

// List returns all cities ordered by Russian name.
func (s *CityService) List(ctx context.Context) ([]db.City, error) {
	cities, err := s.repo.ListCities(ctx)
	if err != nil {
		return nil, fmt.Errorf("list cities: %w", repository.TranslateError(err))
	}
	return cities, nil
}

// Get returns the city with the given id, or domain.ErrNotFound.
func (s *CityService) Get(ctx context.Context, id int64) (db.City, error) {
	city, err := s.repo.GetCityByID(ctx, id)
	if err != nil {
		return db.City{}, fmt.Errorf("get city: %w", repository.TranslateError(err))
	}
	return city, nil
}

// Create adds a new city.
func (s *CityService) Create(ctx context.Context, nameRu, nameTg string) (db.City, error) {
	city, err := s.repo.CreateCity(ctx, db.CreateCityParams{NameRu: nameRu, NameTg: nameTg})
	if err != nil {
		return db.City{}, fmt.Errorf("create city: %w", repository.TranslateError(err))
	}
	return city, nil
}

// Update overwrites the names of an existing city.
func (s *CityService) Update(ctx context.Context, id int64, nameRu, nameTg string) (db.City, error) {
	city, err := s.repo.UpdateCity(ctx, db.UpdateCityParams{ID: id, NameRu: nameRu, NameTg: nameTg})
	if err != nil {
		return db.City{}, fmt.Errorf("update city: %w", repository.TranslateError(err))
	}
	return city, nil
}

// Delete removes a city. It returns domain.ErrConflict (via
// repository.TranslateError) if dealers still reference it, since city_id
// is a RESTRICT foreign key.
func (s *CityService) Delete(ctx context.Context, id int64) error {
	rows, err := s.repo.DeleteCity(ctx, id)
	if err != nil {
		if errors.Is(repository.TranslateError(err), domain.ErrConflict) {
			return domain.Reasoned(domain.ErrConflict, "city_in_use", "city is still assigned to one or more dealers")
		}
		return fmt.Errorf("delete city: %w", repository.TranslateError(err))
	}
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}
