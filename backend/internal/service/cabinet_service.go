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

// Promotions lists the promotions the dealer takes part in, newest first.
//
// The whole ranking is built per promotion just to pick the dealer's own
// line out of it. That is more work than the list strictly needs, but it
// keeps one implementation of the ranking rules; a dealer sees a handful
// of promotions and the dealer count is in the hundreds.
func (s *CabinetService) Promotions(ctx context.Context, dealerID int64) ([]CabinetPromotion, error) {
	dealer, err := s.repo.GetDealerProfile(ctx, dealerID)
	if err != nil {
		return nil, fmt.Errorf("get dealer profile: %w", repository.TranslateError(err))
	}

	promotions, err := s.repo.ListDealerPromotions(ctx)
	if err != nil {
		return nil, fmt.Errorf("list promotions: %w", repository.TranslateError(err))
	}

	snapshot := dealerSnapshot(dealer)
	visible := make([]CabinetPromotion, 0, len(promotions))

	for _, promotion := range promotions {
		if !domain.IsEligible(snapshot, promotionConditions(promotion)) {
			continue
		}

		ranking, _, err := s.ranking(ctx, promotion, dealerID)
		if err != nil {
			return nil, err
		}

		entry := CabinetPromotion{Promotion: promotion, ParticipantsCount: len(ranking)}
		for _, line := range ranking {
			if line.IsMe {
				mine := line
				entry.Standing = &mine
				break
			}
		}
		visible = append(visible, entry)
	}

	return visible, nil
}

// Promotion returns one promotion with its prizes and full ranking, or
// ErrNotFound when the dealer does not take part in it. A promotion the
// dealer cannot see is indistinguishable from one that does not exist.
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

	snapshot := dealerSnapshot(dealer)
	var promotion db.Promotion
	found := false
	for _, candidate := range promotions {
		if candidate.ID == promotionID && domain.IsEligible(snapshot, promotionConditions(candidate)) {
			promotion = candidate
			found = true
			break
		}
	}
	if !found {
		return CabinetPromotionDetail{}, domain.ErrNotFound
	}

	places, err := s.repo.ListPrizePlaces(ctx, promotionID)
	if err != nil {
		return CabinetPromotionDetail{}, fmt.Errorf("list prize places: %w", repository.TranslateError(err))
	}

	ranking, final, err := s.ranking(ctx, promotion, dealerID)
	if err != nil {
		return CabinetPromotionDetail{}, err
	}

	detail := CabinetPromotionDetail{
		CabinetPromotion: CabinetPromotion{
			Promotion:         promotion,
			ParticipantsCount: len(ranking),
		},
		PrizePlaces: places,
		Ranking:     ranking,
		Final:       final,
	}
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
