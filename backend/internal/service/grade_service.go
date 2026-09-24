package service

import (
	"context"
	"fmt"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

// gradeRepository is satisfied by *repository.Repository: plain reads plus
// a transaction runner, since every write also needs to recompute every
// dealer's grade (ToR 3.3) in the same transaction.
type gradeRepository interface {
	ListGrades(ctx context.Context) ([]db.Grade, error)
	GetGradeByID(ctx context.Context, id int64) (db.Grade, error)
	WithTx(ctx context.Context, fn func(q *db.Queries) error) error
}

// GradeService implements CRUD for dealer grades. Every write recomputes
// grade_id for every dealer in the same transaction, via a single bulk SQL
// statement (queries/grades.sql, RecomputeAllDealerGrades) — see
// domain.SelectGrade for the equivalent, independently-tested per-dealer
// rule this statement implements.
type GradeService struct {
	repo gradeRepository
}

// NewGradeService constructs a GradeService backed by repo.
func NewGradeService(repo gradeRepository) *GradeService {
	return &GradeService{repo: repo}
}

// List returns all grades ordered by ascending threshold.
func (s *GradeService) List(ctx context.Context) ([]db.Grade, error) {
	grades, err := s.repo.ListGrades(ctx)
	if err != nil {
		return nil, fmt.Errorf("list grades: %w", repository.TranslateError(err))
	}
	return grades, nil
}

// Get returns the grade with the given id, or domain.ErrNotFound.
func (s *GradeService) Get(ctx context.Context, id int64) (db.Grade, error) {
	grade, err := s.repo.GetGradeByID(ctx, id)
	if err != nil {
		return db.Grade{}, fmt.Errorf("get grade: %w", repository.TranslateError(err))
	}
	return grade, nil
}

// Create adds a new grade and recomputes every dealer's grade.
func (s *GradeService) Create(ctx context.Context, nameRu, nameTg string, minPurchaseAmount int64) (db.Grade, error) {
	var grade db.Grade
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		var err error
		grade, err = q.CreateGrade(ctx, db.CreateGradeParams{
			NameRu: nameRu, NameTg: nameTg, MinPurchaseAmount: minPurchaseAmount,
		})
		if err != nil {
			return err
		}
		return q.RecomputeAllDealerGrades(ctx)
	})
	if err != nil {
		return db.Grade{}, fmt.Errorf("create grade: %w", repository.TranslateError(err))
	}
	return grade, nil
}

// Update overwrites an existing grade's fields and recomputes every
// dealer's grade, since a threshold change can move dealers between
// grades.
func (s *GradeService) Update(ctx context.Context, id int64, nameRu, nameTg string, minPurchaseAmount int64) (db.Grade, error) {
	var grade db.Grade
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		var err error
		grade, err = q.UpdateGrade(ctx, db.UpdateGradeParams{
			ID: id, NameRu: nameRu, NameTg: nameTg, MinPurchaseAmount: minPurchaseAmount,
		})
		if err != nil {
			return err
		}
		return q.RecomputeAllDealerGrades(ctx)
	})
	if err != nil {
		return db.Grade{}, fmt.Errorf("update grade: %w", repository.TranslateError(err))
	}
	return grade, nil
}

// Delete removes a grade and recomputes every dealer's grade, since
// dealers assigned to it fall back to the next applicable grade (or none).
func (s *GradeService) Delete(ctx context.Context, id int64) error {
	err := s.repo.WithTx(ctx, func(q *db.Queries) error {
		rows, err := q.DeleteGrade(ctx, id)
		if err != nil {
			return err
		}
		if rows == 0 {
			return domain.ErrNotFound
		}
		return q.RecomputeAllDealerGrades(ctx)
	})
	if err != nil {
		return fmt.Errorf("delete grade: %w", repository.TranslateError(err))
	}
	return nil
}
