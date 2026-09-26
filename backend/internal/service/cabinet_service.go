package service

import (
	"context"
	"fmt"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
)

type cabinetRepository interface {
	GetDealerProfile(ctx context.Context, id int64) (db.GetDealerProfileRow, error)
	ListCities(ctx context.Context) ([]db.City, error)
	ListGrades(ctx context.Context) ([]db.Grade, error)
	ListDealerPromotions(ctx context.Context) ([]db.Promotion, error)
	ListPrizePlaces(ctx context.Context, promotionID int64) ([]db.ListPrizePlacesRow, error)
	ListPromotionResults(ctx context.Context, promotionID int64) ([]db.ListPromotionResultsRow, error)
	ListActiveDealersWithPeriodTotals(
		ctx context.Context,
		arg db.ListActiveDealersWithPeriodTotalsParams,
	) ([]db.ListActiveDealersWithPeriodTotalsRow, error)
}

// DealerProfile is the cabinet's own view of a dealer: their details, the
// grade they hold and the one they are working towards.
type DealerProfile struct {
	Dealer db.GetDealerProfileRow
	// Nil once the top grade is reached.
	NextGrade *NextGradeProgress
}

// NextGradeProgress is how far a dealer is from their next grade.
type NextGradeProgress struct {
	GradeID int64
	NameRu  string
	NameTg  string
	// Threshold of the next grade and what is still missing, in dirams.
	MinPurchaseAmount int64
	Remaining         int64
}

// CabinetService serves a dealer's own data. Every method takes the dealer
// id from the authenticated principal — nothing here accepts an id chosen
// by the caller's request body.
type CabinetService struct {
	repo cabinetRepository
	// Purchase listing is the admin one with the dealer filter pinned, so
	// both sides read the history through the same code.
	purchases *PurchaseService
}

// NewCabinetService constructs a CabinetService backed by repo, reading
// purchase history through purchases.
func NewCabinetService(repo cabinetRepository, purchases *PurchaseService) *CabinetService {
	return &CabinetService{repo: repo, purchases: purchases}
}

// Profile returns the dealer's own details and grade progress.
func (s *CabinetService) Profile(ctx context.Context, dealerID int64) (DealerProfile, error) {
	dealer, err := s.repo.GetDealerProfile(ctx, dealerID)
	if err != nil {
		return DealerProfile{}, fmt.Errorf("get dealer profile: %w", repository.TranslateError(err))
	}

	grades, err := s.repo.ListGrades(ctx)
	if err != nil {
		return DealerProfile{}, fmt.Errorf("list grades: %w", repository.TranslateError(err))
	}

	ladder := make([]domain.Grade, len(grades))
	byID := make(map[int64]db.Grade, len(grades))
	for i, grade := range grades {
		ladder[i] = domain.Grade{ID: grade.ID, MinPurchaseAmount: grade.MinPurchaseAmount}
		byID[grade.ID] = grade
	}

	profile := DealerProfile{Dealer: dealer}
	next, remaining, ok := domain.NextGrade(ladder, dealer.LifetimePurchaseTotal)
	if ok {
		grade := byID[next.ID]
		profile.NextGrade = &NextGradeProgress{
			GradeID:           grade.ID,
			NameRu:            grade.NameRu,
			NameTg:            grade.NameTg,
			MinPurchaseAmount: grade.MinPurchaseAmount,
			Remaining:         remaining,
		}
	}
	return profile, nil
}

// Purchases returns a page of the dealer's own purchases. The filter's
// DealerID is overwritten with the authenticated dealer, so a crafted
// request cannot page through someone else's history.
func (s *CabinetService) Purchases(
	ctx context.Context,
	dealerID int64,
	filter PurchaseFilter,
) (PurchasePage, error) {
	filter.DealerID = &dealerID
	return s.purchases.List(ctx, filter)
}

// snapshot turns the profile row into what the eligibility rule judges on.
func dealerSnapshot(dealer db.GetDealerProfileRow) domain.DealerSnapshot {
	return domain.DealerSnapshot{
		ID:                    dealer.ID,
		CityID:                dealer.CityID,
		GradeID:               int8ToPtr(dealer.GradeID),
		IsActive:              dealer.IsActive,
		LifetimePurchaseTotal: dealer.LifetimePurchaseTotal,
	}
}

func promotionConditions(promotion db.Promotion) domain.PromotionConditions {
	return domain.PromotionConditions{
		CityID:               int8ToPtr(promotion.CityID),
		GradeID:              int8ToPtr(promotion.GradeID),
		MinLifetimeThreshold: int8ToPtr(promotion.MinLifetimePurchaseThreshold),
	}
}

// RequirementKind names one of a promotion's entry conditions.
type RequirementKind string

// The conditions a promotion can put on taking part (ToR 4.1).
const (
	// RequirementCity — the dealer must be registered in a given city.
	RequirementCity RequirementKind = "city"
	// RequirementGrade — the dealer must hold a given grade.
	RequirementGrade RequirementKind = "grade"
	// RequirementPurchases — the dealer's lifetime total must reach a figure.
	RequirementPurchases RequirementKind = "purchases"
)

// Requirement is one entry condition together with whether this dealer
// meets it, so the cabinet can show what is still in the way.
type Requirement struct {
	Kind RequirementKind
	Met  bool
	// City or grade name; empty for a purchase threshold.
	NameRu string
	NameTg string
	// Purchase threshold and what is still missing, in dirams.
	Threshold int64
	Remaining int64
}

// requirements lists a promotion's conditions as they stand for a dealer.
// Conditions the promotion does not set are left out entirely.
func requirements(
	promotion db.Promotion,
	dealer db.GetDealerProfileRow,
	cities map[int64]db.City,
	grades map[int64]db.Grade,
) []Requirement {
	var list []Requirement

	if promotion.CityID.Valid {
		city := cities[promotion.CityID.Int64]
		list = append(list, Requirement{
			Kind:   RequirementCity,
			Met:    dealer.CityID == promotion.CityID.Int64,
			NameRu: city.NameRu,
			NameTg: city.NameTg,
		})
	}

	if promotion.GradeID.Valid {
		grade := grades[promotion.GradeID.Int64]
		list = append(list, Requirement{
			Kind:   RequirementGrade,
			Met:    dealer.GradeID.Valid && dealer.GradeID.Int64 == promotion.GradeID.Int64,
			NameRu: grade.NameRu,
			NameTg: grade.NameTg,
		})
	}

	if promotion.MinLifetimePurchaseThreshold.Valid {
		threshold := promotion.MinLifetimePurchaseThreshold.Int64
		remaining := threshold - dealer.LifetimePurchaseTotal
		if remaining < 0 {
			remaining = 0
		}
		list = append(list, Requirement{
			Kind:      RequirementPurchases,
			Met:       remaining == 0,
			Threshold: threshold,
			Remaining: remaining,
		})
	}

	return list
}

// RankingEntry is one line of a promotion's ranking as the cabinet shows it.
type RankingEntry struct {
	DealerID    int64
	DealerName  string
	Place       int32
	PeriodTotal int64
	PrizeNameRu *string
	PrizeNameTg *string
	// Only meaningful once results are published.
	Awarded bool
	// True for the dealer viewing the page, so the row can be highlighted.
	IsMe bool
}

// CabinetPromotion is a promotion the dealer takes part in, with their own
// standing in it.
type CabinetPromotion struct {
	Promotion db.Promotion
	// Nil while the results are being reviewed, and for a dealer who has
	// no standing yet.
	Standing *RankingEntry
	// How many dealers take part, so the cabinet can say "3rd of 12".
	ParticipantsCount int
	// False when the dealer does not meet the conditions yet. Such a
	// promotion is still shown — its prizes are what the dealer is
	// working towards — but never with a ranking they are not part of.
	Eligible bool
	// The promotion's conditions as they stand for this dealer.
	Requirements []Requirement
}

// CabinetPromotionDetail adds the prizes and the whole ranking.
type CabinetPromotionDetail struct {
	CabinetPromotion
	PrizePlaces []db.ListPrizePlacesRow
	// Empty while an ended promotion's results are still being reviewed.
	Ranking []RankingEntry
	// True when the ranking comes from published results rather than from
	// a live count that can still change.
	Final bool
}

// Promotions lists every promotion the shop is running that the dealer
// may see, newest first — including the ones whose conditions they do not
// meet yet, marked as such.
//
// For the ones they do take part in the whole ranking is built just to
// pick their own line out of it. That is more work than the list strictly
// needs, but it keeps one implementation of the ranking rules; a dealer
// sees a handful of promotions and the dealer count is in the hundreds.
func (s *CabinetService) Promotions(ctx context.Context, dealerID int64) ([]CabinetPromotion, error) {
	dealer, err := s.repo.GetDealerProfile(ctx, dealerID)
	if err != nil {
		return nil, fmt.Errorf("get dealer profile: %w", repository.TranslateError(err))
	}

	promotions, err := s.repo.ListDealerPromotions(ctx)
	if err != nil {
		return nil, fmt.Errorf("list promotions: %w", repository.TranslateError(err))
	}

	cities, grades, err := s.referenceNames(ctx)
	if err != nil {
		return nil, err
	}

	snapshot := dealerSnapshot(dealer)
	visible := make([]CabinetPromotion, 0, len(promotions))

	for _, promotion := range promotions {
		entry := CabinetPromotion{
			Promotion:    promotion,
			Eligible:     domain.IsEligible(snapshot, promotionConditions(promotion)),
			Requirements: requirements(promotion, dealer, cities, grades),
		}

		if entry.Eligible {
			ranking, _, err := s.ranking(ctx, promotion, dealerID)
			if err != nil {
				return nil, err
			}
			entry.ParticipantsCount = len(ranking)
			for _, line := range ranking {
				if line.IsMe {
					mine := line
					entry.Standing = &mine
					break
				}
			}
		}

		visible = append(visible, entry)
	}

	return visible, nil
}

// referenceNames loads the two small reference tables the conditions are
// spelled out with. Both are a handful of rows, so they are fetched whole
// rather than joined per promotion.
func (s *CabinetService) referenceNames(
	ctx context.Context,
) (map[int64]db.City, map[int64]db.Grade, error) {
	cityRows, err := s.repo.ListCities(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("list cities: %w", repository.TranslateError(err))
	}
	gradeRows, err := s.repo.ListGrades(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("list grades: %w", repository.TranslateError(err))
	}

	cities := make(map[int64]db.City, len(cityRows))
	for _, city := range cityRows {
		cities[city.ID] = city
	}
	grades := make(map[int64]db.Grade, len(gradeRows))
	for _, grade := range gradeRows {
		grades[grade.ID] = grade
	}
	return cities, grades, nil
}

// Promotion returns one promotion with its prizes, and the full ranking
// when the dealer takes part in it. A dealer who does not meet the
// conditions still sees the terms and the prizes, but never the ranking
// of a contest they are not in.
//
// A promotion the cabinet does not serve at all answers ErrNotFound, so
// it is indistinguishable from one that does not exist.
func (s *CabinetService) Promotion(
	ctx context.Context,
	dealerID, promotionID int64,
) (CabinetPromotionDetail, error) {
	dealer, err := s.repo.GetDealerProfile(ctx, dealerID)
	if err != nil {
		return CabinetPromotionDetail{}, fmt.Errorf("get dealer profile: %w", repository.TranslateError(err))
	}

	promotions, err := s.repo.ListDealerPromotions(ctx)
	if err != nil {
		return CabinetPromotionDetail{}, fmt.Errorf("list promotions: %w", repository.TranslateError(err))
	}

	var promotion db.Promotion
	found := false
	for _, candidate := range promotions {
		if candidate.ID == promotionID {
			promotion = candidate
			found = true
			break
		}
	}
	if !found {
		return CabinetPromotionDetail{}, domain.ErrNotFound
	}

	cities, grades, err := s.referenceNames(ctx)
	if err != nil {
		return CabinetPromotionDetail{}, err
	}

	places, err := s.repo.ListPrizePlaces(ctx, promotionID)
	if err != nil {
		return CabinetPromotionDetail{}, fmt.Errorf("list prize places: %w", repository.TranslateError(err))
	}

	detail := CabinetPromotionDetail{
		CabinetPromotion: CabinetPromotion{
			Promotion:    promotion,
			Eligible:     domain.IsEligible(dealerSnapshot(dealer), promotionConditions(promotion)),
			Requirements: requirements(promotion, dealer, cities, grades),
		},
		PrizePlaces: places,
	}
	if !detail.Eligible {
		return detail, nil
	}

	ranking, final, err := s.ranking(ctx, promotion, dealerID)
	if err != nil {
		return CabinetPromotionDetail{}, err
	}
	detail.Ranking = ranking
	detail.Final = final
	detail.ParticipantsCount = len(ranking)
	for _, line := range ranking {
		if line.IsMe {
			mine := line
			detail.Standing = &mine
			break
		}
	}
	return detail, nil
}

// ranking builds the promotion's ranking as the dealer may see it: the
// published one once it exists, a live count while the promotion runs, and
// nothing at all while an admin is still reviewing computed results.
func (s *CabinetService) ranking(
	ctx context.Context,
	promotion db.Promotion,
	dealerID int64,
) (entries []RankingEntry, final bool, err error) {
	switch domain.PromotionStatus(promotion.Status) {
	case domain.PromotionPublished:
		results, err := s.repo.ListPromotionResults(ctx, promotion.ID)
		if err != nil {
			return nil, false, fmt.Errorf("list promotion results: %w", repository.TranslateError(err))
		}

		entries := make([]RankingEntry, 0, len(results))
		for _, result := range results {
			entry := RankingEntry{
				DealerID:    result.DealerID,
				DealerName:  result.DealerName,
				PeriodTotal: result.PeriodTotal,
				Awarded:     result.Awarded,
				IsMe:        result.DealerID == dealerID,
			}
			if result.PlaceRank.Valid {
				entry.Place = result.PlaceRank.Int32
			}
			if result.PrizeNameRu.Valid {
				entry.PrizeNameRu = &result.PrizeNameRu.String
			}
			if result.PrizeNameTg.Valid {
				entry.PrizeNameTg = &result.PrizeNameTg.String
			}
			entries = append(entries, entry)
		}
		return entries, true, nil

	case domain.PromotionActive:
		return s.liveRanking(ctx, promotion, dealerID)

	// Results exist but an admin may still correct them, so the cabinet
	// shows the promotion as "being decided" rather than a ranking that
	// could change under the dealer's feet.
	case domain.PromotionCalculated:
		return nil, false, nil

	case domain.PromotionDraft, domain.PromotionArchived:
		return nil, false, nil

	default:
		return nil, false, nil
	}
}

// liveRanking counts the running promotion from the purchases as they
// stand right now, using the same rules the final calculation applies.
func (s *CabinetService) liveRanking(
	ctx context.Context,
	promotion db.Promotion,
	dealerID int64,
) ([]RankingEntry, bool, error) {
	rows, err := s.repo.ListActiveDealersWithPeriodTotals(ctx, db.ListActiveDealersWithPeriodTotalsParams{
		DateFrom: promotion.StartDate,
		DateTo:   promotion.EndDate,
	})
	if err != nil {
		return nil, false, fmt.Errorf("load participants: %w", repository.TranslateError(err))
	}

	conditions := promotionConditions(promotion)
	names := make(map[int64]string, len(rows))
	participants := make([]domain.Participant, 0, len(rows))

	for _, row := range rows {
		snapshot := domain.DealerSnapshot{
			ID:                    row.DealerID,
			CityID:                row.CityID,
			GradeID:               int8ToPtr(row.GradeID),
			IsActive:              true, // the query only returns active dealers
			LifetimePurchaseTotal: row.LifetimePurchaseTotal,
		}
		if !domain.IsEligible(snapshot, conditions) {
			continue
		}

		names[row.DealerID] = row.DealerName
		participants = append(participants, domain.Participant{
			DealerID:              row.DealerID,
			PeriodTotal:           row.PeriodTotal,
			LastPurchaseDate:      row.LastPurchaseDate.Time,
			LastPurchaseCreatedAt: row.LastPurchaseCreatedAt.Time,
		})
	}

	prizeByPlace, err := s.prizeNamesByPlace(ctx, promotion.ID)
	if err != nil {
		return nil, false, err
	}

	ranked := domain.RankParticipants(participants)
	entries := make([]RankingEntry, len(ranked))
	for i, participant := range ranked {
		place := int32(participant.Place) //nolint:gosec // places are bounded by the dealer count
		entries[i] = RankingEntry{
			DealerID:    participant.DealerID,
			DealerName:  names[participant.DealerID],
			Place:       place,
			PeriodTotal: participant.PeriodTotal,
			IsMe:        participant.DealerID == dealerID,
		}
		if prize, ok := prizeByPlace[place]; ok {
			entries[i].PrizeNameRu = &prize.ru
			entries[i].PrizeNameTg = &prize.tg
		}
	}
	return entries, false, nil
}

type prizeNames struct{ ru, tg string }

func (s *CabinetService) prizeNamesByPlace(ctx context.Context, promotionID int64) (map[int32]prizeNames, error) {
	places, err := s.repo.ListPrizePlaces(ctx, promotionID)
	if err != nil {
		return nil, fmt.Errorf("list prize places: %w", repository.TranslateError(err))
	}

	byPlace := make(map[int32]prizeNames, len(places))
	for _, place := range places {
		byPlace[place.PlaceRank] = prizeNames{ru: place.PrizeNameRu, tg: place.PrizeNameTg}
	}
	return byPlace, nil
}
