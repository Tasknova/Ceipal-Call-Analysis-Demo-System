# Scheduled Embeddings Regeneration Setup

## What's Been Configured

✅ **Edge Function Created**: `supabase/functions/regenerate-embeddings/index.ts`
✅ **Cron Job Scheduled**: Runs daily at 7 PM (19:00)

## Deployment Steps

### 1. Deploy the Edge Function

First, install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Then deploy the function:
```bash
supabase login
supabase functions deploy regenerate-embeddings
```

### 2. Configure Environment Variables

Set the OpenAI API key for the Edge Function:
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 3. Configure Cron Settings (If Needed)

The cron job has been created and will automatically call the Edge Function daily at 7 PM.

To verify the cron job:
```sql
SELECT * FROM cron.job WHERE jobname = 'regenerate-embeddings-daily';
```

## How It Works

1. **Daily at 7 PM**, the cron job triggers
2. **Calls the Edge Function** via HTTP POST
3. **Function processes**:
   - All company brain records → regenerates company_info embeddings
   - All additional context → chunks and regenerates embeddings
   - All documents → regenerates metadata embeddings
4. **Logs results** to Supabase logs

## Monitoring

View logs in Supabase Dashboard:
1. Go to: **Edge Functions** → **regenerate-embeddings**
2. Click **Logs** tab
3. Filter by date/time to see daily runs

## Manual Trigger (Testing)

Test the function manually:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/regenerate-embeddings \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Cost Estimation

- **OpenAI API**: ~$0.0001 per 1K tokens
- **Daily run**: Depends on amount of data
- **Estimate**: ~$0.01 - $0.10 per day for typical usage

## Disable Scheduled Regeneration

If you want to stop the daily regeneration:
```sql
SELECT cron.unschedule('regenerate-embeddings-daily');
```

## Change Schedule

To change from 7 PM to a different time, unschedule and reschedule:
```sql
-- Unschedule old job
SELECT cron.unschedule('regenerate-embeddings-daily');

-- Schedule at 9 AM instead
SELECT cron.schedule(
  'regenerate-embeddings-daily',
  '0 9 * * *',  -- 9 AM
  $$
  SELECT
    net.http_post(
      url := 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/regenerate-embeddings',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## Cron Syntax

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `0 19 * * *` - Every day at 7 PM
- `0 9 * * 1` - Every Monday at 9 AM
- `0 0 * * *` - Every day at midnight
- `0 */6 * * *` - Every 6 hours
