package controller

import (
	"errors"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const maxUsageReportRange = 366 * 24 * time.Hour

func parseUsageReportScope(c *gin.Context) (model.BillingUsageReportQuery, error) {
	now := time.Now()
	endTime, _ := strconv.ParseInt(c.Query("end_time"), 10, 64)
	startTime, _ := strconv.ParseInt(c.Query("start_time"), 10, 64)
	if endTime == 0 {
		endTime = now.Unix()
	}
	if startTime == 0 {
		startTime = now.AddDate(0, 0, -30).Unix()
	}
	if startTime > endTime {
		return model.BillingUsageReportQuery{}, errors.New("开始时间不能晚于结束时间")
	}
	if time.Duration(endTime-startTime)*time.Second > maxUsageReportRange {
		return model.BillingUsageReportQuery{}, errors.New("单次查询时间范围不能超过 366 天")
	}
	granularity := c.DefaultQuery("granularity", "day")
	if granularity != "day" && granularity != "week" && granularity != "month" {
		return model.BillingUsageReportQuery{}, errors.New("不支持的时间粒度")
	}
	pageInfo := common.GetPageQuery(c)
	userId, _ := strconv.Atoi(c.Query("user_id"))
	// 普通用户的查询范围始终由服务端覆盖，不能通过请求参数越权。
	if c.GetInt("role") < common.RoleAdminUser {
		userId = c.GetInt("id")
	}
	return model.BillingUsageReportQuery{
		StartTime: startTime, EndTime: endTime, Granularity: granularity,
		Provider: c.Query("provider"), ModelName: c.Query("model"), BillingSource: c.Query("billing_source"),
		UserId: userId, Page: pageInfo.Page, PageSize: pageInfo.PageSize, Location: time.Local,
	}, nil
}

func GetUsageReport(c *gin.Context) {
	query, err := parseUsageReportScope(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	result, err := model.GetBillingUsageReport(query)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, result)
}

func GetUsageReportFilters(c *gin.Context) {
	userId := 0
	if c.GetInt("role") < common.RoleAdminUser {
		userId = c.GetInt("id")
	}
	options, err := model.GetBillingUsageFilterOptions(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, options)
}
