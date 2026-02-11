-- Add template_data column to store block structure for reuse
ALTER TABLE public.contract_templates
ADD COLUMN template_data jsonb DEFAULT NULL;

COMMENT ON COLUMN public.contract_templates.template_data IS 'JSON block structure from the contract builder, allows reloading and editing templates';