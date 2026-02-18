-- Drop the unique constraint that prevents multiple declarations per month
ALTER TABLE public.compliance_declarations 
DROP CONSTRAINT compliance_declarations_volunteer_id_declaration_year_decla_key;

-- Add an index for performance (non-unique)
CREATE INDEX idx_compliance_declarations_volunteer_month 
ON public.compliance_declarations(volunteer_id, declaration_year, declaration_month);