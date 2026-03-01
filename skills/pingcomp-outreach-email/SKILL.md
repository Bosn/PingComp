# PingComp Outreach Email Skill

## Purpose
标准化 PingComp 中“营销邮件发送测试 / 记录 / 复盘优化”流程，降低手工误操作，支持后续 A/B 迭代。

---

## Scope
适用于：
1. 指定 Lead 的单封测试邮件发送（当前系统层面：写入 `outreach_email_sends` 发送记录）
2. 批量营销发送前的文案和参数校验
3. 发送后效果复盘（主题、发送人、时间窗、内容版本）

> 注意：当前 PingComp 后端 `POST /api/outreach/email-sends` 记录的是“已发送事实”，并不直接调用 SMTP/ESP 真发。
> 若需真实外发，请在此 Skill 基础上接入邮件服务商（SES/SendGrid/Resend 等）。

---

## Inputs
- `leadId`（必填）
- `leadName`（可选，用于人工确认）
- `targetEmail`（可选；默认取 lead.emails 第一个）
- `subject`（必填）
- `content`（必填）
- `sender`（建议必填，如 `campaign-2026q1-test`）

---

## Safety Checklist（发送前）
1. Lead 存在且 `id/name` 匹配
2. 邮箱地址非空且格式合法
3. 主题非空，长度 <= 255
4. 内容非空（建议 >= 80 字符）
5. sender 标识清晰（用于归因）
6. 若是外部真实发送：再次人工确认（高风险外发）

---

## Standard Flow

### Step 1) 读取 Lead 并确认目标邮箱
SQL（示例）
```sql
SELECT id, name, emails
FROM ai_customers
WHERE id = ?;
```

邮箱选择规则：
- 优先 `targetEmail`（如果输入）
- 否则取 `emails` 字段逗号分隔后的第一个

### Step 2) 准备主题与正文
建议包含：
- 利益点（3~4 条）
- 明确 CTA（如“回复我获取 3 分钟 quickstart”）
- 可追踪版本号（例如文末 `Variant: A1`）

### Step 3) 记录发送事件
通过 API 或 SQL 都可：

API:
```http
POST /api/outreach/email-sends
Content-Type: application/json

{
  "leadId": 3188560,
  "email": "example@company.com",
  "subject": "...",
  "content": "...",
  "sender": "campaign-2026q1-test"
}
```

SQL:
```sql
INSERT INTO outreach_email_sends (lead_id, email, subject, content, sender)
VALUES (?, ?, ?, ?, ?);
```

### Step 4) 回查并留证
```sql
SELECT id, lead_id, email, subject, sender, sent_at
FROM outreach_email_sends
WHERE lead_id = ? AND email = ?
ORDER BY id DESC
LIMIT 1;
```

输出建议：
- Lead 信息
- 目标邮箱
- 发送记录 ID
- sent_at（UTC）
- 文案版本

---

## Optimization Loop（营销优化）

### 1) A/B 主题测试模板
- A：强调“0 成本 + 速度”
- B：强调“业务场景 + 收益”

示例：
- A: `Try TiDB Cloud Zero: Launch a Free MySQL-Compatible Database in Seconds`
- B: `Cut Prototype Setup Time by 80% with TiDB Cloud Zero`

### 2) 正文结构
1. 个性化开场（姓名/公司）
2. 1 句话场景痛点
3. 3~4 条价值点（短句）
4. 单一 CTA
5. 签名 + 版本号

### 3) 数据复盘维度（当前可先做手工）
- 按 subject 聚合发送量
- 按 sender 统计活动批次
- 按时间窗口观察发送节奏

后续建议新增字段：
- `variant`（A/B）
- `campaign_id`
- `opened_at`
- `clicked_at`
- `replied_at`

---

## Reusable Prompt (for agent)
```text
请对 leadId={ID} 执行一次营销邮件测试发送记录：
1) 校验 lead 存在并确认邮箱；
2) 生成 TiDB Cloud Zero 宣传邮件（主题+正文）；
3) 写入 outreach_email_sends；
4) 返回发送记录 ID、时间、邮箱、主题；
5) 给出下一轮 A/B 优化建议。
```

---

## Evidence Example（2026-03-01）
- lead_id: `3188560`
- lead_name: `Bosn Test`
- email: `shengbo.ma@pingcap.com`
- subject: `Try TiDB Cloud Zero: Launch a Free MySQL-Compatible Database in Seconds`
- sender: `klaus-test-runner`
- recorded_send_id: `1`
- sent_at_utc: `2026-03-01T09:34:17.000Z`
