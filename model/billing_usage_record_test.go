package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/require"
)

func TestBillingUsageRecordIsIdempotentAndReportsNetCost(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.Create(&Channel{Id: 91, Name: "primary", Type: constant.ChannelTypeOpenAI, Key: "test"}).Error)

	originalQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500_000
	t.Cleanup(func() { common.QuotaPerUnit = originalQuotaPerUnit })

	charge := BillingUsageRecordParams{
		IdempotencyKey:   "request:req-1:charge",
		EventType:        BillingUsageEventCharge,
		RequestId:        "req-1",
		UserId:           7,
		Username:         "alice",
		ChannelId:        91,
		ModelName:        "gpt-test",
		PromptTokens:     100,
		CompletionTokens: 50,
		BillingSource:    "wallet",
		Quota:            1_000,
		ConfirmedAt:      1_700_000_000,
	}
	require.NoError(t, CreateBillingUsageRecord(charge))
	require.NoError(t, CreateBillingUsageRecord(charge))
	require.NoError(t, CreateBillingUsageRecord(BillingUsageRecordParams{
		IdempotencyKey: "request:req-1:refund",
		EventType:      BillingUsageEventRefund,
		RequestId:      "req-1",
		UserId:         7,
		Username:       "alice",
		ChannelId:      91,
		ModelName:      "gpt-test",
		BillingSource:  "wallet",
		Quota:          -200,
		ConfirmedAt:    1_700_000_100,
	}))

	var count int64
	require.NoError(t, DB.Model(&BillingUsageRecord{}).Count(&count).Error)
	require.Equal(t, int64(2), count)

	report, err := GetBillingUsageReport(BillingUsageReportQuery{
		StartTime:   1_699_999_000,
		EndTime:     1_700_001_000,
		Granularity: "day",
		UserId:      7,
		Page:        1,
		PageSize:    20,
		Location:    time.UTC,
	})
	require.NoError(t, err)
	require.Equal(t, int64(800), report.Summary.TotalQuota)
	require.Equal(t, int64(150), report.Summary.TotalTokens)
	require.Len(t, report.Items, 1)
	require.Equal(t, "OpenAI", report.Items[0].Provider)
	require.Equal(t, int64(800), report.Items[0].Quota)
}
