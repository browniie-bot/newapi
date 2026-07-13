package model

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	BillingUsageEventCharge           = "charge"
	BillingUsageEventAdjustmentCharge = "adjustment_charge"
	BillingUsageEventRefund           = "refund"
	BillingUsageStatusConfirmed       = "confirmed"
)

// BillingUsageRecord 是面向报表的不可变计费流水，不替代现有使用日志。
type BillingUsageRecord struct {
	Id                int64  `json:"id"`
	IdempotencyKey    string `json:"idempotency_key" gorm:"type:varchar(191);uniqueIndex"`
	EventType         string `json:"event_type" gorm:"type:varchar(32);index"`
	Status            string `json:"status" gorm:"type:varchar(24);index"`
	RequestId         string `json:"request_id" gorm:"type:varchar(128);index"`
	TaskId            string `json:"task_id" gorm:"type:varchar(128);index"`
	UserId            int    `json:"user_id" gorm:"index:idx_billing_usage_user_time,priority:1"`
	Username          string `json:"username" gorm:"type:varchar(128);index"`
	ChannelId         int    `json:"channel_id" gorm:"index"`
	ChannelName       string `json:"channel_name" gorm:"type:varchar(191)"`
	Provider          string `json:"provider" gorm:"type:varchar(128);index"`
	ModelName         string `json:"model_name" gorm:"type:varchar(191);index"`
	UpstreamModelName string `json:"upstream_model_name" gorm:"type:varchar(191)"`
	PromptTokens      int64  `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens  int64  `json:"completion_tokens" gorm:"default:0"`
	CacheReadTokens   int64  `json:"cache_read_tokens" gorm:"default:0"`
	CacheWriteTokens  int64  `json:"cache_write_tokens" gorm:"default:0"`
	BillingSource     string `json:"billing_source" gorm:"type:varchar(24);index"`
	Quota             int64  `json:"quota" gorm:"default:0"`
	QuotaPerUnit      int64  `json:"quota_per_unit" gorm:"default:0"`
	UserCostMicroUSD  int64  `json:"user_cost_micro_usd" gorm:"default:0"`
	ConfirmedAt       int64  `json:"confirmed_at" gorm:"bigint;index:idx_billing_usage_user_time,priority:2;index"`
	CreatedAt         int64  `json:"created_at" gorm:"bigint"`
}

type BillingUsageRecordParams struct {
	IdempotencyKey    string
	EventType         string
	RequestId         string
	TaskId            string
	UserId            int
	Username          string
	ChannelId         int
	ModelName         string
	UpstreamModelName string
	PromptTokens      int64
	CompletionTokens  int64
	CacheReadTokens   int64
	CacheWriteTokens  int64
	BillingSource     string
	Quota             int64
	ConfirmedAt       int64
}

// CreateBillingUsageRecord 使用唯一幂等键写入已确认流水，重复调用不会重复计费。
func CreateBillingUsageRecord(params BillingUsageRecordParams) error {
	if strings.TrimSpace(params.IdempotencyKey) == "" || params.UserId <= 0 {
		return errors.New("invalid billing usage record identity")
	}
	if params.ConfirmedAt == 0 {
		params.ConfirmedAt = common.GetTimestamp()
	}
	if params.BillingSource == "" {
		params.BillingSource = "wallet"
	}

	channelName := ""
	provider := "Unknown"
	if params.ChannelId > 0 {
		if channel, err := GetChannelById(params.ChannelId, false); err == nil && channel != nil {
			channelName = channel.Name
			provider = constant.GetChannelTypeName(channel.Type)
		}
	}
	quotaPerUnit := int64(math.Round(common.QuotaPerUnit))
	if quotaPerUnit <= 0 {
		quotaPerUnit = 1
	}
	record := BillingUsageRecord{
		IdempotencyKey:    params.IdempotencyKey,
		EventType:         params.EventType,
		Status:            BillingUsageStatusConfirmed,
		RequestId:         params.RequestId,
		TaskId:            params.TaskId,
		UserId:            params.UserId,
		Username:          params.Username,
		ChannelId:         params.ChannelId,
		ChannelName:       channelName,
		Provider:          provider,
		ModelName:         params.ModelName,
		UpstreamModelName: params.UpstreamModelName,
		PromptTokens:      params.PromptTokens,
		CompletionTokens:  params.CompletionTokens,
		CacheReadTokens:   params.CacheReadTokens,
		CacheWriteTokens:  params.CacheWriteTokens,
		BillingSource:     params.BillingSource,
		Quota:             params.Quota,
		QuotaPerUnit:      quotaPerUnit,
		UserCostMicroUSD:  int64(math.Round(float64(params.Quota) / float64(quotaPerUnit) * 1_000_000)),
		ConfirmedAt:       params.ConfirmedAt,
		CreatedAt:         common.GetTimestamp(),
	}
	return DB.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "idempotency_key"}}, DoNothing: true}).Create(&record).Error
}

type BillingUsageReportQuery struct {
	StartTime     int64
	EndTime       int64
	Granularity   string
	Provider      string
	ModelName     string
	BillingSource string
	UserId        int
	Page          int
	PageSize      int
	Location      *time.Location
}

type BillingUsageReportSummary struct {
	PromptTokens         int64 `json:"prompt_tokens"`
	CompletionTokens     int64 `json:"completion_tokens"`
	CacheReadTokens      int64 `json:"cache_read_tokens"`
	CacheWriteTokens     int64 `json:"cache_write_tokens"`
	CacheTokens          int64 `json:"cache_tokens"`
	TotalTokens          int64 `json:"total_tokens"`
	WalletQuota          int64 `json:"wallet_quota"`
	SubscriptionQuota    int64 `json:"subscription_quota"`
	TotalQuota           int64 `json:"total_quota"`
	WalletMicroUSD       int64 `json:"wallet_micro_usd"`
	SubscriptionMicroUSD int64 `json:"subscription_micro_usd"`
	TotalMicroUSD        int64 `json:"total_micro_usd"`
}

type BillingUsageReportRow struct {
	Bucket               int64  `json:"bucket"`
	UserId               int    `json:"user_id"`
	Username             string `json:"username"`
	Provider             string `json:"provider"`
	ModelName            string `json:"model_name"`
	BillingSource        string `json:"billing_source"`
	PromptTokens         int64  `json:"prompt_tokens"`
	CompletionTokens     int64  `json:"completion_tokens"`
	CacheReadTokens      int64  `json:"cache_read_tokens"`
	CacheWriteTokens     int64  `json:"cache_write_tokens"`
	CacheTokens          int64  `json:"cache_tokens"`
	TotalTokens          int64  `json:"total_tokens"`
	Quota                int64  `json:"quota"`
	UserCostMicroUSD     int64  `json:"user_cost_micro_usd"`
	SupplierCostMicroUSD *int64 `json:"supplier_cost_micro_usd"`
}

type BillingUsageTrendPoint struct {
	Bucket           int64 `json:"bucket"`
	PromptTokens     int64 `json:"prompt_tokens"`
	CompletionTokens int64 `json:"completion_tokens"`
	CacheTokens      int64 `json:"cache_tokens"`
	TotalTokens      int64 `json:"total_tokens"`
	Quota            int64 `json:"quota"`
	UserCostMicroUSD int64 `json:"user_cost_micro_usd"`
}

type BillingUsageReportResult struct {
	Summary         BillingUsageReportSummary `json:"summary"`
	Trend           []BillingUsageTrendPoint  `json:"trend"`
	Items           []BillingUsageReportRow   `json:"items"`
	Total           int                       `json:"total"`
	Page            int                       `json:"page"`
	PageSize        int                       `json:"page_size"`
	LastConfirmedAt int64                     `json:"last_confirmed_at"`
	PendingCount    int64                     `json:"pending_count"`
}

type billingUsageDailyAggregate struct {
	DayBucket        int64
	UserId           int
	Username         string
	Provider         string
	ModelName        string
	BillingSource    string
	PromptTokens     int64
	CompletionTokens int64
	CacheReadTokens  int64
	CacheWriteTokens int64
	Quota            int64
	UserCostMicroUSD int64
}

func billingUsageBucket(dayBucket int64, offset int, granularity string, location *time.Location) int64 {
	dayStart := time.Unix(dayBucket*86400-int64(offset), 0).In(location)
	switch granularity {
	case "week":
		weekday := (int(dayStart.Weekday()) + 6) % 7
		return dayStart.AddDate(0, 0, -weekday).Unix()
	case "month":
		return time.Date(dayStart.Year(), dayStart.Month(), 1, 0, 0, 0, 0, location).Unix()
	default:
		return time.Date(dayStart.Year(), dayStart.Month(), dayStart.Day(), 0, 0, 0, 0, location).Unix()
	}
}

// GetBillingUsageReport 先按日下推聚合，再在 Go 中合并周/月，避免依赖数据库方言日期函数。
func GetBillingUsageReport(query BillingUsageReportQuery) (BillingUsageReportResult, error) {
	result := BillingUsageReportResult{Page: query.Page, PageSize: query.PageSize, Items: []BillingUsageReportRow{}, Trend: []BillingUsageTrendPoint{}}
	if query.Location == nil {
		query.Location = time.Local
	}
	_, offset := time.Unix(query.StartTime, 0).In(query.Location).Zone()
	tx := DB.Model(&BillingUsageRecord{}).Where("status = ? AND confirmed_at >= ? AND confirmed_at <= ?", BillingUsageStatusConfirmed, query.StartTime, query.EndTime)
	if query.UserId > 0 {
		tx = tx.Where("user_id = ?", query.UserId)
	}
	if query.Provider != "" {
		tx = tx.Where("provider = ?", query.Provider)
	}
	if query.ModelName != "" {
		tx = tx.Where("model_name = ?", query.ModelName)
	}
	if query.BillingSource != "" {
		tx = tx.Where("billing_source = ?", query.BillingSource)
	}

	var daily []billingUsageDailyAggregate
	selectSQL := "FLOOR((confirmed_at + ?) / 86400) AS day_bucket, user_id, username, provider, model_name, billing_source, " +
		"COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens, " +
		"COALESCE(SUM(cache_read_tokens), 0) AS cache_read_tokens, COALESCE(SUM(cache_write_tokens), 0) AS cache_write_tokens, " +
		"COALESCE(SUM(quota), 0) AS quota, COALESCE(SUM(user_cost_micro_usd), 0) AS user_cost_micro_usd"
	if err := tx.Select(selectSQL, offset).
		Group("day_bucket, user_id, username, provider, model_name, billing_source").
		Scan(&daily).Error; err != nil {
		return result, err
	}

	rows := make(map[string]*BillingUsageReportRow)
	trend := make(map[int64]*BillingUsageTrendPoint)
	for _, item := range daily {
		bucket := billingUsageBucket(item.DayBucket, offset, query.Granularity, query.Location)
		key := fmt.Sprintf("%d|%d|%s|%s|%s", bucket, item.UserId, item.Provider, item.ModelName, item.BillingSource)
		row := rows[key]
		if row == nil {
			row = &BillingUsageReportRow{Bucket: bucket, UserId: item.UserId, Username: item.Username, Provider: item.Provider, ModelName: item.ModelName, BillingSource: item.BillingSource}
			rows[key] = row
		}
		row.PromptTokens += item.PromptTokens
		row.CompletionTokens += item.CompletionTokens
		row.CacheReadTokens += item.CacheReadTokens
		row.CacheWriteTokens += item.CacheWriteTokens
		row.CacheTokens = row.CacheReadTokens + row.CacheWriteTokens
		row.TotalTokens = row.PromptTokens + row.CompletionTokens
		row.Quota += item.Quota
		row.UserCostMicroUSD += item.UserCostMicroUSD

		point := trend[bucket]
		if point == nil {
			point = &BillingUsageTrendPoint{Bucket: bucket}
			trend[bucket] = point
		}
		point.PromptTokens += item.PromptTokens
		point.CompletionTokens += item.CompletionTokens
		point.CacheTokens += item.CacheReadTokens + item.CacheWriteTokens
		point.TotalTokens += item.PromptTokens + item.CompletionTokens
		point.Quota += item.Quota
		point.UserCostMicroUSD += item.UserCostMicroUSD

		result.Summary.PromptTokens += item.PromptTokens
		result.Summary.CompletionTokens += item.CompletionTokens
		result.Summary.CacheReadTokens += item.CacheReadTokens
		result.Summary.CacheWriteTokens += item.CacheWriteTokens
		result.Summary.TotalQuota += item.Quota
		result.Summary.TotalMicroUSD += item.UserCostMicroUSD
		if item.BillingSource == "subscription" {
			result.Summary.SubscriptionQuota += item.Quota
			result.Summary.SubscriptionMicroUSD += item.UserCostMicroUSD
		} else {
			result.Summary.WalletQuota += item.Quota
			result.Summary.WalletMicroUSD += item.UserCostMicroUSD
		}
	}
	result.Summary.CacheTokens = result.Summary.CacheReadTokens + result.Summary.CacheWriteTokens
	result.Summary.TotalTokens = result.Summary.PromptTokens + result.Summary.CompletionTokens

	allRows := make([]BillingUsageReportRow, 0, len(rows))
	for _, row := range rows {
		allRows = append(allRows, *row)
	}
	sort.Slice(allRows, func(i, j int) bool {
		if allRows[i].Bucket != allRows[j].Bucket {
			return allRows[i].Bucket > allRows[j].Bucket
		}
		return allRows[i].UserCostMicroUSD > allRows[j].UserCostMicroUSD
	})
	result.Total = len(allRows)
	start := (query.Page - 1) * query.PageSize
	if start < len(allRows) {
		end := start + query.PageSize
		if end > len(allRows) {
			end = len(allRows)
		}
		result.Items = allRows[start:end]
	}
	for _, point := range trend {
		result.Trend = append(result.Trend, *point)
	}
	sort.Slice(result.Trend, func(i, j int) bool { return result.Trend[i].Bucket < result.Trend[j].Bucket })

	freshness := DB.Model(&BillingUsageRecord{}).Where("status = ?", BillingUsageStatusConfirmed)
	if query.UserId > 0 {
		freshness = freshness.Where("user_id = ?", query.UserId)
	}
	_ = freshness.Select("COALESCE(MAX(confirmed_at), 0)").Scan(&result.LastConfirmedAt).Error
	pending := DB.Model(&BillingUsageRecord{}).Where("status <> ?", BillingUsageStatusConfirmed)
	if query.UserId > 0 {
		pending = pending.Where("user_id = ?", query.UserId)
	}
	_ = pending.Count(&result.PendingCount).Error
	return result, nil
}

type BillingUsageFilterOptions struct {
	Providers []string `json:"providers"`
	Models    []string `json:"models"`
	Users     []struct {
		Id       int    `json:"id"`
		Username string `json:"username"`
	} `json:"users"`
}

func GetBillingUsageFilterOptions(userId int) (BillingUsageFilterOptions, error) {
	options := BillingUsageFilterOptions{Providers: []string{}, Models: []string{}}
	tx := DB.Model(&BillingUsageRecord{}).Where("status = ?", BillingUsageStatusConfirmed)
	if userId > 0 {
		tx = tx.Where("user_id = ?", userId)
	}
	if err := tx.Distinct("provider").Where("provider <> ''").Order("provider").Pluck("provider", &options.Providers).Error; err != nil {
		return options, err
	}
	tx = DB.Model(&BillingUsageRecord{}).Where("status = ?", BillingUsageStatusConfirmed)
	if userId > 0 {
		tx = tx.Where("user_id = ?", userId)
	}
	if err := tx.Distinct("model_name").Where("model_name <> ''").Order("model_name").Pluck("model_name", &options.Models).Error; err != nil {
		return options, err
	}
	if userId == 0 {
		if err := DB.Model(&BillingUsageRecord{}).Select("user_id AS id, username").Where("status = ?", BillingUsageStatusConfirmed).Group("user_id, username").Order("username").Scan(&options.Users).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return options, err
		}
	}
	return options, nil
}
