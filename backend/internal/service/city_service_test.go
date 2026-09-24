package service

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository/db"
)

type fakeCityRepository struct {
	cities    map[int64]db.City
	deleteErr error
}

func (f *fakeCityRepository) ListCities(_ context.Context) ([]db.City, error) {
	items := make([]db.City, 0, len(f.cities))
	for _, c := range f.cities {
		items = append(items, c)
	}
	return items, nil
}

func (f *fakeCityRepository) GetCityByID(_ context.Context, id int64) (db.City, error) {
	c, ok := f.cities[id]
	if !ok {
		return db.City{}, pgx.ErrNoRows
	}
	return c, nil
}

func (f *fakeCityRepository) CreateCity(_ context.Context, arg db.CreateCityParams) (db.City, error) {
	c := db.City{ID: int64(len(f.cities) + 1), NameRu: arg.NameRu, NameTg: arg.NameTg}
	f.cities[c.ID] = c
	return c, nil
}

func (f *fakeCityRepository) UpdateCity(_ context.Context, arg db.UpdateCityParams) (db.City, error) {
	c, ok := f.cities[arg.ID]
	if !ok {
		return db.City{}, pgx.ErrNoRows
	}
	c.NameRu, c.NameTg = arg.NameRu, arg.NameTg
	f.cities[arg.ID] = c
	return c, nil
}

func (f *fakeCityRepository) DeleteCity(_ context.Context, id int64) (int64, error) {
	if f.deleteErr != nil {
		return 0, f.deleteErr
	}
	if _, ok := f.cities[id]; !ok {
		return 0, nil
	}
	delete(f.cities, id)
	return 1, nil
}

func TestCityService_Get_NotFound(t *testing.T) {
	svc := NewCityService(&fakeCityRepository{cities: map[int64]db.City{}})

	_, err := svc.Get(context.Background(), 1)
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("Get() error = %v, want %v", err, domain.ErrNotFound)
	}
}

func TestCityService_Delete_NotFound(t *testing.T) {
	svc := NewCityService(&fakeCityRepository{cities: map[int64]db.City{}})

	err := svc.Delete(context.Background(), 1)
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("Delete() error = %v, want %v", err, domain.ErrNotFound)
	}
}

func TestCityService_Delete_ConflictWhenReferenced(t *testing.T) {
	repo := &fakeCityRepository{
		cities:    map[int64]db.City{1: {ID: 1, NameRu: "Душанбе", NameTg: "Душанбе"}},
		deleteErr: &pgconn.PgError{Code: "23503", Message: "still referenced by dealers"},
	}
	svc := NewCityService(repo)

	err := svc.Delete(context.Background(), 1)
	if !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("Delete() error = %v, want %v", err, domain.ErrConflict)
	}
}

func TestCityService_CreateAndGet(t *testing.T) {
	svc := NewCityService(&fakeCityRepository{cities: map[int64]db.City{}})

	created, err := svc.Create(context.Background(), "Худжанд", "Хуҷанд")
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	got, err := svc.Get(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got != created {
		t.Errorf("Get() = %+v, want %+v", got, created)
	}
}
