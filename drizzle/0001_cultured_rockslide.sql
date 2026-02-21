ALTER TABLE "outreach" ADD COLUMN "contacts" jsonb DEFAULT '[]'::jsonb NOT NULL;

--> statement-breakpoint

UPDATE "outreach"
SET "contacts" = jsonb_build_array(
    jsonb_build_object(
        'personName', "person_name",
        'personRole', "person_role",
        'contactMethod', "contact_method",
        'emailAddress', "email_address",
        'linkedinProfileUrl', "linkedin_profile_url",
        'messageType', "message_type",
        'messageSentAt', "message_sent_at",
        'followUpDueAt', "follow_up_due_at",
        'followUpSentAt', "follow_up_sent_at"
    )
)
WHERE "contacts" = '[]'::jsonb;