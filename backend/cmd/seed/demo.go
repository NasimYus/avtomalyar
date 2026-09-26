package main

import (
	"context"
	"fmt"
	"time"

	"github.com/avtomalyar/backend/internal/domain"
	"github.com/avtomalyar/backend/internal/repository"
	"github.com/avtomalyar/backend/internal/repository/db"
	"github.com/avtomalyar/backend/internal/service"
)

type demoCity struct{ ru, tg string }

type demoGrade struct {
	ru, tg string
	// Threshold in somoni; converted to dirams on insert.
	thresholdSomoni int64
}

type demoPrize struct {
	ru, tg, description string
	stock               int32
}

type demoDealer struct {
	name  string
	phone string
	city  string
	// How many purchases to generate and their rough size in somoni.
	purchases  int
	baseSomoni int64
}

const diramsPerSomoni = 100

var (
	demoCities = []demoCity{
		{"Душанбе", "Душанбе"},
		{"Худжанд", "Хуҷанд"},
		{"Бохтар", "Бохтар"},
		{"Куляб", "Кӯлоб"},
		{"Истаравшан", "Истаравшан"},
		{"Турсунзаде", "Турсунзода"},
	}

	demoGrades = []demoGrade{
		{"Бронза", "Биринҷӣ", 0},
		{"Серебро", "Нуқра", 1_000_000},
		{"Золото", "Тилло", 2_500_000},
	}

	demoPrizes = []demoPrize{
		{"Компрессор 100 л", "Компрессори 100 л", "Масляный, 2,2 кВт", 3},
		{"Краскопульт HVLP", "Краскопулти HVLP", "Сопло 1,3 мм", 5},
		{"Полировальный набор", "Маҷмӯи сайқалдиҳӣ", "Машинка + пасты", 4},
		{"Набор шлифмашин", "Маҷмӯи мошинҳои сӯниш", "Эксцентриковые, 2 шт.", 2},
		{"Автомобиль", "Автомобил", "Главный приз года", 1},
	}

	demoDealers = []demoDealer{
		{"ООО «Рангсоз»", "+992 92 555 01 10", "Худжанд", 9, 180_000},
		{"ООО «КрасТех»", "+992 93 210 44 07", "Душанбе", 8, 140_000},
		{"ИП Рахимов А.", "+992 91 700 32 18", "Бохтар", 7, 130_000},
		{"ООО «Кулоб-Пейнт»", "+992 90 118 90 02", "Куляб", 5, 60_000},
		{"ООО «Истаравшан-Авто»", "+992 92 404 77 61", "Истаравшан", 8, 150_000},
		{"ООО «АвтоКолор»", "+992 93 887 12 30", "Душанбе", 9, 170_000},
		{"ИП Назарова С.", "+992 91 225 46 09", "Душанбе", 4, 45_000},
		{"ООО «Турсунзода-Авто»", "+992 92 601 78 44", "Турсунзаде", 3, 30_000},
		{"ИП Каримов Б.", "+992 90 334 55 21", "Худжанд", 6, 70_000},
		{"ООО «Сомон-Лак»", "+992 93 449 23 87", "Бохтар", 5, 55_000},
		{"ИП Шарипов Д.", "+992 91 512 66 74", "Куляб", 4, 38_000},
		{"ООО «Пайванд-Авто»", "+992 92 733 90 15", "Душанбе", 6, 90_000},
	}
)

// purchaseAmount produces varied but reproducible amounts, so repeated
// demo seeds look the same.
func purchaseAmount(base int64, index int) int64 {
	variation := int64((index*37)%25) * 2_000
	return (base + variation) * diramsPerSomoni
}

// purchaseDate spreads purchases backwards from today, roughly two per
// month.
func purchaseDate(index int) time.Time {
	return domain.Today().AddDate(0, 0, -index*17)
}

func seedDemo(ctx context.Context, repo *repository.Repository) error {
	admins, err := repo.CountAdmins(ctx)
	if err != nil {
		return fmt.Errorf("count admins: %w", err)
	}
	if admins == 0 {
		return fmt.Errorf("no admin exists yet — run `make seed-admin` first")
	}

	dealers, err := repo.CountDealers(ctx, db.CountDealersParams{})
	if err != nil {
		return fmt.Errorf("count dealers: %w", err)
	}
	if dealers > 0 {
		fmt.Println("demo data already present (dealers exist), skipping")
		return nil
	}

	admin, err := repo.GetAdminByLogin(ctx, envOrDefault("ADMIN_LOGIN", "admin"))
	if err != nil {
		return fmt.Errorf("load admin: %w", err)
	}

	cityService := service.NewCityService(repo)
	gradeService := service.NewGradeService(repo)
	prizeService := service.NewPrizeService(repo, nil)
	dealerService := service.NewDealerService(repo)
	purchaseService := service.NewPurchaseService(repo)

	cityIDs := make(map[string]int64, len(demoCities))
	for _, city := range demoCities {
		created, err := cityService.Create(ctx, city.ru, city.tg)
		if err != nil {
			return fmt.Errorf("create city %q: %w", city.ru, err)
		}
		cityIDs[city.ru] = created.ID
	}
	fmt.Printf("cities:   %d\n", len(demoCities))

	for _, grade := range demoGrades {
		if _, err := gradeService.Create(ctx, grade.ru, grade.tg, grade.thresholdSomoni*diramsPerSomoni); err != nil {
			return fmt.Errorf("create grade %q: %w", grade.ru, err)
		}
	}
	fmt.Printf("grades:   %d\n", len(demoGrades))

	prizeIDs := make([]int64, 0, len(demoPrizes))
	for _, prize := range demoPrizes {
		description := prize.description
		stock := prize.stock
		created, err := prizeService.Create(ctx, service.PrizeFields{
			NameRu:        prize.ru,
			NameTg:        prize.tg,
			DescriptionRu: &description,
			StockQuantity: &stock,
		})
		if err != nil {
			return fmt.Errorf("create prize %q: %w", prize.ru, err)
		}
		prizeIDs = append(prizeIDs, created.ID)
	}
	fmt.Printf("prizes:   %d\n", len(demoPrizes))

	credentials := make([]string, 0, len(demoDealers))
	purchaseCount := 0

	for _, dealer := range demoDealers {
		cityID, ok := cityIDs[dealer.city]
		if !ok {
			return fmt.Errorf("unknown demo city %q", dealer.city)
		}

		created, err := dealerService.Create(ctx, dealer.name, dealer.phone, cityID)
		if err != nil {
			return fmt.Errorf("create dealer %q: %w", dealer.name, err)
		}
		credentials = append(credentials,
			fmt.Sprintf("  %-26s %-24s %s", dealer.name, created.Dealer.Login, created.Password))

		for i := range dealer.purchases {
			if _, err := purchaseService.Create(
				ctx,
				created.Dealer.ID,
				purchaseAmount(dealer.baseSomoni, i),
				purchaseDate(i),
				nil,
				admin.ID,
			); err != nil {
				return fmt.Errorf("create purchase for %q: %w", dealer.name, err)
			}
			purchaseCount++
		}
	}

	if err := seedDemoPromotions(ctx, service.NewPromotionService(repo), gradeService, prizeIDs); err != nil {
		return err
	}

	fmt.Printf("dealers:  %d\n", len(demoDealers))
	fmt.Printf("purchases: %d\n", purchaseCount)
	fmt.Println()
	fmt.Println("dealer logins (demo passwords, shown once):")
	for _, line := range credentials {
		fmt.Println(line)
	}

	return nil
}

// seedDemoPromotions creates one promotion per interesting state, so the
// admin panel has something to show in every tab: a finished one with
// published results, one running now, and one still being set up.
func seedDemoPromotions(
	ctx context.Context,
	promotions *service.PromotionService,
	grades *service.GradeService,
	prizeIDs []int64,
) error {
	if len(prizeIDs) < len(demoPrizes) {
		return fmt.Errorf("expected %d demo prizes, got %d", len(demoPrizes), len(prizeIDs))
	}
	today := domain.Today()

	finished, err := promotions.Create(ctx, service.PromotionInput{
		TitleRu:       "Летняя гонка",
		TitleTg:       "Пойгаи тобистона",
		DescriptionRu: ptr("Кто больше закупил за лето — тот и на пьедестале."),
		DescriptionTg: ptr("Ҳар кӣ дар тобистон бештар харид — дар пойгоҳ аст."),
		StartDate:     today.AddDate(0, 0, -120),
		EndDate:       today.AddDate(0, 0, -30),
	})
	if err != nil {
		return fmt.Errorf("create finished promotion: %w", err)
	}
	if err := promotions.SetPrizePlaces(ctx, finished.ID, []service.PrizePlaceInput{
		{PlaceRank: 1, PrizeID: prizeIDs[0]},
		{PlaceRank: 2, PrizeID: prizeIDs[1]},
		{PlaceRank: 3, PrizeID: prizeIDs[2]},
	}); err != nil {
		return fmt.Errorf("set prize places: %w", err)
	}
	if _, err := promotions.Start(ctx, finished.ID); err != nil {
		return fmt.Errorf("start finished promotion: %w", err)
	}
	if _, err := promotions.Calculate(ctx, finished.ID); err != nil {
		return fmt.Errorf("calculate finished promotion: %w", err)
	}
	if _, err := promotions.Publish(ctx, finished.ID); err != nil {
		return fmt.Errorf("publish finished promotion: %w", err)
	}

	running, err := promotions.Create(ctx, service.PromotionInput{
		TitleRu:       "Осенний рывок",
		TitleTg:       "Ҳамлаи тирамоҳӣ",
		DescriptionRu: ptr("Идёт прямо сейчас — итоги подведём после окончания."),
		StartDate:     today.AddDate(0, 0, -15),
		EndDate:       today.AddDate(0, 0, 45),
	})
	if err != nil {
		return fmt.Errorf("create running promotion: %w", err)
	}
	if err := promotions.SetPrizePlaces(ctx, running.ID, []service.PrizePlaceInput{
		{PlaceRank: 1, PrizeID: prizeIDs[3]},
		{PlaceRank: 2, PrizeID: prizeIDs[1]},
	}); err != nil {
		return fmt.Errorf("set prize places: %w", err)
	}
	if _, err := promotions.Start(ctx, running.ID); err != nil {
		return fmt.Errorf("start running promotion: %w", err)
	}

	// Still a draft: the car is the promotion the whole programme is built
	// around, so it shows the threshold condition in the form.
	threshold := int64(3_000_000 * diramsPerSomoni)
	if _, err := promotions.Create(ctx, service.PromotionInput{
		TitleRu:              "Главный приз года",
		TitleTg:              "Ҷоизаи асосии сол",
		DescriptionRu:        ptr("Для дилеров, закупивших от 3 000 000 сомони за всё время."),
		StartDate:            today.AddDate(0, 0, 10),
		EndDate:              today.AddDate(0, 0, 190),
		MinLifetimeThreshold: &threshold,
	}); err != nil {
		return fmt.Errorf("create draft promotion: %w", err)
	}

	// Starts later: this is what the cabinet's "ahead" block shows to
	// every dealer, whether or not they meet any conditions.
	upcoming, err := promotions.Create(ctx, service.PromotionInput{
		TitleRu:       "Зимний марафон",
		TitleTg:       "Марафони зимистона",
		DescriptionRu: ptr("Стартует через две недели — готовьтесь."),
		DescriptionTg: ptr("Пас аз ду ҳафта оғоз мешавад — омода шавед."),
		StartDate:     today.AddDate(0, 0, 14),
		EndDate:       today.AddDate(0, 0, 105),
	})
	if err != nil {
		return fmt.Errorf("create upcoming promotion: %w", err)
	}
	if err := promotions.SetPrizePlaces(ctx, upcoming.ID, []service.PrizePlaceInput{
		{PlaceRank: 1, PrizeID: prizeIDs[2]},
		{PlaceRank: 2, PrizeID: prizeIDs[1]},
	}); err != nil {
		return fmt.Errorf("set prize places: %w", err)
	}
	if _, err := promotions.Start(ctx, upcoming.ID); err != nil {
		return fmt.Errorf("start upcoming promotion: %w", err)
	}

	// Running, but only the top grade takes part — the cabinet shows this
	// one to everyone else as a condition they have yet to meet.
	ladder, err := grades.List(ctx)
	if err != nil {
		return fmt.Errorf("list grades: %w", err)
	}
	// List orders grades by threshold, so the last one is the top.
	topGrade := ladder[len(ladder)-1].ID
	club, err := promotions.Create(ctx, service.PromotionInput{
		TitleRu:       "Клуб золотых дилеров",
		TitleTg:       "Клуби дилерони тиллоӣ",
		DescriptionRu: ptr("Только для дилеров высшего уровня."),
		DescriptionTg: ptr("Танҳо барои дилерони сатҳи болоӣ."),
		StartDate:     today.AddDate(0, 0, -20),
		EndDate:       today.AddDate(0, 0, 70),
		GradeID:       &topGrade,
	})
	if err != nil {
		return fmt.Errorf("create club promotion: %w", err)
	}
	if err := promotions.SetPrizePlaces(ctx, club.ID, []service.PrizePlaceInput{
		{PlaceRank: 1, PrizeID: prizeIDs[4]},
	}); err != nil {
		return fmt.Errorf("set prize places: %w", err)
	}
	if _, err := promotions.Start(ctx, club.ID); err != nil {
		return fmt.Errorf("start club promotion: %w", err)
	}

	fmt.Println("promotions: 5 (published, running, upcoming, grade-only, draft)")
	return nil
}

func ptr(s string) *string { return &s }
