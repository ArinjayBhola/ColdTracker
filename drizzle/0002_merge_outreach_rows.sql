-- 0002_merge_outreach_rows.sql

-- 1. Combine contacts for duplicate companies
WITH aggregated_contacts AS (
    SELECT 
        "userId",
        LOWER(TRIM("company_name")) as normalized_company,
        jsonb_agg(elem) as merged_contacts,
        MIN(id) as survivor_id
    FROM 
        "outreach",
        jsonb_array_elements("contacts") AS elem
    GROUP BY 
        "userId", 
        normalized_company
)
UPDATE "outreach" o
SET "contacts" = ac.merged_contacts
FROM aggregated_contacts ac
WHERE o.id = ac.survivor_id;

--> statement-breakpoint

-- 2. Delete the rows that were merged into the survivors
WITH survivors AS (
    SELECT 
        "userId",
        LOWER(TRIM("company_name")) as normalized_company,
        MIN(id) as survivor_id
    FROM 
        "outreach"
    GROUP BY 
        "userId", 
        normalized_company
)
DELETE FROM "outreach"
WHERE id NOT IN (SELECT survivor_id FROM survivors);
